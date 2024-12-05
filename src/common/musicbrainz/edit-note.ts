export function addEditNote(message: string) {
  const textArea = document.querySelector('#edit-note-text') as HTMLTextAreaElement;
  const note = editNote(message);
  if (!textArea.value.includes(message)) {
    MB.relationshipEditor.dispatch({type: 'update-edit-note', editNote: `${textArea.value}\n${note}`});
  }
}

export function editNote(message: string) {
  return dedent`
  ----
  ${message} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}. 
  `;
}
