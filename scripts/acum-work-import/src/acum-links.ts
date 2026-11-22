import {Entity, entityUrl} from '#acum.ts';
import {createRelationshipState} from '#relationships.ts';
import {assertMBTree, assertReleaseRelationshipEditor} from '@repo/musicbrainz-ext/asserts';
import {compareTargetTypeWithGroup} from '@repo/musicbrainz-ext/compare';
import {
  RELEASE_GROUP_OTHER_DATABASE_LINK_TYPE_ID,
  REL_STATUS_ADD,
  REL_STATUS_REMOVE,
  WORK_OTHER_DATABASE_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {findTargetTypeGroups, iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {ReleaseGroupT, UrlT, WorkT} from 'typedbrainz/types';

const otherDatabaseLinkTypes = {
  release_group: RELEASE_GROUP_OTHER_DATABASE_LINK_TYPE_ID,
  work: WORK_OTHER_DATABASE_LINK_TYPE_ID,
} as const;

const urlIdMap = new Map<string, number>();

export function addAcumLink(source: WorkT | ReleaseGroupT, entity: Entity) {
  assertMBTree(MB?.tree);
  assertReleaseRelationshipEditor(MB.relationshipEditor);

  const url = entityUrl(entity);
  const linkTypeID = otherDatabaseLinkTypes[source.entityType];
  const targetTypeGroups = findTargetTypeGroups(MB.relationshipEditor.state.relationshipsBySource, source);
  const urlGroup = targetTypeGroups && MB.tree.find(targetTypeGroups, 'url', compareTargetTypeWithGroup, null);
  if (
    urlGroup &&
    iterateRelationshipsInTargetTypeGroup(urlGroup).some(
      relationship =>
        relationship._status !== REL_STATUS_REMOVE &&
        [relationship.entity0, relationship.entity1].some(entity => entity.entityType === 'url' && entity.name === url)
    )
  ) {
    return false;
  }

  const target: UrlT = {
    entityType: 'url',
    // MB's relationship UI requires a positive target ID. This is only a placeholder:
    // new URLs are submitted by name (without this ID), and the server assigns the real ID.
    id: urlIdMap.get(url) || urlIdMap.set(url, 1 - MB.relationshipEditor.getRelationshipStateId(null)).get(url)!,
    gid: '',
    name: url,
    decoded: url,
    href_url: url,
    pretty_name: url,
    editsPending: false,
    last_updated: null,
  };
  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity: source,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    oldRelationshipState: null,
    newRelationshipState: createRelationshipState({
      _status: REL_STATUS_ADD,
      entity0: source.entityType === 'work' ? target : source,
      entity1: source.entityType === 'work' ? source : target,
      linkTypeID,
    }),
  });
  return true;
}
