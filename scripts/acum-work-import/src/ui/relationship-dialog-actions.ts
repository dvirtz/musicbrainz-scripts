import {creatorUrl} from '#acum.ts';
import {
  assertMB,
  assertMBTree,
  assertRelationshipEditor,
  assertReleaseRelationshipEditor,
} from '@repo/musicbrainz-ext/asserts';
import {compareNumbers} from '@repo/musicbrainz-ext/compare';
import {ARRANGER_LINK_TYPE_ID} from '@repo/musicbrainz-ext/constants';
import {findTargetTypeGroups, iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {linkTypes} from '@repo/musicbrainz-ext/type-info';
import {waitForRelationshipDialogDispatch} from '@repo/musicbrainz-ext/wait-for';
import {waitForElement, waitForMutation} from '@repo/rxjs-ext/wait-for-element';
import {RecordingT, RelatableEntityT, WorkT} from 'typedbrainz/types';

// cspell: ignore keepuppercase

type ArtistWarningAction = 'search' | 'create';

export type OpenArtistDialogParams = {
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
  artistId?: string;
};

function warningSourceEntity(params: OpenArtistDialogParams): RelatableEntityT {
  if (params.recording && params.linkType === ARRANGER_LINK_TYPE_ID) {
    return params.recording;
  }
  return params.work;
}

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

function getRelationship(sourceEntity: RelatableEntityT, artistId: string) {
  assertMBTree(MB?.tree);
  assertRelationshipEditor(MB?.relationshipEditor);

  const typeGroups = findTargetTypeGroups(MB.relationshipEditor.state.relationshipsBySource, sourceEntity);
  if (typeGroups) {
    for (const typeGroup of MB.tree.iterate(typeGroups)) {
      for (const relationship of iterateRelationshipsInTargetTypeGroup(typeGroup)) {
        if (relationship.entity0.gid === artistId || relationship.entity1.gid === artistId) {
          return relationship;
        }
      }
    }
  }
}

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function getCookieValue(doc: Document, name: string): string | null {
  const encodedName = `${encodeURIComponent(name)}=`;
  for (const cookiePart of doc.cookie.split(';')) {
    const cookie = cookiePart.trim();
    if (cookie.startsWith(encodedName)) {
      return decodeURIComponent(cookie.slice(encodedName.length));
    }
  }
  return null;
}

function setCookieValue(doc: Document, name: string, value: string) {
  doc.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/`;
}

function deleteCookie(doc: Document, name: string) {
  doc.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
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

async function runCreateFlow(params: OpenArtistDialogParams, sourceEntity: RelatableEntityT) {
  assertRelationshipEditor(MB?.relationshipEditor);

  MB.relationshipEditor.relationshipDialogDispatch({
    type: 'update-target-entity',
    source: sourceEntity,
    action: {
      type: 'update-autocomplete',
      source: sourceEntity,
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
  const keepUpperCaseCookieName = 'guesscase_keepuppercase';
  const previousKeepUpperCaseCookie = getCookieValue(artistForm, keepUpperCaseCookieName);
  // Guess Case reads this cookie on each run; force disabled for this automated flow.
  setCookieValue(artistForm, keepUpperCaseCookieName, 'false');
  try {
    guessCaseButton.click();
  } finally {
    if (previousKeepUpperCaseCookie === null) {
      deleteCookie(artistForm, keepUpperCaseCookieName);
    } else {
      setCookieValue(artistForm, keepUpperCaseCookieName, previousKeepUpperCaseCookie);
    }
  }
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
async function fillWriterDialog(params: OpenArtistDialogParams, sourceEntity: RelatableEntityT) {
  assertRelationshipEditor(MB?.relationshipEditor);

  const writerLinkType = (await linkTypes)[params.linkType];
  if (!writerLinkType) {
    throw new Error(`Failed to find link type ${params.linkType}`);
  }

  const existingRelationship = params.artistId ? getRelationship(sourceEntity, params.artistId) : undefined;

  MB.relationshipEditor.dispatch({
    type: 'update-dialog-location',
    location: {
      batchSelection: false,
      source: sourceEntity,
      track: params.recording ? getTrackForRecording(params.recording) : undefined,
      relationshipId: existingRelationship ? existingRelationship.id : undefined,
      linkTypeId: existingRelationship ? existingRelationship.linkTypeID : undefined,
      backward: existingRelationship ? existingRelationship.entity0.gid === params.artistId : undefined,
      targetType: existingRelationship ? 'artist' : undefined,
      textPhrase: existingRelationship ? writerLinkType.name : undefined,
    },
  });
  await waitForRelationshipDialogDispatch();

  MB.relationshipEditor.relationshipDialogDispatch({
    type: 'update-link-type',
    source: sourceEntity,
    action: {
      type: 'update-autocomplete',
      source: sourceEntity,
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
    source: sourceEntity,
    action: {
      type: 'update-autocomplete',
      source: sourceEntity,
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
  const sourceEntity = warningSourceEntity(params);
  await fillWriterDialog(params, sourceEntity);

  if (params.action === 'search') {
    MB.relationshipEditor.relationshipDialogDispatch({
      type: 'update-target-entity',
      source: sourceEntity,
      action: {
        type: 'update-autocomplete',
        source: sourceEntity,
        linkType: null,
        action: {
          type: 'search-after-timeout',
        },
      },
    });
    return;
  }

  await runCreateFlow(params, sourceEntity);
}
