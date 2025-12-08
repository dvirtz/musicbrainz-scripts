import {FormRow} from '#ui/form-row.tsx';
import {useWorkEditData} from '#ui/work-edit-data-provider.tsx';
import {removeAtIndex} from '@repo/common/remove-at-index';
import {For} from 'solid-js';
import classes from './work-edit-dialog.module.css';

export function WorkISWCsEditor() {
  const {editData, setEditData} = useWorkEditData();

  return (
    <FormRow>
      <label>ISWCs:</label>
      <div class={`form-row-text-list ${classes['form-row-text-list']}`}>
        <For each={editData.iswcs}>
          {(iswc, index) => (
            <div class={`text-list-row ${classes['text-list-row']}`}>
              <input
                name={`edit-work.iswcs.${index()}`}
                class="value with-button"
                onChange={event => setEditData('iswcs', index(), event.currentTarget.value)}
                type="text"
                value={iswc}
              />
              <button
                class="nobutton icon remove-item"
                onClick={() => setEditData('iswcs', iswcs => removeAtIndex(iswcs, index()))}
                title="Remove ISWC"
              />
            </div>
          )}
        </For>
        <div class={`form-row-add ${classes['form-row-add']}`}>
          <button
            class="add-item with-label"
            onClick={() => setEditData('iswcs', editData.iswcs.length, '')}
            type="button"
            title="Add ISWC"
          >
            {'Add ISWC'}
          </button>
        </div>
      </div>
    </FormRow>
  );
}
