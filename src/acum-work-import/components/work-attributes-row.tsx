import PLazy from 'p-lazy';
import {Accessor, createResource, createSignal, Show} from 'solid-js';
import {SetStoreFunction} from 'solid-js/store';
import {tryFetchJSON} from 'src/common/lib/fetch';
import parseIntegerOrNull from 'src/common/lib/parse-integer-or-null';
import {removeAtIndex} from 'src/common/lib/remove-at-index';
import {buildOptionList, buildOptionListFromKeys} from 'src/common/musicbrainz/build-options-list';
import {SelectBox} from './select-box';
import {WorkEditData} from './work-edit-data';

function byId<T extends {id: number}>(list: ReadonlyArray<T>) {
  return Object.fromEntries(list.map(item => [item.id, item])) as Record<number, T>;
}

const lazyAttributeTypes = PLazy.from(async () => {
  const workAttributeTypes =
    Object.keys(MB.linkedEntities.work_attribute_type).length > 0
      ? MB.linkedEntities.work_attribute_type
      : byId(
          (
            await tryFetchJSON<{
              work_attribute_type_list: [WorkAttributeTypeT];
            }>('/ws/js/type-info/work_attribute_type')
          )?.work_attribute_type_list ?? []
        );
  return buildOptionList(Object.values(workAttributeTypes));
});

const lazyAllowedValuesByID = PLazy.from(async () => {
  const workAttributeAllowedValues = byId(
    (
      await tryFetchJSON<{
        work_attribute_type_allowed_value_list: [WorkAttributeTypeAllowedValueT];
      }>('/ws/js/type-info/work_attribute_type_allowed_value')
    )?.work_attribute_type_allowed_value_list || []
  );
  return new Map(
    Map.groupBy(Object.values(workAttributeAllowedValues), x => x.workAttributeTypeID)
      .entries()
      .map(([typeId, children]) => [typeId, buildOptionListFromKeys(children, 'value', 'id')])
  );
});

export function WorkAttributeRow(props: {
  attribute: {type_id: number; value: string};
  index: Accessor<number>;
  setEditData: SetStoreFunction<WorkEditData>;
}) {
  const [typeId, setTypeId] = createSignal(props.attribute.type_id);
  const [attributeTypes] = createResource(async () => await lazyAttributeTypes, {initialValue: []});
  const [allowedValues] = createResource(typeId, async typeId => (await lazyAllowedValuesByID).get(typeId));

  return (
    <tr>
      <td>
        <SelectBox
          name={`edit-work.attributes.${props.index()}.type_id`}
          options={attributeTypes()}
          value={attributeTypes().find(type => type.value === props.attribute.type_id)?.value}
          onChange={type => {
            setTypeId(type);
            props.setEditData('attributes', props.index(), 'type_id', parseIntegerOrNull(type) || 0);
          }}
        />
      </td>
      <td>
        <Show
          when={typeof allowedValues() !== 'undefined'}
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
            options={allowedValues()!}
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
