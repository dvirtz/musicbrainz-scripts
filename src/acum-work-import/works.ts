import {WorkVersion} from './acum';
import {createRelationshipState} from './relationships';
import {RECORDING_OF_LINK_TYPE_ID, REL_STATUS_ADD} from './constants';
import {addEditWorkButton} from './components/edit-work-button';

const workCache = new Map<string, WorkT>();

export function addWork(track: WorkVersion, recordingState: MediumRecordingStateT): WorkT {
  if (recordingState.relatedWorks) {
    for (const workState of MB.tree.iterate(recordingState.relatedWorks)) {
      addEditWorkButton(workState.work);
      return workState.work;
    }
  }

  const newWork = (() => {
    if (workCache.has(track.fullWorkId)) {
      return workCache.get(track.fullWorkId)!;
    }
    const workId = MB.relationshipEditor.getRelationshipStateId();
    const newWork = createWork({
      _fromBatchCreateWorksDialog: true,
      id: workId,
      name: track.workHebName,
      languages:
        track.workLanguage == '1'
          ? Object.values(MB.linkedEntities.language)
              .filter(lang => lang.name == 'Hebrew')
              .map(language => ({
                language: language,
              }))
          : [],
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
      backward: false,
      entity0: recordingState.recording,
      entity1: newWork,
      id: MB.relationshipEditor.getRelationshipStateId(),
      linkTypeID: RECORDING_OF_LINK_TYPE_ID,
    }),
    oldRelationshipState: null,
  });
  return newWork;
}

function createWork(attributes: Partial<WorkT>): WorkT {
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
