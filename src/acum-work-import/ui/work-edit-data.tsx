// adapted from https://github.dev/loujine/musicbrainz-scripts/blob/master/mbz-loujine-common.js

import PLazy from 'p-lazy';
import {createContext, ParentProps, useContext} from 'solid-js';
import {createStore, unwrap} from 'solid-js/store';
import {mergeArrays} from 'src/common/lib/merge-arrays';
import {LANGUAGE_ZXX_ID} from 'src/common/musicbrainz/constants';
import {fetchEditParams, urlFromMbid} from 'src/common/musicbrainz/edits';
import {workAttributeTypes, workLanguages, workTypes} from 'src/common/musicbrainz/type-info';
import {essenceType, EssenceType, trackName, WorkBean, workISWCs, workLanguage, WorkLanguage} from '../acum';
import {WorkStateWithEditDataT} from '../work-state';
import {AddWarning} from './warnings';

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
      name: trackName(track),
      comment: originalEditData.comment,
      type_id: [EssenceType.Song, EssenceType.ChoirSong].includes(essenceType(track))
        ? (Object.values(await workTypes).find(workType => workType.name === 'Song')?.id ?? null)
        : originalEditData.type_id,
      languages: mergeArrays(
        originalEditData.languages,
        await (async () => {
          switch (essenceType(track)) {
            case EssenceType.LightMusicNoWords:
            case EssenceType.Jazz:
              return [LANGUAGE_ZXX_ID];
            case EssenceType.Song:
            case EssenceType.ChoirSong:
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
      ),
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

const makeWorkEditDataContext = (workState: WorkStateWithEditDataT) => {
  const [editData, setEditData] = createStore(structuredClone(workState.editData));
  return {
    editData,
    setEditData,
    isModified: () => !workEditDataEqual(workState.originalEditData, editData),
    workName: () => editData.name,
    submitUrl: () => (workState.work.gid ? urlFromMbid('work', workState.work.gid) : '/work/create'),
    saveEditData: () => {
      const unwrapped = unwrap(editData);
      workState.editData.name = unwrapped.name;
      workState.editData.comment = unwrapped.comment;
      workState.editData.type_id = unwrapped.type_id;
      workState.editData.languages = unwrapped.languages.filter(lang => Number.isNaN(lang) === false);
      workState.editData.iswcs = unwrapped.iswcs.filter(iswc => iswc !== '');
      workState.editData.attributes = unwrapped.attributes.filter(attr => attr.value !== '');
    },
    workId: () => workState.work.id,
  } as const;
};

const WorkEditDataContext = createContext<ReturnType<typeof makeWorkEditDataContext>>();

export function useWorkEditData() {
  const context = useContext(WorkEditDataContext);
  if (!context) {
    throw new Error('useWorkEditData should be called inside WorkEditDataProvider');
  }
  return context;
}

export function WorkEditDataProvider(props: ParentProps & {workState: WorkStateWithEditDataT}) {
  return (
    <WorkEditDataContext.Provider value={makeWorkEditDataContext(props.workState)}>
      {props.children}
    </WorkEditDataContext.Provider>
  );
}
