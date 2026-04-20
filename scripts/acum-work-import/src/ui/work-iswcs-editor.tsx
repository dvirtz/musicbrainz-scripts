import {FormRow} from '#ui/form-row.tsx';
import classes from '#ui/work-edit-dialog.module.css';
import {removeAtIndex} from '@repo/common/remove-at-index';
import {For} from 'solid-js';
import {createStore} from 'solid-js/store';

export function WorkISWCsEditor(props: {iswcs: string[]}) {
  const [iswcs, setIswcs] = createStore(props.iswcs);

  return (
    <FormRow>
      <label>ISWCs:</label>
      <div class={`form-row-text-list ${classes['form-row-text-list']}`}>
        <For each={iswcs}>
          {(iswc, index) => (
            <div class={`text-list-row ${classes['text-list-row']}`}>
              <input
                name={`edit-work.iswcs.${index()}`}
                class="value with-button"
                type="text"
                value={iswc}
                onInput={event => setIswcs(index(), event.currentTarget.value)}
              />
              <button
                class="nobutton icon remove-item"
                onClick={() => setIswcs(removeAtIndex(iswcs, index()))}
                type="button"
                title="Remove ISWC"
              />
            </div>
          )}
        </For>
        <div class={`form-row-add ${classes['form-row-add']}`}>
          <button class="add-item with-label" onClick={() => setIswcs(iswcs.length, '')} type="button" title="Add ISWC">
            {'Add ISWC'}
          </button>
        </div>
      </div>
    </FormRow>
  );
}
