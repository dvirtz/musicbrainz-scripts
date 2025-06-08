import {tryFetchJSON} from '#fetch.ts';
import PLazy from 'p-lazy';
import {LinkedEntitiesT, OptionTreeT} from 'typedbrainz/types';

function byId<T extends {id: number}>(list: ReadonlyArray<T>) {
  return Object.fromEntries(list.map(item => [item.id, item])) as Record<number, T>;
}

function fetchTypeInfo<T extends {id: number}>(url: string, key: string) {
  return PLazy.from(async () => byId((await tryFetchJSON<{[key: string]: T[]}>(url))?.[key] ?? []));
}

function fetchOrGetFromCache<K extends keyof LinkedEntitiesT, T extends LinkedEntitiesT[K][0] & {id: number}>(
  url: string,
  key: string,
  cacheKey?: K
) {
  return PLazy.from(async () =>
    MB && cacheKey && Object.keys(MB.linkedEntities[cacheKey]).length > 0
      ? MB.linkedEntities[cacheKey]
      : fetchTypeInfo<T>(url, key)
  );
}

export const workAttributeTypes = fetchOrGetFromCache(
  '/ws/js/type-info/work_attribute_type',
  'work_attribute_type_list',
  'work_attribute_type'
);

type WorkAttributeTypeAllowedValueT = OptionTreeT<'work_attribute_type_allowed_value'> & {
  value: string;
  workAttributeTypeID: number;
};

export const workAttributeAllowedValues = fetchTypeInfo<WorkAttributeTypeAllowedValueT>(
  '/ws/js/type-info/work_attribute_type_allowed_value',
  'work_attribute_type_allowed_value_list'
);

export const workTypes = fetchOrGetFromCache('/ws/js/type-info/work_type', 'work_type_list', 'work_type');

export const workLanguages = fetchOrGetFromCache('/ws/js/type-info/language', 'language_list', 'language');
