import {getRelease} from '@repo/musicbrainz-ext/release-editor';

const copyButtonId = 'release-artist-toolkit-copy-rg-credit';

export function addCopyFromReleaseGroupButton(bubble: HTMLElement) {
  if (bubble.querySelector(`#${copyButtonId}`)) {
    return;
  }

  const buttons = bubble.querySelector('div.buttons');

  const button = document.createElement('button');
  button.id = copyButtonId;
  button.type = 'button';
  button.className = 'button';
  button.textContent = 'Copy from RG';

  button.addEventListener('click', copyReleaseArtistCreditFromReleaseGroup);

  buttons?.append(button);
}

function copyReleaseArtistCreditFromReleaseGroup() {
  const release = getRelease();
  const releaseGroupArtistCredit = release.releaseGroup().artistCredit;
  release.artistCredit(releaseGroupArtistCredit);
}
