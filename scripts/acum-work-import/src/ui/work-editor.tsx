import {ArtistLookupCache} from '#artists.ts';
import {linkArrangers, linkWriters} from '#link-artists.ts';
import {submitWork} from '#submit.ts';
import {WarningList} from '#ui/warning-list.tsx';
import {WorkNameDifferentWarning} from '#ui/work-data-warnings.tsx';
import {useWorkEditData, WorkEditDataInitialState, WorkEditDataProvider} from '#ui/work-edit-data-provider.tsx';
import classes from '#ui/work-edit-dialog.module.css';
import {WorkEditDialog} from '#ui/work-edit-dialog.tsx';
import type {WarningStore} from '#warning-store.ts';
import {Warning} from '#warning.ts';
import {workEditData} from '#work-edit-data.ts';
import {registerWorkSubmitter} from '#work-submitters.ts';
import {WorkWarningContext} from '#work-warning.ts';
import {isNewWork, workLink} from '#works.ts';
import {assertMBTree, assertReleaseRelationshipEditor} from '@repo/musicbrainz-ext/asserts';
import {compareInsensitive, compareNumbers, compareWorks} from '@repo/musicbrainz-ext/compare';
import {
  workAttributeAllowedValues,
  workAttributeTypes,
  workLanguages,
  workTypes,
} from '@repo/musicbrainz-ext/type-info';
import {waitForElement, waitForMutation} from '@repo/rxjs-ext/wait-for-element';
import {firstValueFrom, fromEvent, map} from 'rxjs';
import {createEffect, createResource, createSignal, on, onCleanup, Show} from 'solid-js';
import {render} from 'solid-js/web';
import {RecordingT, WorkT} from 'typedbrainz/types';

const workReadyEventName = 'acum:work-ready';
const refetchWorkEventName = 'acum:refetch-work';

export async function hasChanges(trackRaw: Element) {
  return await firstValueFrom(
    fromEvent(trackRaw, workReadyEventName).pipe(map(() => trackRaw?.querySelector('.rel-add, .rel-edit') !== null))
  );
}

type LinkWorkOptions = {
  context: WorkWarningContext;
  artistCache: ArtistLookupCache;
  shouldLinkArrangers: boolean;
  warningStore: WarningStore;
};

type AddWorkEditorOptions = LinkWorkOptions & {
  initialState?: {
    editData: WorkEditDataInitialState;
    warnings: readonly Warning[];
  };
  getParent: (href: string) => Promise<Element>;
  getElementsToReplace: (parent: Element) => Element[];
};

function WorkEditor(props: AddWorkEditorOptions & {parent: Element}) {
  const {context} = props;
  const {work, track, recording} = context;
  const isNew = isNewWork(work);
  const {isModified, replacedWork, captureState, savedEditData, submitUrl, initializeEditData} = useWorkEditData();
  const clearWorkWarnings = () => props.warningStore.clear();
  if (props.initialState) {
    props.warningStore.add(...props.initialState.warnings);
  }
  onCleanup(clearWorkWarnings);
  const [isLoading, setIsLoading] = createSignal(!props.initialState);
  const [resource, {refetch}] = createResource(
    () => (props.initialState ? null : [work, track, recording, props.artistCache, props.shouldLinkArrangers]),
    async () => {
      setIsLoading(true);
      return linkWork(props);
    }
  );
  createEffect(() => {
    const result = resource();
    if (!result) return;
    initializeEditData(result.editData, result.originalEditData);
    setIsLoading(false);
  });
  const reload = () => {
    clearWorkWarnings();
    void refetch();
  };
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const {parent, ...editorProps} = props;

  parent.addEventListener(refetchWorkEventName, reload);
  onCleanup(() => parent.removeEventListener(refetchWorkEventName, reload));

  createEffect(
    on(replacedWork, newWork => {
      if (!newWork) return;
      const initialState =
        newWork.gid === work.gid ? {editData: captureState(), warnings: props.warningStore.warnings()} : undefined;
      const container = parent.querySelector(`div.${classes['edit-work-button-container']}`);
      const ready = container?.isConnected
        ? waitForMutation(document.body, () => !container.isConnected)
        : Promise.resolve();
      ready
        .then(() => {
          const nextContext = initialState ? context : {...context};
          nextContext.work = newWork;
          return addWorkEditor({
            ...editorProps,
            context: nextContext,
            initialState,
          });
        })
        .catch(console.error);
    })
  );

  createEffect(() => {
    if (!isModified()) return;
    const unregister = registerWorkSubmitter(work.id, async () => {
      setIsSubmitting(true);
      try {
        return await submitWork(submitUrl(), savedEditData());
      } finally {
        setIsSubmitting(false);
      }
    });
    onCleanup(unregister);
  });

  createEffect(() => {
    const workLinkElement = parent.querySelector<HTMLAnchorElement>('a[href^="/work/"]');
    workLinkElement?.classList.toggle('rel-edit', isModified());
  });

  createEffect(() => {
    parent.querySelectorAll<HTMLElement>(`.${classes.replaced}`).forEach(el => {
      el.classList.toggle(classes.pending!, isLoading() || isModified());
    });
  });

  createEffect(() => {
    if (!isLoading()) {
      parent.dispatchEvent(new CustomEvent(workReadyEventName, {bubbles: true}));
    }
  });

  return (
    <>
      <Show when={isModified()}>
        <WorkEditDialog />{' '}
        <a
          href={workLink(work)}
          classList={{
            'wrap-anywhere': true,
            'rel-add': isNew,
            'rel-edit': !isNew,
          }}
        >
          {work.name}
        </a>
        <Show when={isNew && work.comment}>
          {comment => (
            <span class="comment">
              {' ('}
              <bdi>{comment()}</bdi>
              {')'}
            </span>
          )}
        </Show>
      </Show>

      <Show when={isLoading() || isSubmitting()}>
        <span class={classes['loading-message']}>
          {isLoading() ? 'Importing' : 'Submitting'}
          <span class={classes['loading-dots']} aria-hidden="true"></span>
        </span>
      </Show>

      <WarningList warnings={props.warningStore.warnings()} />
    </>
  );
}

export async function addWorkEditor(props: AddWorkEditorOptions) {
  const {work} = props.context;
  const href = workLink(work);
  const parent = await props.getParent(href);

  if (parent.querySelector(`div.${classes['edit-work-button-container']}`)) {
    parent.dispatchEvent(new CustomEvent(refetchWorkEventName, {bubbles: false}));
    return;
  }

  const container = (<div class={classes['edit-work-button-container']}></div>) as HTMLDivElement;
  const removeButton = parent.querySelector<HTMLButtonElement>('button.remove-item');
  removeButton?.addEventListener('click', () => {
    container.remove();
  });
  props.getElementsToReplace(parent).forEach(element => element.classList.add(classes.replaced!));
  const anchor =
    parent.querySelector<HTMLAnchorElement>(`a[href="${href}"]`) ??
    (await waitForElement(
      (element): element is HTMLAnchorElement =>
        element instanceof HTMLAnchorElement && element.getAttribute('href') === href,
      undefined,
      parent
    ));
  anchor?.classList.add(classes.replaced!);
  anchor?.insertAdjacentElement('afterend', container);
  const workTypeInfo = {
    workTypes: Object.values(await workTypes),
    workLanguages: Object.values(await workLanguages),
    workAttributeTypes: Object.values(await workAttributeTypes),
    workAttributeAllowedValues: Object.values(await workAttributeAllowedValues),
  };
  const dispose = render(
    () => (
      <WorkEditDataProvider work={work} typeInfo={workTypeInfo} initialState={props.initialState?.editData}>
        <WorkEditor {...props} parent={parent} />
      </WorkEditDataProvider>
    ),
    container
  );

  // SolidJS doesn't know when React removes the container — dispose explicitly to trigger onCleanup
  waitForMutation(document.body, () => !container.isConnected)
    .then(dispose)
    .catch(console.error);
}

async function linkWork(options: LinkWorkOptions) {
  const {context, artistCache, shouldLinkArrangers, warningStore} = options;
  const {work, track, recording} = context;
  const editData = await workEditData(work, track, warningStore, context);
  if (recording && compareInsensitive(work.name, recording.name) !== 0) {
    warningStore.add(new WorkNameDifferentWarning(context, warningStore, recording.name));
  }
  const workState = recording ? refreshWorkState(recording, work) : undefined;
  await linkWriters(artistCache, context, warningStore, workState?.targetTypeGroups);
  if (recording && shouldLinkArrangers) await linkArrangers(artistCache, context, warningStore);
  return editData;
}

function refreshRecordingState(recording: RecordingT) {
  assertMBTree(MB?.tree);
  assertReleaseRelationshipEditor(MB.relationshipEditor);

  const mediumRecordingStates = MB.tree.find(
    MB.relationshipEditor.state.mediums,
    MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id)![0],
    (mediumKey, [mediumVal]) => compareNumbers(mediumKey?.position ?? 0, mediumVal.position),
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
