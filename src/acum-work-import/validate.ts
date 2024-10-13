import {addWarning, clearWarnings} from './warnings';
import * as tree from 'weight-balanced-tree';

export function validateInput() {
  const input = document.querySelector('#acum-album-id') as HTMLInputElement;
  const button = document.querySelector('#acum-work-import-container button') as HTMLButtonElement;
  button.disabled = !input.value || !verifySelection();
  input.reportValidity();
}

let verifiedRecordings: tree.ImmutableTree<RecordingT> | undefined = undefined;
let recordingVerifyResult: boolean | undefined = undefined;

function verifySelection() {
  if (verifiedRecordings && MB.tree.equals(MB.relationshipEditor.state.selectedRecordings, verifiedRecordings)) {
    return recordingVerifyResult;
  }

  recordingVerifyResult = (() => {
    if (!MB.relationshipEditor.state.selectedRecordings || MB.relationshipEditor.state.selectedRecordings.size == 0) {
      addWarning('selection', 'select at least one recording');
      return false;
    }

    const selectedMediums = new Set(
      MB.tree
        .toArray(
          MB.tree.map(MB.relationshipEditor.state.selectedRecordings, recording =>
            MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id)
          )
        )
        .flat()
    );

    if (selectedMediums.size > 1) {
      addWarning('selection', 'select recordings only from a single medium');
      return false;
    }

    clearWarnings('selection');
    return true;
  })();
  verifiedRecordings = MB.relationshipEditor.state.selectedRecordings;
  return recordingVerifyResult;
}
