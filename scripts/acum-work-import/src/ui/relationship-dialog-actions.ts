import {creatorUrl} from '#acum.ts';
import {
  assertMB,
  assertMBTree,
  assertRelationshipEditor,
  assertReleaseRelationshipEditor,
} from '@repo/musicbrainz-ext/asserts';
import {compareNumbers} from '@repo/musicbrainz-ext/compare';
import {linkTypes} from '@repo/musicbrainz-ext/type-info';
import {waitForRelationshipDialogDispatch} from '@repo/musicbrainz-ext/wait-for';
import {waitForElement, waitForMutation} from '@repo/rxjs-ext/wait-for-element';
import {RecordingT, WorkT} from 'typedbrainz/types';

type ArtistWarningAction = 'search' | 'create';

type OpenArtistDialogParams = {
  action: ArtistWarningAction;
  linkType: number;
  name: string;
  work: WorkT;
  creatorHebName: string;
  creatorEngName: string;
  editNote: string;
  ipi?: string;
  ipBaseNumber?: string;
  recording?: RecordingT;
};

function delay(ms: number) {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function getTrackForRecording(recording: RecordingT) {
  assertMB(MB);
  assertMBTree(MB.tree);
  assertReleaseRelationshipEditor(MB.relationshipEditor);

  const medium = MB.tree.find(
    MB.relationshipEditor.state.mediums,
    MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id)![0],
    (mediumKey, [mediumVal]) => compareNumbers(mediumKey?.id ?? 0, mediumVal.id),
    null
  )![0];
  return medium.tracks?.find(track => track.recording == recording);
}

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('change', {bubbles: true}));
}

async function waitForArtistCreateForm() {
  const addArtistDialog = await waitForElement(
    (node): node is HTMLDivElement => node instanceof HTMLDivElement && node.id == 'add-artist-dialog'
  );
  if (addArtistDialog) {
    await waitForMutation(addArtistDialog, mutation => {
      return (
        Array.from(mutation.removedNodes.values()).find(
          node => node instanceof HTMLDivElement && node.classList.contains('content-loading')
        ) !== undefined
      );
    });
    const contentDocument = addArtistDialog.querySelector('iframe')?.contentDocument;
    if (contentDocument) {
      return contentDocument;
    }
  }

  throw new Error('Failed to open Add a new artist form.');
}

async function runCreateFlow(params: OpenArtistDialogParams) {
  assertRelationshipEditor(MB?.relationshipEditor);
  MB.relationshipEditor.relationshipDialogDispatch({
    type: 'update-target-entity',
    source: params.work,
    action: {
      type: 'update-autocomplete',
      source: params.work,
      action: {
        type: 'toggle-add-entity-dialog',
        isOpen: true,
      },
      linkType: null,
    },
  });

  const artistForm = await waitForArtistCreateForm();

  const nameInput = artistForm.querySelector<HTMLInputElement>('input[id$="edit-artist.name"]');
  if (!nameInput) {
    throw new Error('Artist name input is missing in Add a new artist form.');
  }

  const sortNameInput = artistForm.querySelector<HTMLInputElement>('input[id$="edit-artist.sort_name"]');
  if (!sortNameInput) {
    throw new Error('Artist sort name input is missing in Add a new artist form.');
  }

  const guessCaseButton = artistForm.querySelector<HTMLButtonElement>('button.guesscase-title');
  if (!guessCaseButton || guessCaseButton.disabled) {
    throw new Error('Guess case button is unavailable in Add a new artist form.');
  }

  const guessSortButton = artistForm.querySelector<HTMLButtonElement>('button.guesscase-sortname');
  if (!guessSortButton || guessSortButton.disabled) {
    throw new Error('Guess sort name button is unavailable in Add a new artist form.');
  }

  const editNoteInput = artistForm.querySelector<HTMLTextAreaElement>('textarea[name="edit-artist.edit_note"]');
  if (!editNoteInput) {
    throw new Error('Artist edit note input is missing in Add a new artist form.');
  }

  // Required sequence: English name -> Guess case -> Guess sort name -> Hebrew name.
  setInputValue(nameInput, params.creatorEngName);
  guessCaseButton.click();
  guessSortButton.click();
  setInputValue(nameInput, params.creatorHebName);
  setInputValue(editNoteInput, params.editNote);

  if (!sortNameInput.value) {
    throw new Error('Guess sort name did not produce a sort name.');
  }

  if (params.ipi && Number(params.ipi)) {
    const ipiInput = artistForm.querySelector<HTMLInputElement>('input[name="edit-artist.ipi_codes.0"]');
    if (ipiInput) {
      setInputValue(ipiInput, params.ipi);
    }
  } else if (params.ipBaseNumber) {
    const urlInput = artistForm.querySelector<HTMLInputElement>('input[name="edit-artist.url.0.text"]');
    if (urlInput) {
      setInputValue(urlInput, creatorUrl(params.ipBaseNumber));
    }
  }
}

// based on https://github.com/loujine/musicbrainz-scripts/blob/master/mb-reledit-set_rec_artist_as_writer.user.js
async function fillWriterDialog(params: OpenArtistDialogParams) {
  assertRelationshipEditor(MB?.relationshipEditor);

  const writerLinkType = (await linkTypes)[params.linkType];
  if (!writerLinkType) {
    throw new Error(`Failed to find link type ${params.linkType}`);
  }

  MB.relationshipEditor.dispatch({
    type: 'update-dialog-location',
    location: {
      batchSelection: false,
      source: params.work,
      track: params.recording ? getTrackForRecording(params.recording) : undefined,
    },
  });
  await waitForRelationshipDialogDispatch();

  MB.relationshipEditor.relationshipDialogDispatch({
    type: 'update-link-type',
    source: params.work,
    action: {
      type: 'update-autocomplete',
      source: params.work,
      action: {
        type: 'select-item',
        item: {
          id: writerLinkType.id,
          name: writerLinkType.name,
          type: 'option',
          entity: writerLinkType,
        },
      },
    },
  });
  MB.relationshipEditor.relationshipDialogDispatch({
    type: 'update-target-entity',
    source: params.work,
    action: {
      type: 'update-autocomplete',
      source: params.work,
      action: {
        type: 'type-value',
        value: params.name,
      },
      linkType: null,
    },
  });
  await delay(10);
}

export async function openArtistDialogFromWarning(params: OpenArtistDialogParams) {
  assertRelationshipEditor(MB?.relationshipEditor);
  await fillWriterDialog(params);

  if (params.action === 'search') {
    MB.relationshipEditor.relationshipDialogDispatch({
      type: 'update-target-entity',
      source: params.work,
      action: {
        type: 'update-autocomplete',
        source: params.work,
        linkType: null,
        action: {
          type: 'search-after-timeout',
        },
      },
    });
    return;
  }

  await runCreateFlow(params);
}
