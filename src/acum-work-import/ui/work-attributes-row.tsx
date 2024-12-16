import PLazy from 'p-lazy';
import {Accessor, createResource, createSignal, Show} from 'solid-js';
import {SetStoreFunction} from 'solid-js/store';
import parseIntegerOrNull from 'src/common/lib/parse-integer-or-null';
import {removeAtIndex} from 'src/common/lib/remove-at-index';
import {buildOptionList, buildOptionListFromKeys} from 'src/common/musicbrainz/build-options-list';
import {workAttributeAllowedValues, workAttributeTypes} from 'src/common/musicbrainz/type-info';
import {SelectBox} from './select-box';
import {WorkEditData} from './work-edit-data';

const lazyAttributeTypes = PLazy.from(async () => buildOptionList(Object.values(await workAttributeTypes)));

const lazyAllowedValuesByID = PLazy.from(async () => {
  return new Map(
    Map.groupBy(Object.values(await workAttributeAllowedValues), x => x.workAttributeTypeID)
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
