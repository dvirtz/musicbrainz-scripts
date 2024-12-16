import {Accessor, Setter, Signal} from 'solid-js';
import * as tree from 'weight-balanced-tree';

export enum SelectionStatus {
  VALID,
  NO_RECORDINGS,
  MULTIPLE_MEDIA,
}

// https://docs.solidjs.com/configuration/typescript#custom-directives
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface Directives {
      validateNumericId: [Signal<string>, Setter<boolean>]; // Corresponds to `use:validateAlbumId`
    }
  }
}

export function validateNumericId(input: HTMLInputElement, accessor: Accessor<[Signal<string>, Setter<boolean>]>) {
  const [[id, setId], setIdValid] = accessor();
  input.oninput = () => {
    setId(input.value);
    if (/^\d+$/.test(id())) {
      setIdValid(true);
      input.setCustomValidity('');
    } else {
      setIdValid(false);
      input.setCustomValidity('ID must be a number');
    }
    input.reportValidity();
  };
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
