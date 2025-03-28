// adapted from https://github.dev/loujine/musicbrainz-scripts/blob/master/mbz-loujine-common.js

import {mergeArrays} from 'common';
import {
  fetchEditParams,
  LANGUAGE_ZXX_ID,
  urlFromMbid,
  workAttributeTypes,
  workLanguages,
  workTypes,
} from 'musicbrainz-ext';
import PLazy from 'p-lazy';
import {essenceType, EssenceType, isSong, trackName, WorkBean, workISWCs, workLanguage, WorkLanguage} from './acum';
import {shouldSetLanguage} from './ui/settings';
import {AddWarning} from './ui/warnings';

const ACUM_TYPE_ID = PLazy.from(async () => {
  return Object.values(await workAttributeTypes).find(type => type.name === 'ACUM ID')!.id;
});

export type WorkEditData = {
  name: string;
  comment: string;
  type_id: number | null;
  languages: Array<number>;
  iswcs: Array<string>;
  attributes: Array<{type_id: number; value: string}>;
};

function getWorkEditParams(work: WorkT): WorkEditData {
  return {
    name: work.name,
    comment: work.comment,
    type_id: work.typeID,
    languages: work.languages.map((it: WorkLanguageT) => it.language.id),
    iswcs: work.iswcs.map((it: IswcT) => it.iswc),
    attributes: work.attributes.map((attr: WorkAttributeT) => ({
      type_id: attr.typeID,
      value: attr.value,
    })),
  };
}

async function fetchWorkEditParams(mbid: MBID): Promise<WorkEditData> {
  const url = urlFromMbid('work', mbid);
  const work = await fetchEditParams<WorkT>(url);
  return getWorkEditParams(work);
}

export function workEditDataEqual(lhs: WorkEditData, rhs: WorkEditData) {
  return (
    lhs.name === rhs.name &&
    lhs.comment === rhs.comment &&
    lhs.type_id === rhs.type_id &&
    lhs.languages.length === rhs.languages.length &&
    lhs.iswcs.length === rhs.iswcs.length &&
    lhs.attributes.length === rhs.attributes.length &&
    lhs.languages.every((lang, idx) => lang === rhs.languages[idx]) &&
    lhs.iswcs.every((iswc, idx) => iswc === rhs.iswcs[idx]) &&
    lhs.attributes.every(
      (attr, idx) => attr.type_id === rhs.attributes[idx].type_id && attr.value === rhs.attributes[idx].value
    )
  );
}

export async function workEditData(
  work: WorkT,
  track: WorkBean,
  addWarning: AddWarning
): Promise<{originalEditData: WorkEditData; editData: WorkEditData}> {
  const originalEditData =
    work.gid && unsafeWindow.location.pathname.startsWith('/release')
      ? await fetchWorkEditParams(work.gid)
      : getWorkEditParams(work);
  const acumTypeId = await ACUM_TYPE_ID;
  return {
    originalEditData,
    editData: {
      name: originalEditData.name || trackName(track),
      comment: originalEditData.comment,
      type_id: isSong(track)
        ? (Object.values(await workTypes).find(workType => workType.name === 'Song')?.id ?? null)
        : originalEditData.type_id,
      languages: (await shouldSetLanguage())
        ? mergeArrays(
            originalEditData.languages,
            await (async () => {
              switch (essenceType(track)) {
                case EssenceType.LightMusicNoWords:
                case EssenceType.Jazz:
                  return [LANGUAGE_ZXX_ID];
                case EssenceType.Song:
                case EssenceType.ChoirSong:
                case EssenceType.Sketch:
                case EssenceType.Poetry:
                  return await (async () => {
                    switch (workLanguage(track)) {
                      case WorkLanguage.Hebrew:
                        return Object.values(await workLanguages)
                          .filter(language => language.name === 'Hebrew')
                          .map(language => language.id);
                      case WorkLanguage.Foreign:
                        return [];
                      default:
                        addWarning(`Unknown language ${track.workLanguage}`);
                        return [];
                    }
                  })();
                default:
                  addWarning(`Unknown work type ${track.versionEssenceType}`);
                  return originalEditData.languages;
              }
            })()
          )
        : originalEditData.languages,
      iswcs: mergeArrays(originalEditData.iswcs, (await workISWCs(track.workId)) ?? []),
      attributes: originalEditData.attributes.find(
        element => element.type_id === acumTypeId && element.value === track.fullWorkId
      )
        ? originalEditData.attributes
        : [
            ...originalEditData.attributes,
            {
              type_id: acumTypeId,
              value: track.fullWorkId,
            },
          ],
    },
  };
}
