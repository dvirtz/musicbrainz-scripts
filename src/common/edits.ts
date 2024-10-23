// adapted from https://github.dev/loujine/musicbrainz-scripts/blob/master/mbz-loujine-common.js

import {tryFetch} from './try-fetch';

export function urlFromMbid(entityType: string, mbid: MBID) {
  return `/${entityType}/${encodeURIComponent(mbid)}/edit`;
}

/* in order to determine the edit parameters required by POST
 * we first load the /edit page and parse the JSON data
 * in the sourceData (before 2023) or source_entity block
 */
export async function getEditParams(url: string) {
  const editPage = (await tryFetch(url)) as string;
  const result = editPage.match(/source_entity":(.*)},"user":/);
  if (result) {
    return JSON.parse(result[1]);
  }
  throw Error(`failed to find source_entity in ${url}`);
}

export function formatEdit(editType: string, info: object) {
  return Object.entries(info)
    .map(([prop, val]) => (val === null ? `${editType}.${prop}` : `${editType}.${prop}=${val}`))
    .join('&');
}
