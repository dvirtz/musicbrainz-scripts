import {SelectBox} from '#ui/select-box.tsx';
import {useWorkEditData} from '#ui/work-edit-data-provider.tsx';
import {WorkEditData} from '#work-edit-data.ts';
import {removeAtIndex} from '@repo/common/remove-at-index';
import {parseIntegerOrNull} from '@repo/musicbrainz-ext/parse-integer-or-null';
import {Accessor, createMemo, createSignal, Show} from 'solid-js';
import {SetStoreFunction} from 'solid-js/store';

export function WorkAttributeRow(props: {
  attribute: {type_id: number; value: string};
  index: Accessor<number>;
  setEditData: SetStoreFunction<WorkEditData>;
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
            props.setEditData('attributes', props.index(), 'type_id', parseIntegerOrNull(type) || 0);
          }}
        />
      </td>
      <td>
        <Show
          when={workAttributeAllowedValues().get(typeId()) !== undefined}
          fallback={
            <input
              type="text"
              name={`edit-work.attributes.${props.index()}.value`}
              value={props.attribute.value}
              onChange={event => props.setEditData('attributes', props.index(), 'value', event.currentTarget.value)}
            />
          }
        >
          <SelectBox
            name={`edit-work.attributes.${props.index()}.value`}
            options={allowedValues() ?? []}
            value={allowedValues()?.find(x => x.text === props.attribute.value)?.value}
            onChange={value =>
              props.setEditData(
                'attributes',
                props.index(),
                'value',
                allowedValues()?.find(x => x.value == value)?.text || ''
              )
            }
          />
        </Show>
      </td>
      <td>
        <button
          class="nobutton icon remove-item"
          onClick={() => props.setEditData('attributes', attributes => removeAtIndex(attributes, props.index()))}
          title="Remove attribute"
        />
      </td>
    </tr>
  );
}
