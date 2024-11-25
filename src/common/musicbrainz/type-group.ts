import {compareSourceWithSourceGroup} from './compare';

export function* iterateRelationshipsInTargetTypeGroup(
  targetTypeGroup: RelationshipTargetTypeGroupT
): Generator<RelationshipStateT, void, undefined> {
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
  for (const targetTypeGroup of MB.tree.iterate(targetTypeGroups)) {
    yield* iterateRelationshipsInTargetTypeGroup(targetTypeGroup);
  }
}

export function findTargetTypeGroups(
  sourceGroups: RelationshipSourceGroupsT,
  source: RelatableEntityT
): RelationshipTargetTypeGroupsT | null {
  const sourceGroup = MB.tree.find(sourceGroups, source, compareSourceWithSourceGroup, null);
  return sourceGroup ? sourceGroup[1] : null;
}
