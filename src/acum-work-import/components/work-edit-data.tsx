// adapted from https://github.dev/loujine/musicbrainz-scripts/blob/master/mbz-loujine-common.js

import {createContext, ParentProps, useContext} from 'solid-js';
import {createStore, unwrap} from 'solid-js/store';
import {essenceType, EssenceType, workISWCs, workLanguage, WorkLanguage, WorkVersion} from '../acum';
import {mergeArrays} from 'src/common/lib/merge-arrays';
import {ACUM_TYPE_ID, LANGUAGE_ZXX_ID} from 'src/common/musicbrainz/constants';
import {fetchEditParams, urlFromMbid} from 'src/common/musicbrainz/edits';
import {WorkStateWithEditDataT} from '../work-state';
import {AddWarning} from './warnings';

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
  const work = (await fetchEditParams(url)) as WorkT;
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

export async function udpateEditData(workState: WorkStateWithEditDataT, track: WorkVersion, addWarning: AddWarning) {
  workState.originalEditData = workState.work.gid
    ? await fetchWorkEditParams(workState.work.gid)
    : getWorkEditParams(workState.work);
  workState.editData = {
    name: track.workHebName,
    comment: workState.originalEditData.comment,
    type_id:
      essenceType(track) == EssenceType.Song
        ? (Object.values(MB.linkedEntities.work_type).find(workType => workType.name === 'Song')?.id ?? null)
        : workState.originalEditData.type_id,
    languages: mergeArrays(
      workState.originalEditData.languages,
      (() => {
        switch (essenceType(track)) {
          case EssenceType.NoLyrics:
            return [LANGUAGE_ZXX_ID];
          case EssenceType.Song:
            return (() => {
              switch (workLanguage(track)) {
                case WorkLanguage.Hebrew:
                  return Object.values(MB.linkedEntities.language)
                    .filter(language => language.name === 'Hebrew')
                    .map(language => language.id);
                default:
                  addWarning(`Unknown language ${track.workLanguage}`);
                  return [];
              }
            })();
          default:
            addWarning(`Unknown work type ${track.versionEssenceType}`);
            return workState.originalEditData.languages;
        }
      })()
    ),
    iswcs: mergeArrays(workState.originalEditData.iswcs, (await workISWCs(track.workId)) ?? []),
    attributes: workState.originalEditData.attributes.find(
      element => element.type_id === ACUM_TYPE_ID && element.value === track.fullWorkId
    )
      ? workState.originalEditData.attributes
      : [
          ...workState.originalEditData.attributes,
          {
            type_id: ACUM_TYPE_ID,
            value: track.fullWorkId,
          },
        ],
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
