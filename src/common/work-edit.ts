// adapted from https://github.dev/loujine/musicbrainz-scripts/blob/master/mbz-loujine-common.js

import {formatEdit, getEditParams, urlFromMbid} from './edits';
import {tryFetch} from './try-fetch';

export async function getWorkEditParams(url: string) {
  const data = (await getEditParams(url)) as WorkT;
  return {
    name: data.name,
    type_id: data.typeID,
    languages: data.languages.map((it: WorkLanguageT) => it.language.id),
    iswcs: data.iswcs.map((it: IswcT) => it.iswc),
    attributes: data.attributes.map((attr: WorkAttributeT) => ({
      type_id: attr.typeID,
      value: attr.value,
    })),
  };
}

type EditData = Awaited<ReturnType<typeof getWorkEditParams>>;

function encodeName(name: string) {
  return encodeURIComponent(name).replace(/%20/g, '+');
}

export function prepareEdit(editData: EditData) {
  return {
    name: encodeName(editData.name),
    type_id: editData.type_id || ' ',
    ...editData.languages.map((lang, idx) => ({
      [`languages.${idx}`]: lang,
    })),
    ...editData.iswcs.map((iswc, idx) => ({
      [`iswcs.${idx}`]: iswc,
    })),
    ...editData.attributes.map((attr, idx) => ({
      [`attributes.${idx}.type_id`]: attr.type_id,
      [`attributes.${idx}.value`]: attr.value,
    })),
  };
}

function merge<T>(lhs: Array<T>, rhs: Array<T>) {
  return Array.from(new Set(lhs.concat(rhs)).values());
}

export async function editWork(mbid: MBID, additionalData: EditData, editNote: string) {
  try {
    const url = urlFromMbid('work', mbid);
    const editData = await getWorkEditParams(url);
    const postData = prepareEdit({
      ...editData,
      languages: merge(editData.languages, additionalData.languages),
      iswcs: merge(editData.iswcs, additionalData.iswcs),
      attributes: merge(editData.attributes, additionalData.attributes),
    });
    await tryFetch(
      url,
      'POST',
      formatEdit('edit-work', {
        ...postData,
        'edit_note': editNote,
      })
    );
  } catch (e) {
    console.error(`failed to edit work ${mbid}: ${e}`);
  }
}
