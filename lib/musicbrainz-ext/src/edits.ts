// adapted from https://github.dev/loujine/musicbrainz-scripts/blob/master/mbz-loujine-common.js

import {tryFetchText} from '#fetch.ts';
import {RelatableEntityTypeT} from 'typedbrainz/types';

export function urlFromMbid(entityType: RelatableEntityTypeT, mbid: string) {
  return `/${entityType}/${encodeURIComponent(mbid)}/edit`;
}

/* in order to determine the edit parameters required by POST
 * we first load the /edit page and parse the JSON data
 * in the sourceData (before 2023) or source_entity block
 */
export async function fetchEditParams<T>(url: string) {
  const editPage = await tryFetchText(url);
  const result = editPage?.match(/source_entity":(.*)},"user":/);
  if (result) {
    return JSON.parse(result[1]!) as T;
  }
  throw Error(`failed to find source_entity in ${url}`);
}

export function formatEdit(editType: string, info: object) {
  return Object.entries(info)
    .map(([prop, val]) => (val === null ? `${editType}.${prop}` : `${editType}.${prop}=${val}`))
    .join('&');
}
