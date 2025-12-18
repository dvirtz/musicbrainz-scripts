import {assertMBTree} from '#asserts.ts';
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
  assertMBTree(MB?.tree);

  const [, /* targetType */ linkTypeGroups] = targetTypeGroup;
  for (const linkTypeGroup of MB.tree.iterate(linkTypeGroups)) {
    for (const linkPhraseGroup of MB.tree.iterate(linkTypeGroup.phraseGroups)) {
      yield* MB.tree.iterate(linkPhraseGroup.relationships);
    }
  }
}

export function findTargetTypeGroups(
  sourceGroups: RelationshipSourceGroupsT,
  source: RelatableEntityT
): RelationshipTargetTypeGroupsT | null {
  assertMBTree(MB?.tree);

  const sourceGroup = MB.tree.find(sourceGroups, source, compareSourceWithSourceGroup, null);
  return sourceGroup ? sourceGroup[1] : null;
}
