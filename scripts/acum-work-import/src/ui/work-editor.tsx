import {Button} from '@kobalte/core/button';
import {createEffect, createSignal, JSX, Show} from 'solid-js';
import {render} from 'solid-js/web';
import {WorkStateWithEditDataT} from '../work-state';
import {useWorkEditData, WorkEditDataProvider} from './work-edit-data-provider';
import {WorkEditDialog} from './work-edit-dialog';

function isNewWork(work: WorkT) {
  return !work.gid;
}

function workLink(work: WorkT) {
  return isNewWork(work) ? `#new-work-${work.id}` : `/work/${work.gid}`;
}

function WorkEditor(props: {
  workState: WorkStateWithEditDataT;
  recordingState: MediumRecordingStateT;
  originalHeader: HTMLHeadingElement;
}) {
  const isNew = isNewWork(props.workState.work);
  const {isModified, workName} = useWorkEditData();
  const [isPending, setIsPending] = createSignal(isModified());

  const selectRecording: JSX.ChangeEventHandler<HTMLInputElement, Event> = event => {
    MB.relationshipEditor.dispatch({
      isSelected: event.currentTarget.checked,
      work: props.workState.work,
      type: 'toggle-select-work',
    });
  };

  const removeWork: JSX.EventHandler<HTMLButtonElement, MouseEvent> = () => {
    setIsPending(false);
    MB.relationshipEditor.dispatch({
      recording: props.recordingState.recording,
      type: 'remove-work',
      workState: props.workState,
    });
  };

  createEffect((previousDisplay?: string) => {
    const originalDisplay = props.originalHeader.style.display;
    props.originalHeader.style.display = isPending() ? 'none' : (previousDisplay ?? '');
    return originalDisplay;
  });

  document.getElementById('acum-work-cancel')?.addEventListener('click', () => {
    setIsPending(false);
  });

  return (
    <Show when={isPending()}>
      <input type="checkbox" class="work" checked={props.workState.isSelected} onChange={selectRecording} />{' '}
      <Button class="icon remove-item" onClick={removeWork} />
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
  const header = document.querySelector(`.works a[href="${workLink(workState.work)}"]`)?.closest('h3');
  if (header && !header.classList.contains('edit-work-button-container')) {
    const container = (<h3 class="edit-work-button-container"></h3>) as HTMLHeadingElement;
    header.parentElement?.insertBefore(container, header);
    render(
      () => (
        <WorkEditDataProvider workState={workState}>
          <WorkEditor workState={workState} recordingState={recordingState} originalHeader={header} />
        </WorkEditDataProvider>
      ),
      container
    );
  }
}
