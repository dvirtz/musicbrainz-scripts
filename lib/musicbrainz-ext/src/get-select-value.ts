// adapted from https://github.com/metabrainz/musicbrainz-server/blob/f47a266d79224df119fa9f28a5fbcbd85b869e00/root/static/scripts/common/utility/getSelectValue.js

import {FieldT, StrOrNum} from 'typedbrainz/types';

/*
 * Copyright (C) 2017 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

type GroupedOptionsT = ReadonlyArray<{
  optgroup: string;
  options: SelectOptionsT;
}>;

export type SelectOptionsT = ReadonlyArray<SelectOptionT>;

export type SelectOptionT = {
  label: string | (() => string);
  value: number | string;
};

export type MaybeGroupedOptionsT =
  | {grouped: true; options: GroupedOptionsT}
  | {grouped: false; options: SelectOptionsT};

export function getSelectValue(
  field: FieldT<StrOrNum | null>,
  options: MaybeGroupedOptionsT,
  allowEmpty: boolean = false
): string {
  if (field.value !== undefined && field.value !== null) {
    return String(field.value);
  }
  if (allowEmpty) {
    return '';
  }
  let value: StrOrNum | undefined;
  if (options.grouped) {
    value = options.options[0]?.options[0]?.value;
  } else {
    value = options.options[0]?.value;
  }
  return String(value);
}
