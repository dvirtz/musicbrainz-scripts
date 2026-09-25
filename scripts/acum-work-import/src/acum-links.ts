import {Entity, entityUrl} from '#acum.ts';
import {createRelationshipState} from '#relationships.ts';
import {assertMBTree, assertReleaseRelationshipEditor} from '@repo/musicbrainz-ext/asserts';
import {
  RECORDING_OTHER_DATABASE_LINK_TYPE_ID,
  RELEASE_GROUP_OTHER_DATABASE_LINK_TYPE_ID,
  REL_STATUS_ADD,
  WORK_OTHER_DATABASE_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {RecordingT, ReleaseGroupT, UrlT, WorkT} from 'typedbrainz/types';

const otherDatabaseLinkTypes = {
  recording: RECORDING_OTHER_DATABASE_LINK_TYPE_ID,
  release_group: RELEASE_GROUP_OTHER_DATABASE_LINK_TYPE_ID,
  work: WORK_OTHER_DATABASE_LINK_TYPE_ID,
} as const;

export function addAcumLink(source: RecordingT | WorkT | ReleaseGroupT, entity: Entity) {
  assertMBTree(MB?.tree);
  assertReleaseRelationshipEditor(MB.relationshipEditor);

  const url = entityUrl(entity);
  const linkTypeID = otherDatabaseLinkTypes[source.entityType];

  const target: UrlT = {
    entityType: 'url',
    // MB's relationship UI requires a positive target ID. This is only a placeholder:
    // new URLs are submitted by name (without this ID), and the server assigns the real ID.
    id: 1,
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
