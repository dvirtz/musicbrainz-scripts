import * as tree from 'weight-balanced-tree';

export enum SelectionStatus {
  VALID,
  NO_RECORDINGS,
  MULTIPLE_MEDIA,
}

export function validateSelection(selectedRecordings: tree.ImmutableTree<RecordingT>): SelectionStatus {
  if (!selectedRecordings || selectedRecordings.size == 0) {
    return SelectionStatus.NO_RECORDINGS;
  }

  const selectedMediums = new Set(
    MB.tree
      .toArray(
        MB.tree.map(selectedRecordings, recording => MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id))
      )
      .flat()
  );

  if (selectedMediums.size > 1) {
    return SelectionStatus.MULTIPLE_MEDIA;
  }

  return SelectionStatus.VALID;
}
