import {For, Suspense} from 'solid-js';
import {useWorkEditData} from './work-edit-data-provider';
import {WorkAttributeRow} from './work-attributes-row';

export function WorkAttributes() {
  const {editData, setEditData} = useWorkEditData();

  return (
    <fieldset>
      <legend>{'Work attributes'}</legend>
      <table id="work-attributes" class="row-form" data-bind="delegatedHandler: 'click'">
        <tbody>
          <For each={editData.attributes}>
            {(attribute, index) => (
              <Suspense
                fallback={
                  <tr>
                    <td>Loading...</td>
                  </tr>
                }
              >
                <WorkAttributeRow attribute={attribute} index={index} setEditData={setEditData} />
              </Suspense>
            )}
          </For>
          <tr>
            <td />
            <td class="add-item" colSpan={2}>
              <button
                class="with-label add-item"
                onClick={() =>
                  setEditData('attributes', editData.attributes.length, {
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
