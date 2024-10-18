// from https://github.com/kellnerd/es-utils/blob/main/dom/react.js
function setReactTextareaValue(input: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', {bubbles: true}));
}

export function addEditNote(message: string) {
  const textArea = document.querySelector('#edit-note-text') as HTMLTextAreaElement;
  const note = editNote(message);
  if (!textArea.value.includes(message)) {
    setReactTextareaValue(textArea, `${textArea.value}\n${note}`);
  }
}

export function editNote(message: string) {
  return dedent`
  ----
  ${message} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}. 
  `;
}
