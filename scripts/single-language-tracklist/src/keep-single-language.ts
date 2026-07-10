/**
 * Keeps the specified side of a separator in track titles and artist credits
 * by directly modifying the page observables instead of manipulating the DOM
 */

import {getRelease, Observable} from '@repo/musicbrainz-ext/release-editor';
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

function keepNameSide(name: Observable<string>, sep: string, index: 0 | 1) {
  const parts = name().split(sep);
  if (parts.length > 1 && index < parts.length) {
    name(parts[index]!.trim());
  }
}

function keepTitleSide(side: Side, sep: string) {
  const release = getRelease();
  const index = side === 'left' ? 0 : 1;

  keepNameSide(release.name, sep, index);

  for (const medium of release.mediums()) {
    if (medium.name()) {
      keepNameSide(medium.name as Observable<string>, sep, index);
    }

    for (const track of medium.tracks()) {
      keepNameSide(track.name, sep, index);
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
