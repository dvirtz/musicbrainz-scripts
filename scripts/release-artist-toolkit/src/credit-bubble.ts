import {getEditedArtistCredit, propagateChangedTrackArtistCredits} from '#release-artist-actions.ts';
import {addCopyFromReleaseGroupButton} from '#release-artist-copy-button.ts';
import {waitForMutation} from '@repo/rxjs-ext/wait-for-element';

function isBubbleClosed(bubble: HTMLElement): boolean {
  return (
    !bubble.isConnected ||
    bubble.hasAttribute('hidden') ||
    bubble.getAttribute('aria-hidden') === 'true' ||
    bubble.style.display === 'none'
  );
}

function getEditorId(form: HTMLFormElement): string | undefined {
  const creditedAsInput = form.querySelector<HTMLInputElement>('input[id*="-credited-as-"]');
  if (!creditedAsInput?.id) {
    return undefined;
  }

  const match = /^ac-(.+)-credited-as-\d+$/.exec(creditedAsInput.id);
  return match?.[1];
}

export async function modifyArtistCreditBubble(bubble: HTMLElement) {
  const form = bubble.querySelector<HTMLFormElement>('form');
  if (!form) {
    return;
  }

  const changeMatching = form?.querySelector<HTMLInputElement>('input#change-matching-artists');

  // Set up the mutation observer synchronously (before any awaits) to avoid a race
  // condition where the bubble closes while GM.getValue calls are still pending.
  if (form.dataset.releaseArtistToolkitBound !== 'true') {
    form.dataset.releaseArtistToolkitBound = 'true';
    const editorId = getEditorId(form);
    const beforeSnapshot = editorId ? getEditedArtistCredit(editorId) : undefined;

    const applyMatchingChanges = async () => {
      if (!(await GM.getValue('change-partially-matching', false))) {
        return;
      }

      if (changeMatching && !changeMatching.checked) {
        return;
      }

      const afterSnapshot = editorId ? getEditedArtistCredit(editorId) : undefined;
      propagateChangedTrackArtistCredits(beforeSnapshot, afterSnapshot);
    };

    const bubbleClosed = (): boolean => isBubbleClosed(bubble);

    void waitForMutation(bubble.ownerDocument.body, bubbleClosed, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'],
    })
      .then(() => applyMatchingChanges())
      .catch(console.error);
  }

  if (!changeMatching) {
    // release artist
    addCopyFromReleaseGroupButton(bubble);
  } else if ((await GM.getValue('change-matching-artists', false)) && !changeMatching.checked) {
    changeMatching.click();
  }
}
