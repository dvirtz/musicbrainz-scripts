import {EntityInput} from '#entity-input.tsx';
import {EntityPreview} from '#entity-preview.tsx';
import classes from '#editor.module.css';
import {SetlistEntity, SetlistPart} from '@repo/musicbrainz-ext/setlist';
import {createSignal, Index, onMount} from 'solid-js';

export function EntityPartsDialog(props: {
  parts: SetlistPart[];
  otherParts: SetlistPart[];
  type: 'artist' | 'work';
  number: string;
  label: string;
  onDone: (parts: SetlistPart[]) => void;
  onClose: () => void;
}) {
  const [parts, setParts] = createSignal<SetlistPart[]>(
    props.parts.length
      ? props.parts.map(part => ({...part, entityName: part.entityName ?? part.name}))
      : [{name: '', entityName: '', joinPhrase: ''}]
  );
  const entityLabel = props.type === 'work' ? 'Work' : 'Artist';
  function move(index: number, direction: number) {
    const updated = parts().map(part => ({...part}));
    const target = index + direction;
    [updated[index], updated[target]] = [updated[target]!, updated[index]!];
    setParts(updated);
  }
  function lookup(index: number, entity: SetlistEntity) {
    const part = parts()[index]!;
    const previousName = part.entityName ?? part.name;
    change(index, {
      mbid: entity.mbid,
      entityName: entity.name,
      name: !part.name || part.name === previousName ? entity.name : part.name,
    });
  }
  let dialog!: HTMLDialogElement;
  onMount(() => dialog.showModal());
  function close() {
    dialog.close();
    props.onClose();
  }
  function change(index: number, patch: Partial<SetlistPart>) {
    setParts(parts => parts.map((part, position) => (position === index ? {...part, ...patch} : part)));
  }
  return (
    <dialog
      ref={dialog}
      id="artist-credit-bubble"
      class={`dialog popover ${classes.dialog} ${classes['parts-dialog']}`}
      aria-label={props.label}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = [...dialog.querySelectorAll<HTMLElement>('input, button, a[href]')].filter(
          control => !control.matches(':disabled')
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && event.target === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && event.target === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={event => {
        event.preventDefault();
        close();
      }}
    >
      <table
        class={`table-condensed ${classes['credit-table']}`}
        aria-label={props.type === 'work' ? 'Works' : 'Artist credits'}
      >
        <thead>
          <tr>
            <td colspan="4" id="ac-docs" class={classes['dialog-help']}>
              Use the following fields to enter {props.type} name variations and multiple {props.type}s with join
              phrases.
            </td>
          </tr>
          <tr>
            <td colspan="4" id="ac-preview-cell" class={classes['dialog-help']}>
              Preview: <EntityPreview type="work" parts={props.type === 'work' ? parts() : props.otherParts} />
              {' by '}
              <EntityPreview type="artist" parts={props.type === 'artist' ? parts() : props.otherParts} />
            </td>
          </tr>
          <tr class="artist-credit-header">
            <th>{entityLabel} in MusicBrainz:</th>
            <th>{entityLabel} as credited:</th>
            <th>Join phrase:</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <Index each={parts()}>
            {(part, index) => {
              const number = () => (index === 0 ? props.number : `${props.number}.${index + 1}`);
              return (
                <tr>
                  <td>
                    <EntityInput
                      type={props.type}
                      entity={{name: part().entityName ?? part().name, mbid: part().mbid}}
                      label={`${entityLabel} in MusicBrainz ${number()}`}
                      number={number()}
                      preserveLinkOnInput={false}
                      onChange={entity => lookup(index, entity)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      aria-label={`${entityLabel} as credited ${number()}`}
                      value={part().name}
                      onInput={event => change(index, {name: event.currentTarget.value})}
                      onKeyDown={event => {
                        if (event.key === 'Enter') event.preventDefault();
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      aria-label={`${props.type === 'work' ? 'Work join phrase' : 'Join phrase'} ${number()}`}
                      placeholder="Join phrase"
                      value={part().joinPhrase}
                      onKeyDown={event => {
                        if (event.key === 'Enter') event.preventDefault();
                      }}
                      onInput={event => change(index, {joinPhrase: event.currentTarget.value})}
                    />
                  </td>
                  <td class="nowrap">
                    <button
                      type="button"
                      class="icon move-down"
                      aria-label={`Move ${props.type} ${number()} down`}
                      title={`Move ${props.type} down`}
                      disabled={index === parts().length - 1}
                      onClick={() => move(index, 1)}
                    />
                    <button
                      type="button"
                      class="icon move-up"
                      aria-label={`Move ${props.type} ${number()} up`}
                      title={`Move ${props.type} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    />
                    <button
                      type="button"
                      class="icon remove-item remove-artist-credit"
                      title={`Remove ${props.type} ${number()}`}
                      aria-label={`Remove ${props.type} ${number()}`}
                      onClick={() => {
                        const remaining = parts()
                          .filter((_, position) => position !== index)
                          .map(part => ({...part}));
                        if (index === parts().length - 1 && remaining.length)
                          remaining[remaining.length - 1]!.joinPhrase = '';
                        setParts(remaining.length ? remaining : [{name: '', entityName: '', joinPhrase: ''}]);
                      }}
                    />
                  </td>
                </tr>
              );
            }}
          </Index>
          <tr>
            <td colspan="4" class="align-right">
              <button
                type="button"
                class="add-item with-label"
                aria-label={`Add ${props.type} to ${props.type === 'work' ? 'item' : 'song'} ${props.number}`}
                onClick={() => {
                  const updated = parts().map(part => ({...part}));
                  if (props.type === 'work' && updated.length && !updated[updated.length - 1]!.joinPhrase)
                    updated[updated.length - 1]!.joinPhrase = ' / ';
                  setParts([...updated, {name: '', entityName: '', joinPhrase: ''}]);
                }}
              >
                Add {props.type === 'artist' ? 'artist credit' : 'work'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class={`buttons ${classes['dialog-buttons']}`}>
        <button
          type="button"
          disabled={!parts().some(part => part.mbid)}
          onClick={() => setParts(parts => parts.map(part => ({...part, mbid: undefined, entityName: undefined})))}
        >
          Unlink
        </button>
        <button
          type="button"
          class="positive"
          onClick={() => {
            dialog.close();
            props.onDone(parts().map(part => ({...part})));
          }}
        >
          Done
        </button>
        <button type="button" onClick={close}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}
