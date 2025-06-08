import {Creator, Creators, Entity, entityUrl, fetchWorks, IPBaseNumber, trackName, WorkBean} from '#acum.ts';
import {linkArtists} from '#artists.ts';
import {addArrangerRelationship, addWriterRelationship} from '#relationships.ts';
import {AddWarning} from '#ui/warnings.tsx';
import {workEditDataEqual} from '#work-edit-data.ts';
import {WorkStateWithEditDataT} from '#work-state.ts';
import {addWork, linkWriters} from '#works.ts';
import {head} from '@repo/common/head';
import {compareInsensitive} from '@repo/musicbrainz-ext/compare';
import {addEditNote} from '@repo/musicbrainz-ext/edit-note';
import {trackRecordingState} from '@repo/musicbrainz-ext/track-recording-state';
import {
  connect,
  count,
  endWith,
  filter,
  from,
  ignoreElements,
  iif,
  lastValueFrom,
  map,
  merge,
  mergeMap,
  of,
  pipe,
  repeat,
  scan,
  tap,
  toArray,
  zipWith,
} from 'rxjs';
import {Setter} from 'solid-js';
import {isReleaseRelationshipEditor} from 'typedbrainz';
import {
  ArtistT,
  MediumRecordingStateT,
  MediumRecordingStateTreeT,
  MediumWithRecordingsT,
  RecordingT,
  ReleaseRelationshipEditorStateT,
} from 'typedbrainz/types';

type SelectedMediums = Set<[MediumWithRecordingsT, MediumRecordingStateTreeT]>;
type SelectedRecording = {
  readonly position: number;
  readonly index: number | undefined;
  readonly workBean: WorkBean;
  readonly recordingState: MediumRecordingStateT;
};
type SelectedRecordings = ReadonlyArray<SelectedRecording>;
// map of promises so that we don't fetch the same artist multiple times
type ArtistCache = Map<IPBaseNumber, Promise<ArtistT | null>>;
type SetProgress = Setter<readonly [number, string]>;

export async function importAlbum(entity: Entity, addWarning: AddWarning, setProgress: SetProgress): Promise<boolean> {
  setProgress([0, 'Loading album info']);

  const noSelection =
    ((MB?.relationshipEditor.state as ReleaseRelationshipEditorStateT).selectedRecordings?.size ?? 0) === 0;
  const mediums = selectedMediums(entity, noSelection, addWarning);
  const recordings = await selectedRecordings(entity, noSelection, mediums);

  return await importSelectedWorks(entity, recordings, addWarning, setProgress);
}

async function importSelectedWorks(
  entity: Entity,
  selectedRecordings: SelectedRecordings,
  addWarning: AddWarning,
  setProgress: SetProgress
) {
  const addTrackWarning = (position: number) => (warning: string) => addWarning(`Track ${position}: ${warning}`);

  const artistCache: ArtistCache = new Map();

  return await lastValueFrom(
    iif(
      () => selectedRecordings.length > 0,
      from(selectedRecordings).pipe(
        map(selectedRecording => [selectedRecording, addTrackWarning(selectedRecording.position)] as const),
        tap(([{workBean, recordingState}, addWarning]) => {
          const recording = recordingState.recording;
          if (trackName(workBean) != recording.name) {
            if (compareInsensitive(trackName(workBean), recording.name) === 0) {
              workBean.workEngName = workBean.workHebName = recording.name;
            } else {
              addWarning(`Work name of ${recording.name} is different from recording name, please verify`);
            }
          }
        }),
        mergeMap(
          async ([selectedRecording, addWarning]) =>
            [
              selectedRecording.workBean,
              selectedRecording.recordingState.recording,
              await addWork(
                selectedRecording.position,
                selectedRecording.index,
                selectedRecording.workBean,
                selectedRecording.recordingState,
                addWarning
              ),
              addWarning,
            ] as const
        ),
        mergeMap(args => linkCreators(artistCache, ...args)),
        connect(shared =>
          merge(
            shared.pipe(maybeSetEditNote(entity, addWarning)),
            shared.pipe(updateProgress(selectedRecordings, setProgress), ignoreElements())
          )
        )
      ),
      from(selectedRecordings).pipe(updateProgress(selectedRecordings, setProgress), ignoreElements(), endWith(false))
    )
  );
}

function updateProgress(selectedRecordings: SelectedRecordings, setProgress: SetProgress) {
  return pipe(
    scan(accumulator => accumulator + 1, 0),
    map(count => [count / selectedRecordings.length, `Loaded ${count}/${selectedRecordings.length} works`] as const),
    endWith([1, 'Done'] as const),
    tap(setProgress)
  );
}

function maybeSetEditNote(entity: Entity, addWarning: AddWarning) {
  return pipe(
    count((workState: WorkStateWithEditDataT) => !workEditDataEqual(workState.editData, workState.originalEditData)),
    map(editedCount => editedCount > 0),
    tap(hasEdits => {
      if (hasEdits) {
        addEditNote(`Imported from ${entityUrl(entity)}`);
      } else {
        addWarning('All works are up to date');
      }
    })
  );
}

async function linkCreators(
  artistCache: ArtistCache,
  workBean: WorkBean,
  recording: RecordingT,
  workState: WorkStateWithEditDataT,
  addWarning: AddWarning
): Promise<WorkStateWithEditDataT> {
  const work = workState.work;
  await linkWriters(
    artistCache,
    workBean,
    (artist: ArtistT, linkTypeId: number) => addWriterRelationship(work, artist, linkTypeId),
    addWarning
  );
  await linkArrangers(artistCache, recording, workBean.arrangers, workBean.creators, addWarning);
  return workState;
}

async function linkArrangers(
  artistCache: ArtistCache,
  recording: RecordingT,
  arrangers: ReadonlyArray<Creator> | undefined,
  creators: Creators | undefined,
  addWarning: AddWarning
) {
  await linkArtists(
    artistCache,
    arrangers,
    creators,
    (artist: ArtistT) => addArrangerRelationship(recording, artist),
    addWarning
  );
}

async function selectedRecordings(
  entity: Entity,
  noSelection: boolean,
  selectedMediums: SelectedMediums = new Set()
): Promise<SelectedRecordings> {
  const workBeans = await fetchWorks(entity);

  const mediumTracks = (medium: MediumWithRecordingsT) =>
    (MB?.relationshipEditor.state as ReleaseRelationshipEditorStateT).loadedTracks.get(medium.position) ||
    medium.tracks ||
    [];

  return await lastValueFrom(
    of(head(selectedMediums.values())).pipe(
      filter(
        (mediumAndRecordings): mediumAndRecordings is [MediumWithRecordingsT, MediumRecordingStateTreeT] =>
          mediumAndRecordings != null
      ),
      mergeMap(([medium, recordingStateTree]) =>
        mediumTracks(medium).map(track => [track.position, trackRecordingState(track, recordingStateTree)] as const)
      ),
      zipWith(iif(() => entity.entityType != 'Album', from(workBeans).pipe(repeat()), from(workBeans))),
      map(([[position, recordingState], workBean]) => [position, workBean, recordingState] as const),
      mergeMap(([position, workBean, recordingState]) =>
        iif(
          () => workBean.isMedley === '1',
          from(workBean.list ?? []).pipe(
            mergeMap(async medleyVersion => await fetchWorks(new Entity(medleyVersion.id, 'Version'))),
            map(medleyWorks => medleyWorks[0]),
            map((medleyWork, index) => ({position, index, workBean: medleyWork, recordingState}))
          ),
          of({position, workBean, recordingState})
        )
      ),
      filter((state): state is SelectedRecording => {
        const {recordingState} = state;
        return recordingState != null && (noSelection || recordingState.isSelected);
      }),
      toArray()
    )
  );
}

function selectedMediums(entity: Entity, noSelection: boolean, addWarning: AddWarning): SelectedMediums | undefined {
  if (!MB || !isReleaseRelationshipEditor(MB?.relationshipEditor)) {
    return;
  }

  const selected = new Set(
    noSelection
      ? MB?.tree?.iterate(MB.relationshipEditor.state.mediums)
      : MB?.tree
          ?.iterate(MB.relationshipEditor.state.mediums)
          .filter(([, recordingStateTree]) =>
            MB?.tree?.iterate(recordingStateTree).some(recording => recording.isSelected)
          )
  );

  switch (selected.size) {
    case 0:
      addWarning('select at least one recording');
      return;
    case 1: {
      const [medium] = head(selected.values())!;
      if (
        entity.entityType != 'Album' &&
        medium.track_count !== 1 &&
        MB.relationshipEditor.state.selectedRecordings?.size !== 1
      ) {
        addWarning('select exactly one recording');
        return;
      }
      break;
    }
    default:
      addWarning('select recordings only from a single medium');
      return;
  }

  return selected;
}
