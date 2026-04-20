import pWaitFor from 'p-wait-for';

export async function waitForEditorState() {
  return pWaitFor(() => typeof MB !== 'undefined' && MB?.relationshipEditor.state !== undefined);
}

export async function waitForRelationshipDialogDispatch() {
  return pWaitFor(() => !!MB?.relationshipEditor.relationshipDialogDispatch);
}
