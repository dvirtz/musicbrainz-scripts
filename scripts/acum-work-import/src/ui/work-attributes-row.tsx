import {SelectBox} from '#ui/select-box.tsx';
import {useWorkEditData} from '#ui/work-edit-data-provider.tsx';
import {WorkEditAttribute} from '#work-edit-data.ts';
import {removeAtIndex} from '@repo/common/remove-at-index';
import {Accessor, createMemo, createSignal, Show} from 'solid-js';
import {SetStoreFunction} from 'solid-js/store';

export function WorkAttributeRow(props: {
  attribute: WorkEditAttribute;
  index: Accessor<number>;
  setAttributes: SetStoreFunction<WorkEditAttribute[]>;
}) {
  const {workAttributeTypes, workAttributeAllowedValues} = useWorkEditData();
  const [typeId, setTypeId] = createSignal(props.attribute.type_id);
  const allowedValues = createMemo(() => workAttributeAllowedValues().get(typeId()));

  return (
    <tr>
      <td>
        <SelectBox
          name={`edit-work.attributes.${props.index()}.type_id`}
          options={workAttributeTypes()}
          value={workAttributeTypes().find(type => type.value === props.attribute.type_id)?.value}
          onChange={type => {
            setTypeId(type);
            props.setAttributes(props.index(), 'type_id', type);
          }}
        />
      </td>
      <td>
        <Show
          when={allowedValues() !== undefined}
          fallback={
            <input
              type="text"
              name={`edit-work.attributes.${props.index()}.value`}
              value={props.attribute.value}
              onInput={event => props.setAttributes(props.index(), 'value', event.currentTarget.value)}
            />
          }
        >
          <SelectBox
            name={`edit-work.attributes.${props.index()}.value`}
            options={allowedValues() ?? []}
            value={props.attribute.value_id ?? undefined}
            onChange={value => {
              const option = allowedValues()?.find(item => item.value === value);
              props.setAttributes(props.index(), {value: option?.text ?? '', value_id: value || null});
            }}
          />
        </Show>
      </td>
      <td>
        <button
          class="nobutton icon remove-item"
          onClick={() => props.setAttributes(attributes => removeAtIndex(attributes, props.index()))}
          type="button"
          title="Remove attribute"
        />
      </td>
    </tr>
  );
}
