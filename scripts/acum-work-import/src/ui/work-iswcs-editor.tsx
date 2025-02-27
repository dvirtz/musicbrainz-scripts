import {removeAtIndex} from 'common';
import {For} from 'solid-js';
import {FormRow} from './form-row';
import {useWorkEditData} from './work-edit-data-provider';

export function WorkISWCsEditor() {
  const {editData, setEditData} = useWorkEditData();

  return (
    <FormRow>
      <label>ISWCs:</label>
      <div class="form-row-text-list">
        <For each={editData.iswcs}>
          {(iswc, index) => (
            <div class="text-list-row">
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
        <div class="form-row-add">
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
