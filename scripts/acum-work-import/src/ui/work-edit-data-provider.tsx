import {workEditDataEqual} from '#work-edit-data.ts';
import {WorkStateWithEditDataT} from '#work-state.ts';
import {urlFromMbid} from '@repo/musicbrainz-ext/edits';
import {createContext, ParentProps, useContext} from 'solid-js';
import {createStore, unwrap} from 'solid-js/store';

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
    restoreEditData: () => {
      setEditData(structuredClone(workState.editData));
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
