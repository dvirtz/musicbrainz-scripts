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

  const isSeparator = (name: ArtistCreditT['names'][number]) => name.joinPhrase?.trim() === sep;
  const separatorIndex =
    side === 'left' ? artistCredit.names.findLastIndex(isSeparator) : artistCredit.names.findIndex(isSeparator);
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

function keepNameSide(name: Observable<string>, sep: string, side: Side) {
  const value = name();
  const separatorIndex = side === 'left' ? value.lastIndexOf(sep) : value.indexOf(sep);
  if (separatorIndex !== -1) {
    name((side === 'left' ? value.slice(0, separatorIndex) : value.slice(separatorIndex + sep.length)).trim());
  }
}

function keepTitleSide(side: Side, sep: string) {
  const release = getRelease();

  keepNameSide(release.name, sep, side);

  for (const medium of release.mediums()) {
    if (medium.name()) {
      keepNameSide(medium.name as Observable<string>, sep, side);
    }

    for (const track of medium.tracks()) {
      keepNameSide(track.name, sep, side);
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
