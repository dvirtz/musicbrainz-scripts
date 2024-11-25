// adapted from https://github.com/metabrainz/musicbrainz-server/blob/88a1a97b0709233f1919a217fc33a7fa381a98dc/root/static/scripts/relationship-editor/utility/getRelationshipKey.js
// and https://github.com/metabrainz/musicbrainz-server/blob/9f7822edd9d868c628e764e9a22afe03a93d6932/root/static/scripts/relationship-editor/utility/getRelationshipLinkType.js

/*
 * Copyright (C) 2022 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

export function getRelationshipKey(relationship: RelationshipStateT): string {
  return relationship.entity0.entityType + '-' + relationship.entity1.entityType + '-' + String(relationship.id);
}

export function getRelationshipLinkType(relationship: {linkTypeID: number | null} | null): LinkTypeT | null {
  const linkTypeId = relationship ? relationship.linkTypeID : null;
  if (linkTypeId != null) {
    return MB.linkedEntities.link_type[linkTypeId] || null;
  }
  return null;
}
