import pWaitFor from 'p-wait-for';

export async function waitForEditorState() {
  return pWaitFor(() => MB?.relationshipEditor.state !== undefined);
}
