import {ARRANGER_LINK_TYPE_ID, REL_STATUS_ADD, REL_STATUS_NOOP} from '@repo/musicbrainz-ext/constants';
import {ArtistT, RecordingT, RelationshipStateT, WorkT} from 'typedbrainz/types';

export function createRelationshipState<Fields extends Pick<RelationshipStateT, 'entity0' | 'entity1'>>(
  fields: Fields
): RelationshipStateT {
  return {
    ...{
      _lineage: [],
      _original: null,
      _status: REL_STATUS_NOOP,
      attributes: null,
      begin_date: null,
      editsPending: false,
      end_date: null,
      ended: false,
      entity0_credit: '',
      entity1_credit: '',
      id: -1,
      linkOrder: 0,
      linkTypeID: null,
    },
    ...fields,
  };
}

export function addWriterRelationship(work: WorkT, artist: ArtistT, linkTypeID: number) {
  if (MB?.relationshipEditor.dispatch) {
    MB.relationshipEditor.dispatch({
      type: 'update-relationship-state',
      sourceEntity: work,
      batchSelectionCount: undefined,
      creditsToChangeForSource: '',
      creditsToChangeForTarget: '',
      newRelationshipState: createRelationshipState({
        _status: REL_STATUS_ADD,
        entity0: artist,
        entity1: work,
        id: MB.relationshipEditor.getRelationshipStateId(null),
        linkTypeID: linkTypeID,
      }),
      oldRelationshipState: null,
    });
  }
}

export function addArrangerRelationship(recording: RecordingT, artist: ArtistT) {
  if (MB?.relationshipEditor.dispatch) {
    MB.relationshipEditor.dispatch({
      type: 'update-relationship-state',
      sourceEntity: recording,
      batchSelectionCount: undefined,
      creditsToChangeForSource: '',
      creditsToChangeForTarget: '',
      newRelationshipState: createRelationshipState({
        _status: REL_STATUS_ADD,
        entity0: artist,
        entity1: recording,
        id: MB.relationshipEditor.getRelationshipStateId(null),
        linkTypeID: ARRANGER_LINK_TYPE_ID,
      }),
      oldRelationshipState: null,
    });
  }
}
