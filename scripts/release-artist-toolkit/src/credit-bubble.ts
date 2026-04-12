import {propagateChangedTrackArtistCredits, snapshotTrackArtistNames} from '#release-artist-actions.ts';
import {addCopyFromReleaseGroupButton} from '#release-artist-copy-button.ts';

export async function modifyArtistCreditBubble(bubble: HTMLElement) {
  const form = bubble.querySelector<HTMLFormElement>('form');
  if (!form) {
    return;
  }

  const changeMatching = form?.querySelector<HTMLInputElement>('input#change-matching-artists');
  if (!changeMatching) {
    // release artist
    addCopyFromReleaseGroupButton(bubble);
    return;
  }

  if ((await GM.getValue('change-matching-artists', false)) && !changeMatching.checked) {
    changeMatching.click();
  }

  if (form.dataset.releaseArtistToolkitBound === 'true' || !(await GM.getValue('change-partially-matching', false))) {
    return;
  }

  form.dataset.releaseArtistToolkitBound = 'true';
  const beforeSnapshot = snapshotTrackArtistNames();

  form.addEventListener('submit', () => {
    if (!changeMatching.checked) {
      return;
    }

    window.setTimeout(() => {
      try {
        propagateChangedTrackArtistCredits(beforeSnapshot);
      } catch (error) {
        console.error(error);
      }
    }, 0);
  });
}
