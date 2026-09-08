import {WorkAttributeRow} from '#ui/work-attributes-row.tsx';
import classes from '#ui/work-edit-dialog.module.css';
import {WorkEditAttribute} from '#work-edit-data.ts';
import {For} from 'solid-js';
import {createStore} from 'solid-js/store';

export function WorkAttributes(props: {attributes: WorkEditAttribute[]}) {
  const [attributes, setAttributes] = createStore(props.attributes);

  return (
    <fieldset>
      <legend>{'Work attributes'}</legend>
      <table id="work-attributes" class={`row-form ${classes['row-form']}`} data-bind="delegatedHandler: 'click'">
        <tbody>
          <For each={attributes}>
            {(attribute, index) => (
              <WorkAttributeRow attribute={attribute} index={index} setAttributes={setAttributes} />
            )}
          </For>
          <tr>
            <td />
            <td class="add-item" colSpan={2}>
              <button
                class="with-label add-item"
                onClick={() => setAttributes(attributes.length, {type_id: 0, value: '', value_id: null})}
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
