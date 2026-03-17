import pWaitFor from 'p-wait-for';

export async function waitForEditorState() {
  return pWaitFor(() => MB !== undefined && MB?.relationshipEditor.state !== undefined);
}
