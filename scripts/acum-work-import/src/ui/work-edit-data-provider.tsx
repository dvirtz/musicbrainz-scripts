import {WorkEditData, workEditDataEqual} from '#work-edit-data.ts';
import {urlFromMbid} from '@repo/musicbrainz-ext/edits';
import {createContext, ParentProps, useContext} from 'solid-js';
import {createStore, unwrap} from 'solid-js/store';
import {LanguageT, WorkT, WorkTypeT} from 'typedbrainz/types';

const makeWorkEditDataContext = (
  work: WorkT,
  editData: WorkEditData,
  originalEditData: WorkEditData,
  workTypes: WorkTypeT[],
  workLanguages: LanguageT[]
) => {
  const [liveEditData, setEditData] = createStore(structuredClone(editData));
  return {
    liveEditData,
    setEditData,
    isModified: () => !workEditDataEqual(originalEditData, editData),
    workName: () => liveEditData.name,
    submitUrl: () => (work.gid ? urlFromMbid('work', work.gid) : '/work/create'),
    saveEditData: () => {
      const unwrapped = unwrap(liveEditData);
      editData.name = unwrapped.name;
      editData.comment = unwrapped.comment;
      editData.type_id = unwrapped.type_id;
      editData.languages = unwrapped.languages.filter(lang => Number.isNaN(lang) === false);
      editData.iswcs = unwrapped.iswcs.filter(iswc => iswc !== '');
      editData.attributes = unwrapped.attributes.filter(attr => attr.value !== '');
    },
    restoreEditData: () => {
      setEditData(structuredClone(editData));
    },
    workId: () => work.id,
    workTypes: () => workTypes,
    workLanguages: () => workLanguages,
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

export function WorkEditDataProvider(
  props: ParentProps & {
    work: WorkT;
    editData: WorkEditData;
    originalEditData: WorkEditData;
    workTypes: WorkTypeT[];
    workLanguages: LanguageT[];
  }
) {
  return (
    <WorkEditDataContext.Provider
      value={makeWorkEditDataContext(
        props.work,
        props.editData,
        props.originalEditData,
        props.workTypes,
        props.workLanguages
      )}
    >
      {props.children}
    </WorkEditDataContext.Provider>
  );
}
