import {Creator, Creators, Entity, entityUrl, fetchWorks, IPBaseNumber, trackName, Version, WorkBean} from '#acum.ts';
import {linkArtists} from '#artists.ts';
import {addArrangerRelationship} from '#relationships.ts';
import {AddWarning} from '#ui/warnings.tsx';
import {addWorkEditor} from '#ui/work-editor.tsx';
import {workEditData, workEditDataEqual} from '#work-edit-data.ts';
import {WorkStateWithEditDataT} from '#work-state.ts';
import {createNewWork, linkWriters} from '#works.ts';
import {head} from '@repo/common/head';
import {
  compareInsensitive,
  compareNumbers,
  compareTargetTypeWithGroup,
  compareWorks,
} from '@repo/musicbrainz-ext/compare';
import {REL_STATUS_REMOVE} from '@repo/musicbrainz-ext/constants';
import {addEditNote} from '@repo/musicbrainz-ext/edit-note';
import {trackRecordingState} from '@repo/musicbrainz-ext/track-recording-state';
import {iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {asyncTap} from '@repo/rxjs-ext/async-tap';
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
  MediumWorkStateT,
  MediumWorkStateTreeT,
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
  const artistCache: ArtistCache = new Map();

  const addTrackWarning = (position: number) => (warning: string) => addWarning(`Track ${position}: ${warning}`);

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
          async ([{index, workBean, recordingState}, addWarning]) =>
            [
              workBean,
              recordingState.recording,
              await addWork(index, workBean, recordingState, addWarning),
              addWarning,
            ] as const
        ),
        asyncTap(async ([workBean, recording, workState, addWarning]) => {
          await linkWriters(artistCache, workBean, workState.work, workState.targetTypeGroups, addWarning);
          if (entity.entityType !== 'Work') {
            await linkArrangers(artistCache, recording, workBean.arrangers, workBean.creators, addWarning);
          }
        }),
        map(([, , workState]) => workState),
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

  if (workBeans.length === 0) {
    throw new Error(`No works found for entity ${entity.toString()}`);
  }

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
            mergeMap(async medleyVersion => await fetchWorks(new Version(medleyVersion.id, medleyVersion.workId))),
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

async function addWork(
  index: number | undefined,
  track: WorkBean,
  recordingState: MediumRecordingStateT,
  addWarning: AddWarning
): Promise<WorkStateWithEditDataT> {
  const workState = (await (async () => {
    if (!MB || !MB.tree || !isReleaseRelationshipEditor(MB?.relationshipEditor)) {
      throw new Error('MB or MB.tree is not defined or not a release relationship editor');
    }

    const existing = relatedWork(recordingState.relatedWorks);
    if (existing) {
      return existing as WorkStateWithEditDataT;
    }

    const newWork = await createNewWork(index, track, recordingState);

    recordingState = refreshRecordingState(recordingState.recording);

    return MB.tree.find(
      recordingState.relatedWorks,
      newWork,
      (work, relatedWork) => compareWorks(work, relatedWork.work),
      null
    )!;
  })()) as WorkStateWithEditDataT;

  Object.assign(workState, await workEditData(workState.work, track, addWarning));
  addWorkEditor(workState, recordingState);
  return workState;
}

function refreshRecordingState(recording: RecordingT): MediumRecordingStateT {
  if (!MB || !MB.tree || !isReleaseRelationshipEditor(MB?.relationshipEditor)) {
    throw new Error('MB or MB.tree is not defined or not a release relationship editor');
  }

  const mediumRecordingStates = MB.tree.find(
    MB.relationshipEditor.state.mediums,
    MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id)![0],
    (mediumKey, [mediumVal]) => {
      return compareNumbers(mediumKey?.id ?? 0, mediumVal.id);
    },
    null
  )![1];
  return MB.tree.find(
    mediumRecordingStates,
    recording,
    (recording, recordingState) => compareNumbers(recording.id, recordingState.recording.id),
    null
  )!;
}

function relatedWork(relatedWorks: MediumWorkStateTreeT): MediumWorkStateT | undefined {
  if (!MB?.tree) {
    return;
  }

  const relatedWork = head(MB.tree.iterate(relatedWorks));
  if (relatedWork) {
    const targetTypeGroup = MB.tree.find(relatedWork.targetTypeGroups, 'recording', compareTargetTypeWithGroup, null);
    if (targetTypeGroup) {
      for (const relationship of iterateRelationshipsInTargetTypeGroup(targetTypeGroup)) {
        if (relationship._status !== REL_STATUS_REMOVE) {
          return relatedWork;
        }
      }
    }
  }
}
