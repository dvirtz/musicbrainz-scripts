import {useWorkEditData, WorkEditDataProvider} from '#ui/work-edit-data-provider.tsx';
import {WorkEditDialog} from '#ui/work-edit-dialog.tsx';
import {WorkStateWithEditDataT} from '#work-state.ts';
import {createEffect, createSignal, Show} from 'solid-js';
import {render} from 'solid-js/web';
import {MediumRecordingStateT, RecordingT, WorkT} from 'typedbrainz/types';

function isNewWork(work: WorkT) {
  return !work.gid;
}

function workLink(work: WorkT) {
  return isNewWork(work) ? `#new-work-${work.id}` : `/work/${work.gid}`;
}

function recordingLink(recording: RecordingT) {
  return '/recording/' + recording.gid;
}

function WorkEditor(props: {workState: WorkStateWithEditDataT; originalHeader: HTMLHeadingElement}) {
  const isNew = isNewWork(props.workState.work);
  const {isModified, workName} = useWorkEditData();
  const [isPending, setIsPending] = createSignal(isModified());

  createEffect(() => {
    const workLinkElement = props.originalHeader.querySelector<HTMLAnchorElement>('a[href^="/work/"]');
    workLinkElement?.classList.toggle('rel-edit', isModified() && isPending());
  });

  createEffect(() => {
    props.originalHeader.querySelectorAll<HTMLElement>('.replaced').forEach(el => {
      el.classList.toggle('pending', isPending());
    });
  });

  document.getElementById('acum-work-cancel')?.addEventListener('click', () => {
    setIsPending(false);
  });

  return (
    <Show when={isPending()}>
      <WorkEditDialog onSubmit={() => setIsPending(false)} />{' '}
      <a
        href={workLink(props.workState.work)}
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

export function addWorkEditor(workState: WorkStateWithEditDataT, recordingState: MediumRecordingStateT) {
  const track = document.querySelector(`.track:has(a[href="${recordingLink(recordingState.recording)}"])`);
  const header = track?.querySelector<HTMLHeadingElement>(
    `.works h3:has(a[href="${workLink(workState.work)}"]):not(:has(div.edit-work-button-container))`
  );
  if (header) {
    const container = (<div class="edit-work-button-container"></div>) as HTMLDivElement;
    const removeButton = header.querySelector<HTMLButtonElement>('button.remove-item');
    removeButton?.insertAdjacentElement('afterend', container);
    removeButton?.addEventListener('click', () => {
      container.remove();
    });
    header.querySelector<HTMLButtonElement>('button.edit-item')?.classList.add('replaced');
    header.querySelector<HTMLAnchorElement>('a[href*="work"]')?.classList.add('replaced');
    render(
      () => (
        <WorkEditDataProvider workState={workState}>
          <WorkEditor workState={workState} originalHeader={header} />
        </WorkEditDataProvider>
      ),
      container
    );
  }
}
