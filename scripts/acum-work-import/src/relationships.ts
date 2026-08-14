import {assertMBTree, assertRelationshipEditor} from '@repo/musicbrainz-ext/asserts';
import {MEDLEY_OF_LINK_TYPE_ID, REL_STATUS_ADD, REL_STATUS_NOOP} from '@repo/musicbrainz-ext/constants';
import {findTargetTypeGroups, iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {ArtistT, RelatableEntityT, RelationshipEditStatusT, RelationshipStateT, WorkT} from 'typedbrainz/types';

export function createRelationshipState<Fields extends Pick<RelationshipStateT, 'entity0' | 'entity1'>>(
  fields: Fields
): RelationshipStateT {
  return {
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
    linkOrder: 0,
    linkTypeID: null,
    ...fields,
    id: MB?.relationshipEditor.getRelationshipStateId(null) || -1,
  };
}

export function addArtistRelationship(
  sourceEntity: RelatableEntityT,
  linkTypeID: number,
  newArtist: ArtistT,
  oldArtistID?: string
) {
  assertMBTree(MB?.tree);
  assertRelationshipEditor(MB?.relationshipEditor);

  if (oldArtistID) {
    const targetTypeGroups = findTargetTypeGroups(MB.relationshipEditor.state.relationshipsBySource, sourceEntity);
    const relationships = targetTypeGroups
      ? MB.tree
          .iterate(targetTypeGroups)
          .flatMap(typeGroup => iterateRelationshipsInTargetTypeGroup(typeGroup))
          .filter(relationship => relationship.linkTypeID === linkTypeID)
          .toArray()
      : [];
    const matchingRelationship = relationships.find(
      relationship => relationship.entity0.gid === oldArtistID || relationship.entity1.gid === oldArtistID
    );

    if (matchingRelationship) {
      MB.relationshipEditor.dispatch({
        type: 'remove-relationship',
        relationship: matchingRelationship,
      });
    }
  }

  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    newRelationshipState: createRelationshipState({
      _status: REL_STATUS_ADD,
      entity0: newArtist,
      entity1: sourceEntity,
      linkTypeID,
    }),
    oldRelationshipState: null,
  });
}

export function updateMedleyWorkRelationship(
  status: RelationshipEditStatusT,
  linkOrder: number,
  work: WorkT,
  medleyWork: WorkT,
  oldRelationshipState: RelationshipStateT | null = null
) {
  if (MB?.relationshipEditor.dispatch) {
    MB?.relationshipEditor.dispatch({
      type: 'update-relationship-state',
      sourceEntity: work,
      batchSelectionCount: undefined,
      creditsToChangeForSource: '',
      creditsToChangeForTarget: '',
      newRelationshipState: createRelationshipState({
        _status: status,
        entity0: work,
        entity1: medleyWork,
        linkTypeID: MEDLEY_OF_LINK_TYPE_ID,
        linkOrder,
      }),
      oldRelationshipState,
    });
  }
}
