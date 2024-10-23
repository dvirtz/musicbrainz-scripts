import {Portal, render} from 'solid-js/web';
import {EditWorkDialog} from './edit-work-dialog';
import {createSignal, Show} from 'solid-js';
import {createInitialState as createEditWorkDialogState} from './edit-work-dialog';

export function EditWorkButton(props: {work: WorkT}) {
  const [show, setShow] = createSignal(false);

  return (
    <button class="icon edit-item" aria-haspopup="dialog" type="button" onClick={() => setShow(true)}>
      <Show when={show()}>
        <Portal>
          <EditWorkDialog {...createEditWorkDialogState(props.work, () => setShow(false))} />
        </Portal>
      </Show>
    </button>
  );
}

export function addEditWorkButton(work: WorkT) {
  const anchor = document.querySelector(`.works a[href="/work/${work.gid}"]`);
  if (anchor && !anchor.previousElementSibling?.classList.contains('edit-work-button-container')) {
    const container = document.createElement('div');
    container.className = 'edit-work-button-container';
    container.style.display = 'inline-block';
    anchor.insertAdjacentElement('beforebegin', container);
    render(() => <EditWorkButton work={work} />, container);
  }
}
