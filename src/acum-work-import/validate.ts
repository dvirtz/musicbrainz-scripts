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
      validateAlbumId: [Signal<string>, Setter<boolean>]; // Corresponds to `use:validateAlbumId`
    }
  }
}

export function validateAlbumId(input: HTMLInputElement, accessor: Accessor<[Signal<string>, Setter<boolean>]>) {
  const [[albumId, setAlbumId], setAlbumIdValid] = accessor();
  input.oninput = () => {
    setAlbumId(input.value);
    if (/^\d+$/.test(albumId())) {
      setAlbumIdValid(true);
      input.setCustomValidity('');
    } else {
      setAlbumIdValid(false);
      input.setCustomValidity('Album ID must be a number');
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
