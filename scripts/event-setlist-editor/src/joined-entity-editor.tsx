import classes from '#editor.module.css';
import {EntityInput} from '#entity-input.tsx';
import {EntityPartsDialog} from '#entity-parts-dialog.tsx';
import {SetlistPart} from '@repo/musicbrainz-ext/setlist';
import {createSignal, Show} from 'solid-js';

export function JoinedEntityEditor(props: {
  parts: SetlistPart[];
  otherParts?: SetlistPart[];
  type: 'artist' | 'work';
  number: string;
  onChange: (parts: SetlistPart[]) => void;
}) {
  const [editing, setEditing] = createSignal(false);
  const label = () => `${props.type === 'work' ? 'Title' : 'Artist name'} ${props.number}`;
  const editLabel = () => `Edit ${props.type === 'work' ? 'works' : 'artist credit'} ${props.number}`;
  return (
    <div>
      <div class={classes.entity}>
        <Show
          when={props.parts.length <= 1 && !props.parts[0]?.joinPhrase}
          fallback={
            <div class={`autocomplete2 ${classes.lookup}`}>
              <div
                class={classes['lookup-field']}
                role="combobox"
                aria-label={`${props.type} lookup`}
                aria-haspopup="listbox"
              >
                <input
                  type="text"
                  aria-label={label()}
                  readonly
                  classList={{'lookup-performed': props.parts.every(part => Boolean(part.mbid))}}
                  value={props.parts.map(part => part.name + part.joinPhrase).join('')}
                  onKeyDown={event => {
                    if (event.key === 'Enter') setEditing(true);
                  }}
                />
                <button
                  type="button"
                  class="search"
                  aria-label={`Search ${props.type} ${props.number}`}
                  title="Use Edit to search individual entries"
                  disabled
                />
              </div>
            </div>
          }
        >
          <EntityInput
            type={props.type}
            entity={props.parts[0] ?? {name: ''}}
            label={label()}
            number={props.number}
            preserveLinkOnInput={false}
            onChange={entity => props.onChange([{...entity, joinPhrase: props.parts[0]?.joinPhrase ?? ''}])}
          />
        </Show>
        <button
          type="button"
          class="open-ac"
          aria-label={editLabel()}
          aria-haspopup="dialog"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>
      <Show when={editing()}>
        <EntityPartsDialog
          parts={props.parts}
          otherParts={props.otherParts ?? []}
          type={props.type}
          number={props.number}
          label={editLabel()}
          onDone={parts => {
            props.onChange(parts);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      </Show>
    </div>
  );
}
