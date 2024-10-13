// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/edit/components/Multiselect.js

import {For, Show, JSX} from 'solid-js';
import {createStore} from 'solid-js/store';
import {Autocomplete, AutocompleteStateT} from './autocomplete';

export type MultiselectValueStateT<V extends AutocompleteEntityItemT> = {
  autocomplete: AutocompleteStateT<V>;
  key: number;
  removed: boolean;
  children?: JSX.Element;
};

export type MultiselectStateT<V extends AutocompleteEntityItemT, VS extends MultiselectValueStateT<V>> = {
  addLabel: string;
  max: number | null;
  values: ReadonlyArray<VS>;
  createMultiselectValue: (_: MultiselectStateT<V, VS>) => VS;
};

export const ATTR_VALUE_LABEL_STYLE = {
  clear: 'both',
};

export function accumulateMultiselectValues<V extends AutocompleteEntityItemT, VS extends MultiselectValueStateT<V>>(
  values: ReadonlyArray<VS>
): ReadonlyArray<V> {
  return values.reduce((accum: Array<V> /* , valueState */) => {
    /* const item = valueState.autocomplete.selectedItem?.entity;
    if (item) {
      accum.push(item);
    } */
    return accum;
  }, []);
}

export function updateValue<V extends AutocompleteEntityItemT, VS extends MultiselectValueStateT<V>>(
  values: ReadonlyArray<VS>,
  valueKey: number,
  callback: (_: VS) => VS
): ReadonlyArray<VS> {
  return values.map(x => {
    if (x.key === valueKey) {
      return callback(x);
    }
    return x;
  });
}

function Multiselect<V extends AutocompleteEntityItemT, VS extends MultiselectValueStateT<V>>(
  props: MultiselectStateT<V, VS>
) {
  const [values, setValues] = createStore(props.values);

  // We can remove "[removed]" rows now that focus has shifted.
  const handleAdd = () => setValues([...values.filter(x => !x.removed), props.createMultiselectValue(props)]);

  const rowCount = values.filter(v => !v.removed).length;

  return (
    <>
      <For each={values}>
        {value => (
          <div class="multiselect-value" {...{key: value.key}}>
            {/*
             * Removed entries are kept in the list so that focus isn't
             * lost and/or doesn't need to be shifted to an unrelated row;
             * neither situation is accessible.
             */}
            <Show
              when={value.removed}
              fallback={
                <>
                  <Autocomplete {...value.autocomplete} />
                  <Show when={value.children}>{value.children}</Show>
                </>
              }
            >
              '[removed]'
            </Show>
            <button
              aria-disabled={value.removed}
              class="remove-item icon"
              onClick={() => {
                value.removed = true;
              }}
              title={'Remove'}
              type="button"
            />
          </div>
        )}
      </For>
      <Show when={props.max == null || props.max < rowCount}>
        <button class="add-item with-label" onClick={handleAdd} type="button">
          {' ' + props.addLabel}
        </button>
      </Show>
    </>
  );
}

export default Multiselect;
