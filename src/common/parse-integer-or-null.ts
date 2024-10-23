// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/common/utility/parseIntegerOrNull.js

import parseInteger from './parse-integer.js';

export default function parseIntegerOrNull(value?: string | number): number | null {
  if (value == null) {
    return null;
  }
  const integer = parseInteger(String(value));
  return isNaN(integer) ? null : integer;
}
