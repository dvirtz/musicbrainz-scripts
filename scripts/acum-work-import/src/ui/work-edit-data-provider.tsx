import {WorkEditData, workEditDataEqual} from '#work-edit-data.ts';
import {buildOptionList, buildOptionListFromKeys} from '@repo/musicbrainz-ext/build-options-list';
import {urlFromMbid} from '@repo/musicbrainz-ext/edits';
import {WorkAttributeTypeAllowedValueT} from '@repo/musicbrainz-ext/type-info';
import {createContext, ParentProps, useContext} from 'solid-js';
import {createStore, unwrap} from 'solid-js/store';
import {LanguageT, WorkAttributeTypeT, WorkT, WorkTypeT} from 'typedbrainz/types';

const makeWorkEditDataContext = (
  work: WorkT,
  editData: WorkEditData,
  originalEditData: WorkEditData,
  workTypes: WorkTypeT[],
  workLanguages: LanguageT[],
  workAttributeTypes: WorkAttributeTypeT[],
  workAttributeAllowedValues: WorkAttributeTypeAllowedValueT[]
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
    workAttributeTypes: () => buildOptionList(workAttributeTypes),
    workAttributeAllowedValues: () =>
      new Map(
        Map.groupBy(Object.values(workAttributeAllowedValues), x => x.workAttributeTypeID)
          .entries()
          .map(([typeId, children]) => [typeId, buildOptionListFromKeys(children, 'value', 'id')])
      ),
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
    workAttributeTypes: WorkAttributeTypeT[];
    workAttributeAllowedValues: WorkAttributeTypeAllowedValueT[];
  }
) {
  return (
    <WorkEditDataContext.Provider
      value={makeWorkEditDataContext(
        props.work,
        props.editData,
        props.originalEditData,
        props.workTypes,
        props.workLanguages,
        props.workAttributeTypes,
        props.workAttributeAllowedValues
      )}
    >
      {props.children}
    </WorkEditDataContext.Provider>
  );
}
