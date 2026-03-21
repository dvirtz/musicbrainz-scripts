import pWaitFor from 'p-wait-for';

export async function waitForEditorState() {
  return pWaitFor(() => typeof MB !== 'undefined' && MB?.relationshipEditor.state !== undefined);
}
