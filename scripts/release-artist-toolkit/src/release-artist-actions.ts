import {addEditNote} from '@repo/musicbrainz-ext/edit-note';
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

  addEditNote('Reset artist credits to artist names');
}

function cloneArtistCredit(artistCredit: ArtistCreditT): ArtistCreditT {
  return {
    ...artistCredit,
    names: artistCredit.names.map(name => ({
      ...name,
      artist: name.artist ? {...name.artist} : name.artist,
    })),
  };
}

export function resetTrackArtistCreditsToReleaseArtist() {
  const release = getRelease();
  const artistCredit = release.artistCredit();

  for (const track of release.allTracks()) {
    track.artistCredit(cloneArtistCredit(artistCredit));
  }

  addEditNote('Reset track artist credits to release artist');
}

export function copyTrackArtistCreditsFromRecordings() {
  const release = getRelease();

  for (const track of release.allTracks()) {
    track.artistCredit(cloneArtistCredit(track.recording().artistCredit));
  }

  addEditNote('Copied track artist credits from recordings');
}

export type SourceTrackArtistCredit = {
  artistCredit: ArtistCreditT;
  mediumPosition: number;
  trackPosition: number;
};

export type TargetMedium = {
  position: number;
  trackCount: number;
};

export function getTargetMediums(): TargetMedium[] {
  return getRelease()
    .mediums()
    .map(medium => ({position: medium.position(), trackCount: medium.tracks().length}));
}

export function copyTrackArtistCreditsFromSource(sourceCredits: SourceTrackArtistCredit[], sourceUrl: string) {
  const sourceCreditByPosition = new Map(
    sourceCredits.map(source => [`${source.mediumPosition}:${source.trackPosition}`, source.artistCredit])
  );
  const release = getRelease();
  let applied = 0;
  let unmatched = 0;

  for (const medium of release.mediums()) {
    for (const track of medium.tracks()) {
      const sourceCredit = sourceCreditByPosition.get(`${medium.position()}:${track.position()}`);
      if (!sourceCredit) {
        unmatched++;
        continue;
      }

      track.artistCredit(cloneArtistCredit(sourceCredit));
      applied++;
    }
  }

  addEditNote(`Copied track artist credits from ${sourceUrl}`);
  return {applied, unmatched};
}

export function copyTrackArtistCreditsFromSourceMedium(
  sourceCredits: SourceTrackArtistCredit[],
  targetMediumPosition: number,
  sourceUrl: string
) {
  return copyTrackArtistCreditsFromSource(
    sourceCredits.map(source => ({...source, mediumPosition: targetMediumPosition})),
    sourceUrl
  );
}

export function getEditedArtistCredit(editorId: string): ArtistCreditT | undefined {
  const release = getRelease();

  if (String(release.uniqueID) === editorId) {
    return cloneArtistCredit(release.artistCredit());
  }

  for (const track of release.allTracks()) {
    if (String(track.uniqueID) === editorId) {
      return cloneArtistCredit(track.artistCredit());
    }
  }

  return undefined;
}

function collectChangedJoinPhrases(before: ArtistCreditT, after: ArtistCreditT): Map<string, string> {
  const changed = new Map<string, string>();
  const ambiguous = new Set<string>();
  const nameCount = Math.min(before.names.length, after.names.length);

  for (let nameIndex = 0; nameIndex < nameCount; nameIndex++) {
    const previousJoinPhrase = before.names[nameIndex]?.joinPhrase ?? '';
    const nextJoinPhrase = after.names[nameIndex]?.joinPhrase ?? '';

    if (!previousJoinPhrase || previousJoinPhrase === nextJoinPhrase || ambiguous.has(previousJoinPhrase)) {
      continue;
    }

    const existing = changed.get(previousJoinPhrase);
    if (existing && existing !== nextJoinPhrase) {
      changed.delete(previousJoinPhrase);
      ambiguous.add(previousJoinPhrase);
      continue;
    }

    changed.set(previousJoinPhrase, nextJoinPhrase);
  }

  return changed;
}

function collectChangedArtistNames(before: ArtistCreditT, after: ArtistCreditT): Map<string, string> {
  const changed = new Map<string, string>();
  const ambiguous = new Set<string>();
  const beforeByArtist = new Map<string, string>();
  const afterByArtist = new Map<string, string>();

  const remember = (map: Map<string, string>, names: ArtistCreditT['names']) => {
    for (const name of names) {
      const artistId = String(name.artist?.id);
      const artistName = name.name?.trim();
      if (!artistId || !artistName || ambiguous.has(artistId)) {
        continue;
      }

      const existing = map.get(artistId);
      if (existing && existing !== artistName) {
        map.delete(artistId);
        ambiguous.add(artistId);
        continue;
      }

      map.set(artistId, artistName);
    }
  };

  remember(beforeByArtist, before.names);
  remember(afterByArtist, after.names);

  for (const [artistId, beforeName] of beforeByArtist) {
    const afterName = afterByArtist.get(artistId);
    if (!afterName || afterName === beforeName || ambiguous.has(artistId)) {
      continue;
    }

    changed.set(artistId, afterName);
  }

  return changed;
}

export function propagateChangedTrackArtistCredits(
  before: ArtistCreditT | undefined,
  after: ArtistCreditT | undefined
) {
  if (!before || !after) {
    return;
  }

  const release = getRelease();
  const changedArtistNames = collectChangedArtistNames(before, after);
  const changedJoinPhrases = collectChangedJoinPhrases(before, after);
  if (changedArtistNames.size === 0 && changedJoinPhrases.size === 0) {
    return;
  }

  for (const track of release.allTracks()) {
    const currentCredit = track.artistCredit();
    const nextNames = currentCredit.names.map(name => {
      const artistId = String(name.artist?.id);

      const changedName = artistId ? changedArtistNames.get(artistId) : undefined;

      const nextName = changedName ?? name.name;
      const currentJoinPhrase = name.joinPhrase ?? '';
      const nextJoinPhrase = changedJoinPhrases.get(currentJoinPhrase) ?? currentJoinPhrase;

      if (nextName === name.name && nextJoinPhrase === currentJoinPhrase) {
        return name;
      }

      return {
        ...name,
        name: nextName,
        joinPhrase: nextJoinPhrase,
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
