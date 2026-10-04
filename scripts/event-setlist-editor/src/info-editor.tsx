import classes from '#editor.module.css';
import {createSignal, onMount, Show} from 'solid-js';

function InfoDialog(props: {value: string; label: string; onDone: (value: string) => void; onClose: () => void}) {
  const [value, setValue] = createSignal(props.value);
  let dialog!: HTMLDialogElement;
  onMount(() => dialog.showModal());
  function close() {
    dialog.close();
    props.onClose();
  }
  return (
    <dialog
      ref={dialog}
      class={`dialog popover ${classes.dialog} ${classes['info-dialog']}`}
      aria-label={props.label}
      onCancel={event => {
        event.preventDefault();
        close();
      }}
    >
      <label>
        {props.label}
        <textarea rows="5" value={value()} onInput={event => setValue(event.currentTarget.value)} />
      </label>
      <div class="buttons">
        <button
          type="button"
          class="button"
          onClick={() => {
            props.onDone(value());
            close();
          }}
        >
          Done
        </button>
        <button type="button" class="button" onClick={close}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}

export function InfoEditor(props: {value: string; label: string; onChange: (value: string) => void}) {
  const [editing, setEditing] = createSignal(false);
  return (
    <div class={classes['info-editor']}>
      <button
        type="button"
        class="icon add-item"
        aria-label={`${props.value ? 'Edit' : 'Add'} ${props.label.toLowerCase()}`}
        title={props.value || props.label}
        aria-haspopup="dialog"
        onClick={() => setEditing(true)}
      />
      <Show when={editing()}>
        <InfoDialog value={props.value} label={props.label} onDone={props.onChange} onClose={() => setEditing(false)} />
      </Show>
    </div>
  );
}
