// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/release/components/EditWorkDialog.js

import {Show} from 'solid-js';
import useDialogEnterKeyHandler from '../../common/use-dialog-enter-key-handler';
import {DialogButtons} from './dialog-buttons';
import {accumulateMultiselectValues} from './multiselect';
import WorkLanguageMultiselect, {
  MultiselectLanguageStateT,
  createInitialState as createWorkLanguagesState,
} from './work-language-multiselect';
import {WorkTypeSelect} from './work-type-select';

type EditWorkDialogStateT = {
  work: WorkT;
  languages: MultiselectLanguageStateT;
  name: string;
  workType: number | null;
  closeDialog: () => void;
};

export function createInitialState(work: WorkT, closeDialog: () => void): EditWorkDialogStateT {
  return {
    work,
    languages: createWorkLanguagesState(work.languages.map((workLanguage: WorkLanguageT) => workLanguage.language)),
    name: work.name,
    workType: work.typeID,
    closeDialog,
  };
}

export function EditWorkDialog(props: EditWorkDialogStateT) {
  const isNameBlank = /^\s*$/.test(props.name);

  const acceptDialog = () => {
    if (isNameBlank) {
      return;
    }

    MB.relationshipEditor.dispatch({
      languages: accumulateMultiselectValues(props.languages.values),
      name: props.name,
      type: 'accept-edit-work-dialog',
      work: props.work,
      workType: props.workType,
    });

    props.closeDialog();
  };

  const handleKeyDown = useDialogEnterKeyHandler(acceptDialog);

  return (
    <div class="form" onKeyDown={handleKeyDown}>
      <h1>{'Edit work'}</h1>
      <table class="work-details">
        <tbody>
          <tr>
            <td class="section">{'Name:'}</td>
            <td>
              <input onChange={event => (props.name = event.currentTarget.value)} type="text" value={props.name} />
              <Show when={isNameBlank}>
                <div aria-atomic="true" class="error" role="alert">
                  {'Required field.'}
                </div>
              </Show>
            </td>
          </tr>
          <WorkTypeSelect workType={props.workType} onChange={workType => (props.workType = workType)} />
          <WorkLanguageMultiselect {...props.languages} />
        </tbody>
      </table>
      <DialogButtons isDoneDisabled={isNameBlank} onCancel={props.closeDialog} onDone={acceptDialog} />
    </div>
  );
}
