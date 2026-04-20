import {trackName, WorkBean} from '#acum.ts';
import {ArtistLookupCache} from '#artists.ts';
import {linkArrangers, linkWriters} from '#link-artists.ts';
import {PerWorkWarning} from '#ui/work-warnings.tsx';
import {WorkEditData, workEditData, workEditDataEqual} from '#work-edit-data.ts';
import {assertMBTree, assertReleaseRelationshipEditor} from '@repo/musicbrainz-ext/asserts';
import {buildOptionList, buildOptionListFromKeys} from '@repo/musicbrainz-ext/build-options-list';
import {compareInsensitive, compareNumbers, compareWorks} from '@repo/musicbrainz-ext/compare';
import {urlFromMbid} from '@repo/musicbrainz-ext/edits';
import {findTargetTypeGroups} from '@repo/musicbrainz-ext/type-group';
import {WorkAttributeTypeAllowedValueT} from '@repo/musicbrainz-ext/type-info';
import {createContext, createEffect, createResource, createSignal, ParentProps, useContext} from 'solid-js';
import {createStore, reconcile, unwrap} from 'solid-js/store';
import {LanguageT, RecordingT, WorkAttributeTypeT, WorkT, WorkTypeT} from 'typedbrainz/types';

type WorkTypeInfo = {
  workTypes: WorkTypeT[];
  workLanguages: LanguageT[];
  workAttributeTypes: WorkAttributeTypeT[];
  workAttributeAllowedValues: WorkAttributeTypeAllowedValueT[];
};

export type WorkEditDataProviderProps = ParentProps & {
  work: WorkT;
  track: WorkBean;
  artistCache: ArtistLookupCache;
  recording?: RecordingT;
  typeInfo: WorkTypeInfo;
  shouldLinkArrangers: boolean;
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
  return {
    liveEditData,
    setLiveEditData,
    isModified: () => !workEditDataEqual(originalEditData(), savedEditData()),
    workName: () => liveEditData.name,
    submitUrl: () => (work.gid ? urlFromMbid('work', work.gid) : '/work/create'),
    saveEditData: () => {
      const next = sanitizeEditData(unwrap(liveEditData));
      setSavedEditData(next);
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
  const [liveEditData, setLiveEditData] = createStore(emptyEditData());
  const [savedEditData, setSavedEditData] = createSignal(emptyEditData());
  const [originalEditData, setOriginalEditData] = createSignal(emptyEditData());
  const [warnings, setWarnings] = createSignal<readonly PerWorkWarning[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);

  const [resource, {refetch}] = createResource(
    [props.work, props.track, props.recording, props.artistCache, props.shouldLinkArrangers] as const,
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
