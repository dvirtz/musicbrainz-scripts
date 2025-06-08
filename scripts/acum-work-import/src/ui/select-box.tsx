// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/release/components/WorkTypeSelect.js

/*
 * Copyright (C) 2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {OptionListT} from '@repo/musicbrainz-ext/build-options-list';
import {parseInteger} from '@repo/musicbrainz-ext/parse-integer';
import {For, Show, splitProps} from 'solid-js';

export type SelectBoxStateT = {
  name?: string;
  id?: string;
  label?: string;
  options: OptionListT;
  value?: string | number;
  onChange: (_: number) => void;
};

export function SelectBox(props: SelectBoxStateT) {
  const [local, children] = splitProps(props, ['label']);
  return (
    <Show when={local.label} fallback={<StrippedSelectBox {...children} />}>
      <tr>
        <td class="section">{local.label}</td>
        <td>
          <StrippedSelectBox {...children} />
        </td>
      </tr>
    </Show>
  );
}

function StrippedSelectBox(props: Omit<SelectBoxStateT, 'label'>) {
  const [local, selectProps] = splitProps(props, ['options', 'onChange']);
  return (
    <select onChange={ev => local.onChange(parseInteger(ev.target.value))} {...selectProps}>
      <option value="">{'\xA0'}</option>
      <For each={local.options}>
        {option => (
          <option value={option.value} selected={option.value == selectProps.value}>
            {option.text}
          </option>
        )}
      </For>
    </select>
  );
}
