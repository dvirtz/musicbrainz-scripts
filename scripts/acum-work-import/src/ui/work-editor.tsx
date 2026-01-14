import {useWorkEditData, WorkEditDataProvider} from '#ui/work-edit-data-provider.tsx';
import {WorkEditDialog} from '#ui/work-edit-dialog.tsx';
import {WorkEditData} from '#work-edit-data.ts';
import {isNewWork, workLink} from '#works.ts';
import {workLanguages, workTypes} from '@repo/musicbrainz-ext/type-info';
import {createEffect, createSignal, Show} from 'solid-js';
import {render} from 'solid-js/web';
import {WorkT} from 'typedbrainz/types';
import classes from './work-edit-dialog.module.css';

function WorkEditor(props: {work: WorkT; parent: Element}) {
  const isNew = isNewWork(props.work);
  const {isModified, workName} = useWorkEditData();
  const [isPending, setIsPending] = createSignal(isModified());

  createEffect(() => {
    const workLinkElement = props.parent.querySelector<HTMLAnchorElement>('a[href^="/work/"]');
    workLinkElement?.classList.toggle('rel-edit', isModified() && isPending());
  });

  createEffect(() => {
    props.parent.querySelectorAll<HTMLElement>(`.${classes.replaced}`).forEach(el => {
      el.classList.toggle(classes.pending!, isPending());
    });
  });

  document.getElementById('acum-work-cancel')?.addEventListener('click', () => {
    setIsPending(false);
  });

  return (
    <Show when={isPending()}>
      <WorkEditDialog onSubmit={() => setIsPending(false)} />{' '}
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
  );
}

export async function addWorkEditor(
  work: WorkT,
  editData: WorkEditData,
  originalEditData: WorkEditData,
  parent: Element,
  elementsToReplace?: Element[]
) {
  if (parent.querySelector(`div.${classes['edit-work-button-container']}`)) {
    return;
  }

  const container = (<div class={classes['edit-work-button-container']}></div>) as HTMLDivElement;
  const removeButton = parent.querySelector<HTMLButtonElement>('button.remove-item');
  removeButton?.addEventListener('click', () => {
    container.remove();
  });
  elementsToReplace?.forEach(element => element.classList.add(classes.replaced!));
  const anchor = parent.querySelector<HTMLAnchorElement>('a[href*="work"]');
  anchor?.classList.add(classes.replaced!);
  anchor?.insertAdjacentElement('afterend', container);
  const allowedTypes = Object.values(await workTypes);
  const allowedLanguages = Object.values(await workLanguages);
  render(
    () => (
      <WorkEditDataProvider
        work={work}
        editData={editData}
        originalEditData={originalEditData}
        workTypes={allowedTypes}
        workLanguages={allowedLanguages}
      >
        <WorkEditor work={work} parent={parent} />
      </WorkEditDataProvider>
    ),
    container
  );
}
