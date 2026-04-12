import {getRelease} from '@repo/musicbrainz-ext/release-editor';
import {ArtistCreditT} from 'typedbrainz/types';

function normalizeArtistNames(artistCredit: ArtistCreditT): ArtistCreditT {
  return {
    ...artistCredit,
    names: artistCredit.names.map(name => {
      const canonicalName = name.artist?.name;
      if (!canonicalName || canonicalName === name.name) {
        return name;
      }

      return {
        ...name,
        name: canonicalName,
      };
    }),
  };
}

export function resetAllArtistCreditsToDefault() {
  const release = getRelease();
  release.artistCredit(normalizeArtistNames(release.artistCredit()));

  for (const track of release.allTracks()) {
    track.artistCredit(normalizeArtistNames(track.artistCredit()));
  }
}

export type ArtistNamesSnapshot = Map<string, Set<string>>;

export function snapshotTrackArtistNames(): ArtistNamesSnapshot {
  const release = getRelease();
  const snapshot: ArtistNamesSnapshot = new Map();

  for (const track of release.allTracks()) {
    for (const name of track.artistCredit().names) {
      const artistId = String(name.artist?.id);
      const artistName = name.name?.trim();
      if (!artistId || !artistName) {
        continue;
      }

      const existing = snapshot.get(artistId) ?? new Set<string>();
      existing.add(artistName);
      snapshot.set(artistId, existing);
    }
  }

  return snapshot;
}

function collectChangedArtistNames(before: ArtistNamesSnapshot, after: ArtistNamesSnapshot): Map<string, string> {
  const changed = new Map<string, string>();

  for (const [artistId, afterNames] of after) {
    const beforeNames = before.get(artistId) ?? new Set<string>();
    const introducedName = [...afterNames].find(name => !beforeNames.has(name));

    if (introducedName) {
      changed.set(artistId, introducedName);
    }
  }

  return changed;
}

export function propagateChangedTrackArtistCredits(before: ArtistNamesSnapshot) {
  const release = getRelease();
  const changedArtistNames = collectChangedArtistNames(before, snapshotTrackArtistNames());
  if (changedArtistNames.size === 0) {
    return;
  }

  for (const track of release.allTracks()) {
    const currentCredit = track.artistCredit();
    const nextNames = currentCredit.names.map(name => {
      const artistId = String(name.artist?.id);
      if (!artistId) {
        return name;
      }

      const changedName = changedArtistNames.get(artistId);
      if (!changedName || changedName === name.name) {
        return name;
      }

      return {
        ...name,
        name: changedName,
      };
    });

    const hasChanges = nextNames.some((name, index) => name !== currentCredit.names[index]);
    if (!hasChanges) {
      continue;
    }

    track.artistCredit({
      ...currentCredit,
      names: nextNames,
    });
  }
}
