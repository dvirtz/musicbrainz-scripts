// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/common/utility/parseInteger.js

const regexp = /^[0-9]+$/;

export default function parseInteger(num: string): number {
  return regexp.test(num) ? parseInt(num, 10) : NaN;
}
