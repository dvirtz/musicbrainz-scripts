import {compareNumbers} from 'src/common/lib/compare';
import {head} from 'src/common/lib/head';
import {compareTargetTypeWithGroup} from 'src/common/musicbrainz/compare';
import {
  COMPOSER_LINK_TYPE_ID,
  LYRICIST_LINK_TYPE_ID,
  RECORDING_OF_LINK_TYPE_ID,
  REL_STATUS_ADD,
  REL_STATUS_REMOVE,
  TRANSLATOR_LINK_TYPE_ID,
} from 'src/common/musicbrainz/constants';
import {iterateRelationshipsInTargetTypeGroup} from 'src/common/musicbrainz/type-group';
import {trackName, WorkBean, WorkVersion} from './acum';
import {linkArtists} from './artists';
import {createRelationshipState} from './relationships';
import {AddWarning} from './ui/warnings';
import {workEditData} from './ui/work-edit-data';
import {addWorkEditor} from './ui/work-editor';
import {WorkStateWithEditDataT} from './work-state';

const workCache = new Map<string, WorkT>();

function shouldAddNewWork(relatedWorks: MediumWorkStateTreeT) {
  const relatedWork = head(MB.tree.iterate(relatedWorks));
  if (!relatedWork) {
    return true;
  }

  const targetTypeGroup = MB.tree.find(relatedWork.targetTypeGroups, 'recording', compareTargetTypeWithGroup, null);
  if (!targetTypeGroup) {
    return true;
  }
  for (const relationship of iterateRelationshipsInTargetTypeGroup(targetTypeGroup)) {
    if (relationship._status !== REL_STATUS_REMOVE) {
      return false;
    }
  }
  return true;
}

export async function addWork(
  track: WorkVersion,
  recordingState: MediumRecordingStateT,
  addWarning: AddWarning
): Promise<WorkStateWithEditDataT> {
  if (shouldAddNewWork(recordingState.relatedWorks)) {
    recordingState = await createNewWork(track, recordingState);
  }

  const workState = head(MB.tree.iterate(recordingState.relatedWorks)) as WorkStateWithEditDataT;
  Object.assign(workState, await workEditData(workState.work, track, addWarning));
  addWorkEditor(workState, recordingState);
  return workState;
}

async function createNewWork(track: WorkVersion, recordingState: MediumRecordingStateT) {
  const newWork = (() => {
    if (workCache.has(track.fullWorkId)) {
      return workCache.get(track.fullWorkId)!;
    }
    const newWork = createWork({
      _fromBatchCreateWorksDialog: true,
      id: MB.relationshipEditor.getRelationshipStateId(),
      name: trackName(track),
    });
    workCache.set(track.fullWorkId, newWork);
    return newWork;
  })();
  MB.linkedEntities.work[newWork.id] = newWork;
  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity: recordingState.recording,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    newRelationshipState: createRelationshipState({
      _status: REL_STATUS_ADD,
      entity0: recordingState.recording,
      entity1: newWork,
      id: MB.relationshipEditor.getRelationshipStateId(),
      linkTypeID: RECORDING_OF_LINK_TYPE_ID,
    }),
    oldRelationshipState: null,
  });
  // wait for the work to be added
  await new Promise<void>(resolve => {
    VM.observe(document.querySelector('.release-relationship-editor')!, (mutations, observer) => {
      if (document.querySelector(`.works a[href="#new-work-${newWork.id}"]`)) {
        observer.disconnect();
        resolve();
      }
    });
  });
  // refresh recording state
  const mediumRecordingStates = MB.tree.find(
    MB.relationshipEditor.state.mediums,
    MB.relationshipEditor.state.mediumsByRecordingId.get(recordingState.recording.id)![0],
    (mediumKey, [mediumVal]) => {
      return compareNumbers(mediumKey.id, mediumVal.id);
    },
    null
  )![1];
  return MB.tree.find(
    mediumRecordingStates,
    recordingState.recording,
    (recording, recordingState) => compareNumbers(recording.id, recordingState.recording.id),
    null
  )!;
}

export function createWork(attributes: Partial<WorkT>): WorkT {
  return MB.entity({
    ...{
      artists: [],
      attributes: [],
      comment: '',
      editsPending: false,
      entityType: 'work',
      gid: '',
      id: 0,
      iswcs: [],
      languages: [],
      last_updated: null,
      name: '',
      typeID: null,
      writers: [],
    },
    ...attributes,
  });
}

export async function linkWriters(
  artistCache: Map<string, Promise<ArtistT | null>>,
  track: WorkBean,
  doLink: (artist: ArtistT, linkTypeID: number) => void,
  addWarning: (message: string) => Set<string>
) {
  await linkArtists(
    artistCache,
    [...(track.authors ?? []), ...(track.composersAndAuthors ?? [])],
    track.creators,
    artist => doLink(artist, LYRICIST_LINK_TYPE_ID),
    addWarning
  );
  await linkArtists(
    artistCache,
    [...(track.composers ?? []), ...(track.composersAndAuthors ?? [])],
    track.creators,
    artist => doLink(artist, COMPOSER_LINK_TYPE_ID),
    addWarning
  );
  await linkArtists(
    artistCache,
    track.translators,
    track.creators,
    artist => doLink(artist, TRANSLATOR_LINK_TYPE_ID),
    addWarning
  );
}
