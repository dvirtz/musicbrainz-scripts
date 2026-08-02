import {WorkBean} from '#acum.ts';
import {submitWork} from '#submit.ts';
import {useWorkEditData, WorkEditDataProvider, WorkEditDataProviderProps} from '#ui/work-edit-data-provider.tsx';
import classes from '#ui/work-edit-dialog.module.css';
import {WorkEditDialog} from '#ui/work-edit-dialog.tsx';
import {WorkWarnings} from '#ui/work-warnings.tsx';
import {isNewWork, workLink} from '#works.ts';
import {
  workAttributeAllowedValues,
  workAttributeTypes,
  workLanguages,
  workTypes,
} from '@repo/musicbrainz-ext/type-info';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {createEffect, createSignal, onCleanup, Show} from 'solid-js';
import {render} from 'solid-js/web';
import {RecordingT, WorkT} from 'typedbrainz/types';

type SubmitWorkRequestDetail = {
  reject: (reason?: unknown) => void;
  resolve: (work: WorkT) => void;
};

const submitWorkEventName = 'acum:submit-work';
const workReadyEventName = 'acum:work-ready';
const refetchWorkEventName = 'acum:refetch-work';

export async function requestWorkSubmission(form: HTMLFormElement): Promise<WorkT> {
  return await new Promise<WorkT>((resolve, reject) => {
    form.dispatchEvent(
      new CustomEvent<SubmitWorkRequestDetail>(submitWorkEventName, {
        bubbles: false,
        cancelable: false,
        detail: {resolve, reject},
      })
    );
  });
}

export async function hasChanges(trackRaw: Element) {
  return await new Promise<boolean>(resolve => {
    trackRaw.addEventListener(workReadyEventName, () => {
      resolve(trackRaw?.querySelector('.rel-add, .rel-edit') !== null);
    });
  });
}

function WorkEditor(props: {work: WorkT; track: WorkBean; parent: Element; recording?: RecordingT}) {
  const isNew = isNewWork(props.work);
  const {isLoading, isModified, warnings, workName, resetEditData, refetch} = useWorkEditData();
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  props.parent.addEventListener(refetchWorkEventName, refetch);
  onCleanup(() => props.parent.removeEventListener(refetchWorkEventName, refetch));

  const setSubmitForm = (form: HTMLFormElement) => {
    const onSubmitWorkRequest = (event: Event) => {
      setIsSubmitting(true);
      const request = event as CustomEvent<SubmitWorkRequestDetail>;
      submitWork(form)
        .then(work => {
          request.detail.resolve(work);
        })
        .catch(request.detail.reject)
        .finally(() => setIsSubmitting(false));
    };

    form.addEventListener(submitWorkEventName, onSubmitWorkRequest);
    onCleanup(() => {
      form.removeEventListener(submitWorkEventName, onSubmitWorkRequest);
    });
  };

  createEffect(() => {
    const workLinkElement = props.parent.querySelector<HTMLAnchorElement>('a[href^="/work/"]');
    workLinkElement?.classList.toggle('rel-edit', isModified());
  });

  createEffect(() => {
    props.parent.querySelectorAll<HTMLElement>(`.${classes.replaced}`).forEach(el => {
      el.classList.toggle(classes.pending!, isLoading() || isModified());
    });
  });

  createEffect(() => {
    if (!isLoading()) {
      props.parent.dispatchEvent(new CustomEvent(workReadyEventName, {bubbles: true}));
    }
  });

  return (
    <>
      <Show when={isModified()}>
        <WorkEditDialog onSubmit={resetEditData} setSubmitForm={setSubmitForm} />{' '}
        <a
          href={workLink(props.work)}
          classList={{
            'wrap-anywhere': true,
            'rel-add': isNew,
            'rel-edit': !isNew,
          }}
        >
          {workName()}
        </a>
      </Show>

      <Show when={isLoading() || isSubmitting()}>
        <span class={classes['loading-message']}>
          {isLoading() ? 'Importing' : 'Submitting'}
          <span class={classes['loading-dots']} aria-hidden="true"></span>
        </span>
      </Show>

      <WorkWarnings track={props.track} warnings={warnings()} work={props.work} recording={props.recording} />
    </>
  );
}

export async function addWorkEditor(
  parent: Element,
  props: Omit<WorkEditDataProviderProps, 'typeInfo'>,
  elementsToReplace?: Element[]
) {
  if (parent.querySelector(`div.${classes['edit-work-button-container']}`)) {
    parent.dispatchEvent(new CustomEvent(refetchWorkEventName, {bubbles: false}));
    return;
  }

  const container = (<div class={classes['edit-work-button-container']}></div>) as HTMLDivElement;
  const removeButton = parent.querySelector<HTMLButtonElement>('button.remove-item');
  removeButton?.addEventListener('click', () => {
    container.remove();
  });
  elementsToReplace?.forEach(element => element.classList.add(classes.replaced!));
  const anchor =
    parent.querySelector<HTMLAnchorElement>(`a[href="${workLink(props.work)}"]`) ||
    (await waitForElement(
      (element): element is HTMLAnchorElement =>
        element instanceof HTMLAnchorElement && element.getAttribute('href') === workLink(props.work),
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
  render(
    () => (
      <WorkEditDataProvider typeInfo={workTypeInfo} {...props}>
        <WorkEditor work={props.work} parent={parent} track={props.track} recording={props.recording} />
      </WorkEditDataProvider>
    ),
    container
  );
}
