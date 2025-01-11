import {
  connect,
  count,
  endWith,
  filter,
  from,
  ignoreElements,
  lastValueFrom,
  map,
  merge,
  mergeMap,
  of,
  pipe,
  scan,
  tap,
  toArray,
  zip,
  zipWith,
} from 'rxjs';
import {Setter} from 'solid-js';
import {compareInsensitive} from 'src/common/lib/compare';
import {head} from 'src/common/lib/head';
import {addEditNote} from 'src/common/musicbrainz/edit-note';
import {trackRecordingState} from 'src/common/musicbrainz/track-recording-state';
import {albumUrl, Creator, Creators, Entity, fetchWork, IPBaseNumber, trackName, WorkBean} from './acum';
import {albumInfo} from './albums';
import {linkArtists} from './artists';
import {addArrangerRelationship, addWriterRelationship} from './relationships';
import {AddWarning} from './ui/warnings';
import {workEditDataEqual} from './ui/work-edit-data';
import {WorkStateWithEditDataT} from './work-state';
import {addWork, linkWriters} from './works';

type SelectedMediums = Set<[MediumWithRecordingsT, MediumRecordingStateTreeT]>;
type SelectedRecordings = ReadonlyArray<readonly [number, WorkBean, MediumRecordingStateT]>;
// map of promises so that we don't fetch the same artist multiple times
type ArtistCache = Map<IPBaseNumber, Promise<ArtistT | null>>;
type SetProgress = Setter<readonly [number, string]>;

export async function importAlbum(
  entityId: string,
  entity: Entity,
  addWarning: AddWarning,
  setProgress: SetProgress
): Promise<boolean> {
  setProgress([0, 'Loading album info']);

  const noSelection = (MB.relationshipEditor.state.selectedRecordings?.size ?? 0) === 0;
  const mediums = selectedMediums(entity, noSelection, addWarning);
  const recordings = await selectedRecordings(entity, entityId, noSelection, mediums);

  return await importSelectedWorks(entityId, recordings, addWarning, setProgress);
}

async function importSelectedWorks(
  entityId: string,
  selectedRecordings: SelectedRecordings,
  addWarning: AddWarning,
  setProgress: SetProgress
) {
  const addTrackWarning = (position: number) => (warning: string) => addWarning(`Track ${position}: ${warning}`);

  const artistCache: ArtistCache = new Map();

  return await lastValueFrom(
    from(selectedRecordings).pipe(
      map(([position, workBean, recordingState]) => [workBean, recordingState, addTrackWarning(position)] as const),
      tap(([workBean, recordingState, addWarning]) => {
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
        async ([workBean, recordingState, addWarning]) =>
          [workBean, recordingState.recording, await addWork(workBean, recordingState, addWarning), addWarning] as const
      ),
      mergeMap(args => linkCreators(artistCache, ...args)),
      connect(shared =>
        merge(
          shared.pipe(maybeSetEditNote(entityId, addWarning)),
          shared.pipe(updateProgress(selectedRecordings, setProgress), ignoreElements())
        )
      )
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

function maybeSetEditNote(entityId: string, addWarning: AddWarning) {
  return pipe(
    count((workState: WorkStateWithEditDataT) => !workEditDataEqual(workState.editData, workState.originalEditData)),
    map(editedCount => editedCount > 0),
    tap(hasEdits => {
      if (hasEdits) {
        addEditNote(`Imported from ${albumUrl(entityId)}`);
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
  entityId: string,
  noSelection: boolean,
  selectedMediums: SelectedMediums = new Set()
): Promise<SelectedRecordings> {
  const workBeans: ReadonlyArray<WorkBean> =
    entity == Entity.Work ? ((await fetchWork(entityId)) ?? []) : (await albumInfo(entityId)).tracks;

  return await lastValueFrom(
    of(head(selectedMediums.values())).pipe(
      filter(
        (mediumAndRecordings): mediumAndRecordings is [MediumWithRecordingsT, MediumRecordingStateTreeT] =>
          mediumAndRecordings != null
      ),
      mergeMap(([medium, recordingStateTree]) => {
        return zip(
          from(medium.tracks?.map(track => track.position) ?? []),
          from(medium.tracks!.map(track => trackRecordingState(track, recordingStateTree)))
        );
      }),
      filter((trackAndRecordingState): trackAndRecordingState is [number, MediumRecordingStateT] => {
        const [, recordingState] = trackAndRecordingState;
        return recordingState != null && (noSelection || recordingState.isSelected);
      }),
      zipWith(from(workBeans)),
      map(([[position, recordingState], workBean]) => [position, workBean, recordingState] as const),
      toArray()
    )
  );
}

function selectedMediums(entity: Entity, noSelection: boolean, addWarning: AddWarning): SelectedMediums | undefined {
  const selected = new Set(
    noSelection
      ? MB.tree.iterate(MB.relationshipEditor.state.mediums)
      : MB.tree
          .iterate(MB.relationshipEditor.state.mediums)
          .filter(([, recordingStateTree]) =>
            MB.tree.iterate(recordingStateTree).some(recording => recording.isSelected)
          )
  );

  switch (selected.size) {
    case 0:
      addWarning('select at least one recording');
      return;
    case 1:
      if (entity == Entity.Work && MB.relationshipEditor.state.selectedRecordings?.size !== 1 && selected.size !== 1) {
        addWarning('select exactly one recording');
        return;
      }
      break;
    default:
      addWarning('select recordings only from a single medium');
      return;
  }

  return selected;
}
