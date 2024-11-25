// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/release/components/EditWorkDialog.js

/*
 * @flow strict-local
 * Copyright (C) 2022 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {Popover} from '@kobalte/core/popover';
import {createSignal, onCleanup} from 'solid-js';
import parseIntegerOrNull from 'src/common/lib/parse-integer-or-null';
import {buildOptionList} from 'src/common/musicbrainz/build-options-list';
import {FormRow} from './form-row';
import {SelectBox} from './select-box';
import {WorkAttributes} from './work-attributes';
import {useWorkEditData} from './work-edit-data';
import './work-edit-dialog.css';
import {WorkISWCsEditor} from './work-iswcs-editor';
import {WorkLanguageEditor} from './work-language-editor';

export function WorkEditDialog(props: {onSubmit: () => void}) {
  const {editData, setEditData, isModified, workName, submitUrl, saveEditData, workId} = useWorkEditData();
  const isNameBlank = () => /^\s*$/.test(workName());
  const [open, setOpen] = createSignal(false);

  // need forceMount to keep forms in the DOM even when the dialog is closed so they can be submitted
  // this requires manually handling escape key to close the dialog
  const onEscapeKeyDown = (ev: KeyboardEvent) => {
    if (open() && ev.key === 'Escape') {
      setOpen(false);
    }
  };

  document.addEventListener('keydown', onEscapeKeyDown);
  onCleanup(() => document.removeEventListener('keydown', onEscapeKeyDown));

  return (
    <Popover open={open()} onOpenChange={setOpen} forceMount={true}>
      <Popover.Trigger class="icon edit-item" />
      <Popover.Content
        class="dialog popover work-dialog"
        onEscapeKeyDown={ev => {
          ev.preventDefault();
        }}
      >
        <Popover.Arrow />
        <form
          id={`submit-work-${workId()}`}
          action={submitUrl()}
          method="post"
          classList={{'edit-work': true, 'modified': isModified()}}
          onSubmit={props.onSubmit}
        >
          <h1>{'Edit work'}</h1>
          <div class="half-width">
            <fieldset>
              <legend>Work details</legend>
              <FormRow>
                <label class="required" for="id-edit-work.name" id="label-id-edit-work.name">
                  Name:
                </label>
                <input
                  id="id-edit-work.name"
                  name="edit-work.name"
                  required={true}
                  type="text"
                  value={editData.name}
                  onChange={ev => setEditData('name', ev.target.value)}
                />
              </FormRow>
              <FormRow>
                <label for="id-edit-work.comment" id="label-id-edit-work.comment">
                  Disambiguation:
                </label>
                <input id="id-edit-work.comment" name="edit-work.comment" type="text" value={editData.comment} />
              </FormRow>
              <FormRow>
                <label class="" for="id-edit-work.type_id" id="label-id-edit-work.type_id">
                  Type:
                </label>

                <SelectBox
                  id="id-edit-work.type_id"
                  name="edit-work.type_id"
                  options={buildOptionList(Object.values(MB.linkedEntities.work_type))}
                  value={editData.type_id || undefined}
                  onChange={workType => setEditData('type_id', parseIntegerOrNull(workType))}
                />
              </FormRow>
              <WorkLanguageEditor />
              <WorkISWCsEditor />
            </fieldset>
            <WorkAttributes />
          </div>
          <div class="buttons" style={{'margin-top': '1em'}}>
            <Popover.CloseButton class="negative">{'Cancel'} </Popover.CloseButton>
            <Popover.CloseButton class="positive" disabled={isNameBlank()} onClick={saveEditData}>
              {'Done'}
            </Popover.CloseButton>
          </div>
        </form>
      </Popover.Content>
    </Popover>
  );
}
