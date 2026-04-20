import {MBReleaseEditor} from '#release-editor.ts';
import {isNonReleaseRelationshipEditor, isReleaseRelationshipEditor} from 'typedbrainz';
import {
  MaybeReleaseRelationshipEditor,
  NonReleaseRelationshipEditor,
  ReleaseRelationshipEditor,
} from 'typedbrainz/types';

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function assertMB(mb: typeof MB): asserts mb is NonNullable<typeof MB> {
  if (!mb) {
    throw new AssertionError('no MB');
  }
}

export function assertMBReleaseEditor(
  mb: typeof MB
): asserts mb is NonNullable<typeof MB> & {releaseEditor: MBReleaseEditor} {
  assertMB(mb);
  if (!('releaseEditor' in mb) || !mb.releaseEditor) {
    throw new AssertionError('no MB.releaseEditor');
  }
}

export function assertMBTree(tree: unknown): asserts tree is NonNullable<NonNullable<typeof MB>['tree']> {
  if (!tree) {
    throw new AssertionError('no MB.tree');
  }
}

type RequiredNonNullable<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

export function assertReleaseRelationshipEditor(
  relationshipEditor: MaybeReleaseRelationshipEditor | undefined
): asserts relationshipEditor is RequiredNonNullable<ReleaseRelationshipEditor> {
  if (!relationshipEditor || !isReleaseRelationshipEditor(relationshipEditor)) {
    throw new AssertionError('not a release relationship editor');
  }
}

export function assertRelationshipEditor(
  relationshipEditor: MaybeReleaseRelationshipEditor | undefined
): asserts relationshipEditor is RequiredNonNullable<NonReleaseRelationshipEditor> {
  if (
    !relationshipEditor ||
    (!isReleaseRelationshipEditor(relationshipEditor) && !isNonReleaseRelationshipEditor(relationshipEditor))
  ) {
    throw new AssertionError('not a relationship editor');
  }
}
