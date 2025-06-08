import {compareSourceWithSourceGroup} from '#compare.ts';
import {
  RelatableEntityT,
  RelationshipSourceGroupsT,
  RelationshipStateT,
  RelationshipTargetTypeGroupsT,
  RelationshipTargetTypeGroupT,
} from 'typedbrainz/types';

export function* iterateRelationshipsInTargetTypeGroup(
  targetTypeGroup: RelationshipTargetTypeGroupT
): Generator<RelationshipStateT, void, undefined> {
  if (!MB?.tree) {
    return;
  }
  const [, /* targetType */ linkTypeGroups] = targetTypeGroup;
  for (const linkTypeGroup of MB.tree.iterate(linkTypeGroups)) {
    for (const linkPhraseGroup of MB.tree.iterate(linkTypeGroup.phraseGroups)) {
      yield* MB.tree.iterate(linkPhraseGroup.relationships);
    }
  }
}

export function* iterateRelationshipsInTargetTypeGroups(
  targetTypeGroups: RelationshipTargetTypeGroupsT
): Generator<RelationshipStateT, void, undefined> {
  if (!MB?.tree) {
    return;
  }
  for (const targetTypeGroup of MB.tree.iterate(targetTypeGroups)) {
    yield* iterateRelationshipsInTargetTypeGroup(targetTypeGroup);
  }
}

export function findTargetTypeGroups(
  sourceGroups: RelationshipSourceGroupsT,
  source: RelatableEntityT
): RelationshipTargetTypeGroupsT | null {
  if (!MB?.tree) {
    return null;
  }
  const sourceGroup = MB.tree.find(sourceGroups, source, compareSourceWithSourceGroup, null);
  return sourceGroup ? sourceGroup[1] : null;
}
