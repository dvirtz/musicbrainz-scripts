// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/release/components/EditWorkDialog.js

/*
 * @flow strict-local
 * Copyright (C) 2022 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {FormRow} from '#ui/form-row.tsx';
import {SelectBox} from '#ui/select-box.tsx';
import {WorkAttributes} from '#ui/work-attributes.tsx';
import {useWorkEditData} from '#ui/work-edit-data-provider.tsx';
import {WorkISWCsEditor} from '#ui/work-iswcs-editor.tsx';
import {WorkLanguageEditor} from '#ui/work-language-editor.tsx';
import {Popover} from '@kobalte/core/popover';
import {buildOptionList} from '@repo/musicbrainz-ext/build-options-list';
import {parseIntegerOrNull} from '@repo/musicbrainz-ext/parse-integer-or-null';
import {createSignal, onCleanup} from 'solid-js';
import classes from './work-edit-dialog.module.css';

export function WorkEditDialog(props: {onSubmit: () => void}) {
  const {editData, setEditData, isModified, workName, submitUrl, saveEditData, restoreEditData, workId} =
    useWorkEditData();
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
        class={`dialog popover work-dialog ${classes['work-dialog']}`}
        onEscapeKeyDown={ev => {
          ev.preventDefault();
        }}
      >
        <Popover.Arrow />
        <form
          id={`submit-work-${workId()}`}
          action={submitUrl()}
          method="post"
          classList={{'modified': isModified()}}
          onSubmit={props.onSubmit}
        >
          <h1>{'Edit work'}</h1>
          <div class={`half-width ${classes['half-width']}`}>
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
                  options={buildOptionList(Object.values(MB?.linkedEntities.work_type || {}))}
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
            <Popover.CloseButton class="negative" onClick={restoreEditData}>
              {'Cancel'}{' '}
            </Popover.CloseButton>
            <Popover.CloseButton class="positive" disabled={isNameBlank()} onClick={saveEditData}>
              {'Done'}
            </Popover.CloseButton>
          </div>
        </form>
      </Popover.Content>
    </Popover>
  );
}
