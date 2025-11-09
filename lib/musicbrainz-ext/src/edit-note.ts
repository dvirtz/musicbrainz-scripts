import dedent from 'dedent';

import {isReleaseRelationshipEditor} from 'typedbrainz';

export function addEditNote(message: string, document: Document = window.document) {
  const textArea = document.querySelector<HTMLTextAreaElement>('textarea.edit-note');
  const note = editNoteFormat(message);
  if (textArea && !textArea?.value.includes(message)) {
    const newNote = `${textArea?.value}\n${note}`;
    if (MB?.relationshipEditor && isReleaseRelationshipEditor(MB?.relationshipEditor)) {
      MB?.relationshipEditor?.dispatch({type: 'update-edit-note', editNote: newNote});
    } else {
      textArea.value = newNote;
      textArea.dispatchEvent(new Event('change', {bubbles: true}));
    }
  }
}

export function editNote(): string | undefined {
  if (MB?.relationshipEditor && isReleaseRelationshipEditor(MB.relationshipEditor)) {
    return MB.relationshipEditor.state.editNoteField.value;
  }
  const textArea = document.querySelector<HTMLTextAreaElement>('textarea.edit-note');
  return textArea?.value;
}

export function editNoteFormat(message: string): string {
  return dedent`
  ----
  ${message} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}.
  `;
}
