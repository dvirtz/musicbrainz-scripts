import {tryFetchJSON} from '#fetch.ts';
import PLazy from 'p-lazy';
import {LinkedEntitiesT, OptionTreeT} from 'typedbrainz/types';

type TypeInfoMapKey = {
  [K in keyof LinkedEntitiesT]: LinkedEntitiesT[K] extends Record<string | number, {id: number}> ? K : never;
}[keyof LinkedEntitiesT];

function byId<T extends {id: number}>(list: ReadonlyArray<T>): Record<number, T> {
  return Object.fromEntries(list.map(item => [item.id, item])) as Record<number, T>;
}

function fetchTypeInfo<T extends {id: number}>(url: string, key: string): PLazy<Record<number, T>> {
  return PLazy.from(async () => byId((await tryFetchJSON<{[key: string]: T[]}>(url))?.[key] ?? []));
}

function fetchTypeInfoMap<K extends TypeInfoMapKey>(url: string, key: string): PLazy<LinkedEntitiesT[K]> {
  return PLazy.from(async () => {
    const items = (await tryFetchJSON<{[key: string]: Array<LinkedEntitiesT[K][number]>}>(url))?.[key] ?? [];
    return byId(items) as LinkedEntitiesT[K];
  });
}

function fetchOrGetFromCache<K extends TypeInfoMapKey>(
  url: string,
  key: string,
  cacheKey?: K
): PLazy<LinkedEntitiesT[K]> {
  return PLazy.from(async () => {
    if (typeof MB !== 'undefined' && cacheKey && Object.keys(MB.linkedEntities[cacheKey]).length > 0) {
      return MB.linkedEntities[cacheKey];
    }
    return await fetchTypeInfoMap<K>(url, key);
  });
}

export const workAttributeTypes = fetchOrGetFromCache(
  '/ws/js/type-info/work_attribute_type',
  'work_attribute_type_list',
  'work_attribute_type'
);

export type WorkAttributeTypeAllowedValueT = OptionTreeT<'work_attribute_type_allowed_value'> & {
  value: string;
  workAttributeTypeID: number;
};

export const workAttributeAllowedValues = fetchTypeInfo<WorkAttributeTypeAllowedValueT>(
  '/ws/js/type-info/work_attribute_type_allowed_value',
  'work_attribute_type_allowed_value_list'
);

export const workTypes = fetchOrGetFromCache('/ws/js/type-info/work_type', 'work_type_list', 'work_type');

export const workLanguages = fetchOrGetFromCache('/ws/js/type-info/language', 'language_list', 'language');

const linkTypes = fetchOrGetFromCache('/ws/js/type-info/link_type', 'link_type_list', 'link_type');

export async function linkTypeGid(id: number) {
  return Object.values(await linkTypes).find(linkType => linkType.id === id)?.gid;
}

export async function linkTypeId(gid: string) {
  return Object.values(await linkTypes).find(linkType => linkType.gid === gid)?.id;
}
