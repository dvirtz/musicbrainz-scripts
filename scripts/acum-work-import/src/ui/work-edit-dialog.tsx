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
import classes from '#ui/work-edit-dialog.module.css';
import {WorkISWCsEditor} from '#ui/work-iswcs-editor.tsx';
import {WorkLanguageEditor} from '#ui/work-language-editor.tsx';
import {formToEditData} from '#work-edit-data.ts';
import {Button} from '@kobalte/core/button';
import {Popover} from '@kobalte/core/popover';
import {buildOptionList} from '@repo/musicbrainz-ext/build-options-list';
import {Accessor, createSignal} from 'solid-js';

export function WorkEditDialog() {
  const {isModified, saveEditData, savedEditData, workId, workTypes} = useWorkEditData();
  const [open, setOpen] = createSignal(false);
  const [name, setName] = createSignal(savedEditData().name);
  const isNameBlank: Accessor<boolean> = () => /^\s*$/.test(name());

  return (
    <Popover open={open()} onOpenChange={setOpen}>
      <Popover.Trigger class="icon edit-item" />
      <Popover.Content class={`dialog popover work-dialog ${classes['work-dialog']}`}>
        <Popover.Arrow />
        <form
          id={`edit-work-${workId()}`}
          classList={{'modified': isModified()}}
          onSubmit={event => {
            event.preventDefault();
            if (isNameBlank()) {
              return;
            }
            saveEditData(formToEditData(event.currentTarget));
            setOpen(false);
          }}
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
                  value={savedEditData().name}
                  onInput={ev => setName(ev.currentTarget.value)}
                />
              </FormRow>
              <FormRow>
                <label for="id-edit-work.comment" id="label-id-edit-work.comment">
                  Disambiguation:
                </label>
                <input id="id-edit-work.comment" name="edit-work.comment" type="text" value={savedEditData().comment} />
              </FormRow>
              <FormRow>
                <label class="" for="id-edit-work.type_id" id="label-id-edit-work.type_id">
                  Type:
                </label>

                <SelectBox
                  id="id-edit-work.type_id"
                  name="edit-work.type_id"
                  options={buildOptionList(workTypes())}
                  value={savedEditData().type_id || undefined}
                />
              </FormRow>
              <WorkLanguageEditor languages={savedEditData().languages} />
              <WorkISWCsEditor iswcs={savedEditData().iswcs} />
            </fieldset>
            <WorkAttributes attributes={savedEditData().attributes} />
          </div>
          <div class="buttons" style={{'margin-top': '1em'}}>
            <Popover.CloseButton type="button" class="negative" aria-label="Cancel">
              {'Cancel'}{' '}
            </Popover.CloseButton>
            <Button type="submit" class="positive" aria-label="Done" disabled={isNameBlank()}>
              {'Done'}
            </Button>
          </div>
        </form>
      </Popover.Content>
    </Popover>
  );
}
