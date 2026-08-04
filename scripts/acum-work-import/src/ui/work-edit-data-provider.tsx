import {trackName, WorkBean} from '#acum.ts';
import {ArtistLookupCache} from '#artists.ts';
import {linkArrangers, linkWriters} from '#link-artists.ts';
import {PerWorkWarning} from '#ui/work-warnings.tsx';
import {WorkEditData, workEditData, workEditDataEqual} from '#work-edit-data.ts';
import {createWork} from '#works.ts';
import {assertMBTree, assertRelationshipEditor, assertReleaseRelationshipEditor} from '@repo/musicbrainz-ext/asserts';
import {buildOptionList, buildOptionListFromKeys} from '@repo/musicbrainz-ext/build-options-list';
import {compareInsensitive, compareNumbers, compareWorks} from '@repo/musicbrainz-ext/compare';
import {urlFromMbid} from '@repo/musicbrainz-ext/edits';
import {findTargetTypeGroups, iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {WorkAttributeTypeAllowedValueT} from '@repo/musicbrainz-ext/type-info';
import {createContext, createEffect, createResource, createSignal, ParentProps, useContext} from 'solid-js';
import {createStore, reconcile, unwrap} from 'solid-js/store';
import {
  IswcT,
  LanguageT,
  RecordingT,
  WorkAttributeT,
  WorkAttributeTypeT,
  WorkLanguageT,
  WorkT,
  WorkTypeT,
} from 'typedbrainz/types';

type WorkTypeInfo = {
  workTypes: WorkTypeT[];
  workLanguages: LanguageT[];
  workAttributeTypes: WorkAttributeTypeT[];
  workAttributeAllowedValues: WorkAttributeTypeAllowedValueT[];
};

export type WorkEditDataInitialState = {
  liveEditData: WorkEditData;
  savedEditData: WorkEditData;
  originalEditData: WorkEditData;
  warnings: readonly PerWorkWarning[];
};

export type WorkEditDataProviderProps = ParentProps & {
  work: WorkT;
  track: WorkBean;
  artistCache: ArtistLookupCache;
  recording?: RecordingT;
  typeInfo: WorkTypeInfo;
  shouldLinkArrangers: boolean;
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
  const newWork = createWork({
    ...work,
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
          entityType: 'work-attribute',
        }) as unknown as WorkAttributeT
    ),
  });

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
          }
          if (clonedRel.entity1.id === work.id) {
            clonedRel.entity1 = newWork;
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

function refreshRecordingState(recording: RecordingT) {
  assertMBTree(MB?.tree);
  assertReleaseRelationshipEditor(MB.relationshipEditor);

  const mediumRecordingStates = MB.tree.find(
    MB.relationshipEditor.state.mediums,
    MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id)![0],
    (mediumKey, [mediumVal]) => compareNumbers(mediumKey?.id ?? 0, mediumVal.id),
    null
  )![1];
  return MB.tree.find(
    mediumRecordingStates,
    recording,
    (treeRecording, recordingState) => compareNumbers(treeRecording.id, recordingState.recording.id),
    null
  )!;
}

function refreshWorkState(recording: RecordingT, work: WorkT) {
  assertMBTree(MB?.tree);
  assertReleaseRelationshipEditor(MB.relationshipEditor);

  const recordingState = refreshRecordingState(recording);
  return MB.tree.find(
    recordingState.relatedWorks,
    work,
    (treeWork, relatedWork) => compareWorks(treeWork, relatedWork.work),
    null
  )!;
}

function makeWorkEditDataContext(
  work: WorkT,
  liveEditData: WorkEditData,
  setLiveEditData: ReturnType<typeof createStore<WorkEditData>>[1],
  savedEditData: () => WorkEditData,
  setSavedEditData: (value: WorkEditData) => void,
  originalEditData: () => WorkEditData,
  warnings: () => readonly PerWorkWarning[],
  isLoading: () => boolean,
  workTypeInfo: WorkTypeInfo,
  refetch: () => void
) {
  const [replacedWork, setReplacedWork] = createSignal<WorkT | undefined>(undefined);

  return {
    liveEditData,
    setLiveEditData,
    isModified: () => !workEditDataEqual(originalEditData(), savedEditData()),
    submitUrl: () => (work.gid ? urlFromMbid('work', work.gid) : '/work/create'),
    saveEditData: () => {
      const next = sanitizeEditData(unwrap(liveEditData));
      setSavedEditData(next);
      const newWork = applyEditDataToWork(work, next);
      setReplacedWork(newWork);
      setLiveEditData(reconcile(cloneEditData(next)));
    },
    restoreEditData: () => {
      setLiveEditData(reconcile(cloneEditData(savedEditData())));
    },
    resetEditData: () => {
      setLiveEditData(reconcile(cloneEditData(originalEditData())));
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
    warnings,
    isLoading,
    refetch,
    replacedWork,
    captureState: (): WorkEditDataInitialState => ({
      liveEditData: structuredClone(unwrap(liveEditData)),
      savedEditData: savedEditData(),
      originalEditData: originalEditData(),
      warnings: warnings(),
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
  const [liveEditData, setLiveEditData] = createStore(props.initialState?.liveEditData ?? emptyEditData());
  const [savedEditData, setSavedEditData] = createSignal(props.initialState?.savedEditData ?? emptyEditData());
  const [originalEditData, setOriginalEditData] = createSignal(props.initialState?.originalEditData ?? emptyEditData());
  const [warnings, setWarnings] = createSignal<readonly PerWorkWarning[]>(props.initialState?.warnings ?? []);
  const [isLoading, setIsLoading] = createSignal(!props.initialState);

  const [resource, {refetch}] = createResource(
    () =>
      props.initialState
        ? null
        : ([props.work, props.track, props.recording, props.artistCache, props.shouldLinkArrangers] as const),
    async ([work, track, recording, artistCache, shouldLinkArrangers]) => {
      setIsLoading(true);
      setWarnings([]);
      const {editData, originalEditData, warnings: editWarnings} = await workEditData(work, track);
      if (recording) {
        const workNameWarnings: PerWorkWarning[] =
          compareInsensitive(trackName(track), recording.name) !== 0
            ? [{type: 'work-name-different', recordingName: recording.name}]
            : [];
        const workState = refreshWorkState(recording, work);
        const writerWarnings = await linkWriters(artistCache, track, workState.work, workState.targetTypeGroups);
        const arrangerWarnings = shouldLinkArrangers
          ? await linkArrangers(artistCache, recording, track.arrangers, track.creators)
          : [];
        return {
          editData,
          originalEditData,
          warnings: [...workNameWarnings, ...editWarnings, ...writerWarnings, ...arrangerWarnings] as PerWorkWarning[],
        };
      } else {
        const writerWarnings = await linkWriters(
          artistCache,
          track,
          work,
          findTargetTypeGroups(MB?.relationshipEditor.state?.existingRelationshipsBySource ?? null, work)
        );
        return {
          editData,
          originalEditData,
          warnings: [...editWarnings, ...writerWarnings] as PerWorkWarning[],
        };
      }
    }
  );

  createEffect(() => {
    const result = resource();
    if (!result) {
      return;
    }

    const nextSavedEditData = cloneEditData(result.editData);
    const nextOriginalEditData = cloneEditData(result.originalEditData);
    setSavedEditData(nextSavedEditData);
    setOriginalEditData(nextOriginalEditData);
    setLiveEditData(reconcile(cloneEditData(nextSavedEditData)));
    setWarnings(result.warnings);
    setIsLoading(false);
  });

  return (
    <WorkEditDataContext.Provider
      value={makeWorkEditDataContext(
        props.work,
        liveEditData,
        setLiveEditData,
        savedEditData,
        setSavedEditData,
        originalEditData,
        warnings,
        isLoading,
        props.typeInfo,
        () => void refetch()
      )}
    >
      {props.children}
    </WorkEditDataContext.Provider>
  );
}
