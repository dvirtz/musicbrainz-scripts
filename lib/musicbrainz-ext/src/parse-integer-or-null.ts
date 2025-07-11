// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/common/utility/parseIntegerOrNull.js

/*
 * Copyright (C) 2017 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {parseInteger} from '#parse-integer.js';

export function parseIntegerOrNull(value?: string | number): number | null {
  if (value == null) {
    return null;
  }
  const integer = parseInteger(String(value));
  return isNaN(integer) ? null : integer;
}
