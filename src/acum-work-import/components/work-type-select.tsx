// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/release/components/WorkTypeSelect.js

import {For} from 'solid-js';
import {buildOptionList} from '../../common/build-options-list';
import parseIntegerOrNull from '../../common/parse-integer-or-null';

function workTypeValue(workType: number | null): string {
  if (workType == null) {
    return '';
  }
  return String(workType);
}

export function WorkTypeSelect(props: {workType: number | null; onChange: (_: number | null) => void}) {
  const workTypeOptions: OptionListT = (() => {
    const workTypes = Object.values(MB.linkedEntities.work_type);

    return buildOptionList(workTypes);
  })();

  return (
    <tr>
      <td class="section">{'Work type:'}</td>
      <td>
        <select
          id="work-type"
          onChange={event => props.onChange(parseIntegerOrNull(event.currentTarget.value))}
          value={workTypeValue(props.workType)}
        >
          <option value="">{'\xA0'}</option>
          <For each={workTypeOptions}>{option => <option value={option.value}>{option.text}</option>}</For>
        </select>
      </td>
    </tr>
  );
}
