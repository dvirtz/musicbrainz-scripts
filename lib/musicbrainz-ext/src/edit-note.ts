import dedent from 'dedent';

export function addEditNote(message: string, document: Document = window.document) {
  const textArea = document.querySelector<HTMLTextAreaElement>('textarea.edit-note');
  const note = editNote(message);
  if (textArea && !textArea?.value.includes(message)) {
    const newNote = `${textArea?.value}\n${note}`;
    if (MB.relationshipEditor.state.editNoteField) {
      MB.relationshipEditor.dispatch({type: 'update-edit-note', editNote: newNote});
    } else {
      textArea.value = newNote;
      textArea.dispatchEvent(new Event('change', {bubbles: true}));
    }
  }
}

export function editNote(message: string): string {
  return dedent`
  ----
  ${message} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}.
  `;
}
