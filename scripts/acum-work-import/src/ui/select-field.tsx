// adapted from https://github.com/metabrainz/musicbrainz-server/blob/014e2fba1e02baddf2b5ee7f6b5812203ce5af00/root/static/scripts/common/components/SelectField.js

/*
 * Copyright (C) 2019 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {getSelectValue} from 'musicbrainz-ext';
import {JSX, mergeProps, splitProps} from 'solid-js';

const buildOption = (option: SelectOptionT, value: string | string[]) => {
  const values = Array.isArray(value) ? value : [value];
  return (
    <option value={option.value} selected={values.includes(String(option.value))}>
      {typeof option.label === 'function' ? option.label() : option.label}
    </option>
  );
};

const buildOptGroup = (optgroup: {optgroup: string; options: SelectOptionsT}, value: string | string[]) => (
  <optgroup label={optgroup.optgroup}>{optgroup.options.map(opt => buildOption(opt, value))}</optgroup>
);

const isStringField = (field: FieldT<string | null> | FieldT<string[] | null>): field is FieldT<string> =>
  !Array.isArray(field.value);

const buildOptions = (
  field: FieldT<string | null> | FieldT<string[] | null>,
  options: MaybeGroupedOptionsT,
  allowEmpty: boolean
) => {
  const value = isStringField(field) ? getSelectValue(field, options, allowEmpty) : field.value || [];
  if (options.grouped) {
    return options.options.map(opt => buildOptGroup(opt, value));
  }
  return options.options.map(opt => buildOption(opt, value));
};

export function SelectField(
  props: JSX.SelectHTMLAttributes<HTMLSelectElement> & {
    allowEmpty?: boolean;
    field: FieldT<string | null>;
    options: MaybeGroupedOptionsT;
    uncontrolled?: boolean;
  }
) {
  const [local, selectProps] = splitProps(
    mergeProps(
      {
        allowEmpty: true,
        uncontrolled: false,
        class: 'with-button',
        disabled: false,
        id: `id-${props.field.html_name}`,
        name: props.field.html_name,
      },
      props
    ),
    ['allowEmpty', 'field', 'options', 'uncontrolled']
  );

  return (
    <select {...selectProps} onChange={local.uncontrolled ? undefined : selectProps.onChange}>
      {local.allowEmpty ? <option value="">{'\xA0'}</option> : null}
      {buildOptions(local.field, local.options, local.allowEmpty)}
    </select>
  );
}
