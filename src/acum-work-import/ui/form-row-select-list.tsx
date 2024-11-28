// adapted from https://github.com/metabrainz/musicbrainz-server/blob/5a64d781cb84039afd4894688f12164f21dc92f0/root/static/scripts/edit/components/FormRowSelectList.js

/*
 * Copyright (C) 2017 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {For, JSX, mergeProps} from 'solid-js';
import {FormRow} from './form-row';
import {SelectField} from './select-field';
import {FieldErrors} from './field-errors';

export function FormRowSelectList<S extends {id: number}>(props: {
  addId: string;
  addLabel: string;
  getSelectField: (_: S) => FieldT<string | null>;
  hideAddButton: boolean;
  label: JSX.Element;
  onAdd: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  onEdit: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  options: MaybeGroupedOptionsT;
  removeClassName: string;
  removeLabel: string;
  repeatable: RepeatableFieldT<S>;
}) {
  props = mergeProps({hideAddButton: false}, props);
  return (
    <FormRow>
      <label>{props.label}</label>
      <div class="form-row-select-list">
        <For each={props.repeatable.field}>
          {(subfield, index) => (
            <div class="select-list-row">
              <SelectField
                field={props.getSelectField(subfield)}
                onChange={event => props.onEdit(index(), event.currentTarget.value)}
                options={props.options}
              />{' '}
              <button
                class={`nobutton icon remove-item ${props.removeClassName}`}
                onClick={() => props.onRemove(index())}
                title={props.removeLabel}
                type="button"
              />
              <FieldErrors field={props.getSelectField(subfield)} />
            </div>
          )}
        </For>
        {props.hideAddButton ? null : (
          <div class="form-row-add">
            <button class="with-label add-item" id={props.addId} onClick={props.onAdd} type="button">
              {props.addLabel}
            </button>
          </div>
        )}
      </div>
    </FormRow>
  );
}
