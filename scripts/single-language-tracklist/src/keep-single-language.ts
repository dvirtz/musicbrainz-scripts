/**
 * Keeps the specified side of a separator in track titles and artist credits
 * by directly modifying the page observables instead of manipulating the DOM
 */

import {assertMBReleaseEditor} from '@repo/musicbrainz-ext/asserts';
import {ArtistCreditT} from 'typedbrainz/types';

type Side = 'left' | 'right';

function keepArtistCreditSide(artistCredit: ArtistCreditT, side: Side, sep: string): ArtistCreditT | undefined {
  if (!artistCredit?.names?.length) {
    return undefined;
  }

  const separatorIndex = artistCredit.names.findIndex(name => name.joinPhrase?.trim() === sep);
  if (separatorIndex === -1) {
    return undefined;
  }

  const keptNames =
    side === 'left' ? artistCredit.names.slice(0, separatorIndex + 1) : artistCredit.names.slice(separatorIndex + 1);
  if (keptNames.length === 0) {
    return undefined;
  }

  const normalizedNames = [
    ...keptNames.slice(0, keptNames.length - 1),
    {...keptNames[keptNames.length - 1]!, joinPhrase: ''},
  ];

  return {
    ...artistCredit,
    names: normalizedNames,
  };
}

function getRelease() {
  assertMBReleaseEditor(MB);
  const release = MB.releaseEditor.rootField.release();
  if (!release) {
    throw new Error('Release data not available');
  }

  return release;
}

function keepTitleSide(side: Side, sep: string) {
  const release = getRelease();
  const index = side === 'left' ? 0 : 1;

  const releaseNameParts = release.name().split(sep);
  if (releaseNameParts.length > 1 && index < releaseNameParts.length) {
    release.name(releaseNameParts[index]!.trim());
  }

  for (const track of release.allTracks()) {
    const currentName = track.name();
    const parts = currentName.split(sep);

    if (parts.length > 1) {
      if (index < parts.length) {
        track.name(parts[index]!.trim());
      }
    }
  }
}

function keepArtistSide(side: Side, sep: string) {
  const release = getRelease();

  const releaseArtistCredit = keepArtistCreditSide(release.artistCredit(), side, sep);
  if (releaseArtistCredit) {
    release.artistCredit(releaseArtistCredit);
  }

  for (const track of release.allTracks()) {
    const trackArtistCredit = keepArtistCreditSide(track.artistCredit(), side, sep);
    if (trackArtistCredit) {
      track.artistCredit(trackArtistCredit);
    }
  }
}

export function removeRHS(sep: string) {
  keepTitleSide('left', sep);
  keepArtistSide('left', sep);
}

export function removeLHS(sep: string) {
  keepTitleSide('right', sep);
  keepArtistSide('right', sep);
}
