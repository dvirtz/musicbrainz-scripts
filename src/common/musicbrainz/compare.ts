import {compareNumbers, compareStrings} from 'src/common/lib/compare';
import {EMPTY_PARTIAL_DATE} from './constants';

export function compareTargetTypeWithGroup(
  targetType: RelatableEntityTypeT,
  targetTypeGroup: RelationshipTargetTypeGroupT
): number {
  return compareStrings(targetType, targetTypeGroup[0]);
}

export function compareLinkAttributeRootIds(a: LinkAttrT, b: LinkAttrT): number {
  const attributeTypeA = MB.linkedEntities.link_attribute_type[a.typeID];
  const attributeTypeB = MB.linkedEntities.link_attribute_type[b.typeID];
  return attributeTypeA.root_id - attributeTypeB.root_id;
}

export function compareLinkAttributeIds(a: LinkAttrT, b: LinkAttrT): number {
  return compareLinkAttributeRootIds(a, b) || a.typeID - b.typeID;
}

export function compareDates(a?: PartialDateT | null, b?: PartialDateT | null): number {
  const aOrEmpty = a ?? EMPTY_PARTIAL_DATE;
  const bOrEmpty = b ?? EMPTY_PARTIAL_DATE;

  return (
    compareNullableNumbers(aOrEmpty.year, bOrEmpty.year) ||
    compareNullableNumbers(aOrEmpty.month, bOrEmpty.month) ||
    compareNullableNumbers(aOrEmpty.day, bOrEmpty.day)
  );
}

function compareNullableNumbers(a?: number | null, b?: number | null) {
  // Sort null values first
  if (a == null) {
    return b == null ? 0 : -1;
  } else if (b == null) {
    return 1;
  }
  return a - b;
}

export function compareSourceWithSourceGroup(a: RelatableEntityT, [b]: RelationshipSourceGroupT): number {
  return compareStrings(a.entityType, b.entityType) || a.id - b.id;
}

export function compareWorks(a: WorkT, b: WorkT): number {
  return compareStrings(a.name, b.name) || compareNumbers(a.id, b.id);
}
