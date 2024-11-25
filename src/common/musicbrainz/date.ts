// adapted from https://github.com/metabrainz/musicbrainz-server/blob/5173ad201a6dbffe46f5e8372cf141f3024dbd51/root/static/scripts/common/utility/isDateEmpty.js
// and https://github.com/metabrainz/musicbrainz-server/blob/5173ad201a6dbffe46f5e8372cf141f3024dbd51/root/static/scripts/common/utility/areDatesEqual.js

/*
 * Copyright (C) 2018 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {compareDates} from './compare';

export function isDateNonEmpty(date: PartialDateT | PartialDateStringsT) {
  return !isDateEmpty(date);
}

export function isDateEmpty(date: PartialDateT | PartialDateStringsT): boolean {
  function empty<T>(value: T | '' | null | undefined): value is '' | null | undefined {
    return value === '' || value === null || value === undefined;
  }

  return date == null || (empty(date.year) && empty(date.month) && empty(date.day));
}

export function areDatesEqual(a: PartialDateT | null, b: PartialDateT | null): boolean {
  return compareDates(a, b) === 0;
}
