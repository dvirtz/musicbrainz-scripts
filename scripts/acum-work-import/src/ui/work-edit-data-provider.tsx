import {WorkEditData, workEditDataEqual} from '#work-edit-data.ts';
import {createWork} from '#works.ts';
import {assertMBTree, assertRelationshipEditor} from '@repo/musicbrainz-ext/asserts';
import {buildOptionList, buildOptionListFromKeys} from '@repo/musicbrainz-ext/build-options-list';
import {urlFromMbid} from '@repo/musicbrainz-ext/edits';
import {findTargetTypeGroups, iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {WorkAttributeTypeAllowedValueT} from '@repo/musicbrainz-ext/type-info';
import {createContext, createSignal, ParentProps, useContext} from 'solid-js';
import {IswcT, LanguageT, WorkAttributeT, WorkAttributeTypeT, WorkLanguageT, WorkT, WorkTypeT} from 'typedbrainz/types';

type WorkTypeInfo = {
  workTypes: WorkTypeT[];
  workLanguages: LanguageT[];
  workAttributeTypes: WorkAttributeTypeT[];
  workAttributeAllowedValues: WorkAttributeTypeAllowedValueT[];
};

export type WorkEditDataInitialState = {
  savedEditData: WorkEditData;
  originalEditData: WorkEditData;
};

export type WorkEditDataProviderProps = ParentProps & {
  work: WorkT;
  typeInfo: WorkTypeInfo;
  initialState?: WorkEditDataInitialState;
};

function emptyEditData(): WorkEditData {
  return {
    name: '',
    comment: '',
    type_id: null,
    languages: [],
    iswcs: [],
    attributes: [],
  };
}

function cloneEditData(editData: WorkEditData): WorkEditData {
  return structuredClone(editData);
}

function sanitizeEditData(editData: WorkEditData): WorkEditData {
  return {
    name: editData.name,
    comment: editData.comment,
    type_id: editData.type_id,
    languages: editData.languages.filter(lang => Number.isNaN(lang) === false),
    iswcs: editData.iswcs.filter(iswc => iswc !== ''),
    attributes: editData.attributes.filter(attr => attr.value !== ''),
  };
}

function applyEditDataToWork(work: WorkT, editData: WorkEditData): WorkT {
  // Create a new work object with the edited data
  return createWork({
    ...work,
    _fromBatchCreateWorksDialog: true,
    name: editData.name,
    comment: editData.comment,
    typeID: editData.type_id,
    languages: editData.languages.map(id => {
      const lang = Object.values(MB?.linkedEntities.language ?? {}).find((l: LanguageT) => l.id === id);
      return {
        language: lang || ({id, entityType: 'language'} as LanguageT),
        entityType: 'work-language',
      } as WorkLanguageT;
    }),
    iswcs: editData.iswcs.map(
      iswc =>
        ({
          iswc,
          work_id: work.id,
          entityType: 'iswc',
        }) as IswcT
    ),
    attributes: editData.attributes.map(
      attr =>
        ({
          typeID: attr.type_id,
          value: attr.value,
          value_id: attr.value_id,
          entityType: 'work-attribute',
        }) as unknown as WorkAttributeT
    ),
  });
}

function replaceWorkLink(work: WorkT, newWork: WorkT) {
  // Dispatch update actions for all relationships pointing to this work
  assertMBTree(MB?.tree);
  assertRelationshipEditor(MB.relationshipEditor);

  const targetTypeGroups = findTargetTypeGroups(MB.relationshipEditor.state.relationshipsBySource, work);

  if (targetTypeGroups) {
    for (const targetTypeGroup of MB.tree.iterate(targetTypeGroups)) {
      for (const rel of iterateRelationshipsInTargetTypeGroup(targetTypeGroup)) {
        if (rel.entity0.id === work.id || rel.entity1.id === work.id) {
          // Clone the relationship and update entity references
          const clonedRel = structuredClone(rel);
          if (clonedRel.entity0.id === work.id) {
            clonedRel.entity0 = newWork;
            if (work.gid && !newWork.gid && clonedRel.entity1.entityType !== 'recording') {
              continue;
            }
          }
          if (clonedRel.entity1.id === work.id) {
            clonedRel.entity1 = newWork;
            if (work.gid && !newWork.gid && clonedRel.entity0.entityType !== 'recording') {
              continue;
            }
          }

          MB.relationshipEditor.dispatch?.({
            type: 'update-relationship-state',
            sourceEntity: clonedRel.entity0,
            batchSelectionCount: undefined,
            creditsToChangeForSource: '',
            creditsToChangeForTarget: '',
            newRelationshipState: clonedRel,
            oldRelationshipState: rel,
          });
        }
      }
    }
  }

  MB.linkedEntities.work[newWork.id] = newWork;
  return newWork;
}

function makeWorkEditDataContext(
  work: WorkT,
  savedEditData: () => WorkEditData,
  setSavedEditData: (value: WorkEditData) => void,
  originalEditData: () => WorkEditData,
  setOriginalEditData: (value: WorkEditData) => void,
  workTypeInfo: WorkTypeInfo
) {
  const [replacedWork, setReplacedWork] = createSignal<WorkT | undefined>(undefined);
  const replaceWork = (newWork: WorkT) => {
    replaceWorkLink(work, newWork);
    setReplacedWork(newWork);
  };

  return {
    savedEditData,
    isModified: () => !workEditDataEqual(originalEditData(), savedEditData()),
    submitUrl: () => (work.gid ? urlFromMbid('work', work.gid) : '/work/create'),
    saveEditData: (editData: WorkEditData) => {
      const next = sanitizeEditData(editData);
      setSavedEditData(next);
      replaceWork(applyEditDataToWork(work, next));
    },
    workId: () => work.id,
    workTypes: () => workTypeInfo.workTypes,
    workLanguages: () => workTypeInfo.workLanguages,
    workAttributeTypes: () => buildOptionList(workTypeInfo.workAttributeTypes),
    workAttributeAllowedValues: () =>
      new Map(
        Map.groupBy(Object.values(workTypeInfo.workAttributeAllowedValues), x => x.workAttributeTypeID)
          .entries()
          .map(([typeId, children]) => [typeId, buildOptionListFromKeys(children, 'value', 'id')])
      ),
    initializeEditData: (editData: WorkEditData, original: WorkEditData) => {
      setSavedEditData(cloneEditData(editData));
      setOriginalEditData(cloneEditData(original));
    },
    replacedWork,
    replaceWork,
    captureState: (): WorkEditDataInitialState => ({
      savedEditData: savedEditData(),
      originalEditData: originalEditData(),
    }),
  } as const;
}

const WorkEditDataContext = createContext<ReturnType<typeof makeWorkEditDataContext>>();

export function useWorkEditData() {
  const context = useContext(WorkEditDataContext);
  if (!context) {
    throw new Error('useWorkEditData should be called inside WorkEditDataProvider');
  }
  return context;
}

export function WorkEditDataProvider(props: WorkEditDataProviderProps) {
  const [savedEditData, setSavedEditData] = createSignal(props.initialState?.savedEditData ?? emptyEditData());
  const [originalEditData, setOriginalEditData] = createSignal(props.initialState?.originalEditData ?? emptyEditData());
  return (
    <WorkEditDataContext.Provider
      value={makeWorkEditDataContext(
        props.work,
        savedEditData,
        setSavedEditData,
        originalEditData,
        setOriginalEditData,
        props.typeInfo
      )}
    >
      {props.children}
    </WorkEditDataContext.Provider>
  );
}
