import {WorkAttributeRow} from '#ui/work-attributes-row.tsx';
import {useWorkEditData} from '#ui/work-edit-data-provider.tsx';
import classes from '#ui/work-edit-dialog.module.css';
import {For} from 'solid-js';

export function WorkAttributes() {
  const {liveEditData, setLiveEditData} = useWorkEditData();

  return (
    <fieldset>
      <legend>{'Work attributes'}</legend>
      <table id="work-attributes" class={`row-form ${classes['row-form']}`} data-bind="delegatedHandler: 'click'">
        <tbody>
          <For each={liveEditData.attributes}>
            {(attribute, index) => (
              <WorkAttributeRow attribute={attribute} index={index} setEditData={setLiveEditData} />
            )}
          </For>
          <tr>
            <td />
            <td class="add-item" colSpan={2}>
              <button
                class="with-label add-item"
                onClick={() =>
                  setLiveEditData('attributes', liveEditData.attributes.length, {
                    type_id: 0,
                    value: '',
                  })
                }
                type="button"
                title="Add work attribute"
              >
                {'Add work attribute'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </fieldset>
  );
}
