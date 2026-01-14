// adapted from https://github.com/metabrainz/musicbrainz-server/blob/dccbf69fd541cceebdb5908f58589483cf1b98e3/root/static/scripts/common/utility/compare.js
import {
  RelatableEntityT,
  RelatableEntityTypeT,
  RelationshipSourceGroupT,
  RelationshipTargetTypeGroupT,
  WorkT,
} from 'typedbrainz/types';

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/*
 * The `compareStrings` implementation above works with numbers too,
 * but a separate function (1) allows for separate Flow types and (2)
 * keeps the function calls monomorphic. There's no real benefit to
 * importing this if you're simply comparing two numbers as part of a
 * larger sort function; it's mainly useful for passing to .sort()
 * directly.
 */
export function compareNumbers(a: number, b: number): number {
  return a - b;
}

export function compareInsensitive(a: string, b: string, locales?: Intl.LocalesArgument): number {
  return a.localeCompare(b, locales, {
    sensitivity: 'base',
    ignorePunctuation: true,
  });
}

export function compareTargetTypeWithGroup(
  targetType: RelatableEntityTypeT,
  targetTypeGroup: RelationshipTargetTypeGroupT
): number {
  return compareStrings(targetType, targetTypeGroup[0]);
}

export function compareSourceWithSourceGroup(a: RelatableEntityT, [b]: RelationshipSourceGroupT): number {
  return compareStrings(a.entityType, b.entityType) || a.id - b.id;
}

export function compareWorks(a: WorkT, b: WorkT): number {
  return compareStrings(a.name, b.name) || compareNumbers(a.id, b.id);
}
