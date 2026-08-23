import {addEditNote} from '@repo/musicbrainz-ext/edit-note';
import {EditorMedium, EditorTrack, getRelease, getReleaseEditor} from '@repo/musicbrainz-ext/release-editor';

export function siblingMedium(medium: EditorMedium, offset: number): EditorMedium | undefined {
  const mediums = medium.release.mediums();
  const index = mediums.indexOf(medium);
  return index < 0 ? undefined : mediums[index + offset];
}

/** Mediums with a disc ID can't be reordered or resized without invalidating the TOC. */
export function hasDiscID(medium: EditorMedium): boolean {
  return medium.hasToc() || medium.hasExistingTocs();
}

export function canMerge(target: EditorMedium | undefined, source: EditorMedium | undefined): boolean {
  return (
    !!target &&
    !!source &&
    target.loaded() &&
    source.loaded() &&
    !hasDiscID(target) &&
    !hasDiscID(source) &&
    source.hasTracks()
  );
}

export function canSplit(medium: EditorMedium, track: EditorTrack): boolean {
  return !hasDiscID(medium) && medium.tracks.indexOf(track) > 0;
}

/** Appends all of `source`'s tracks to `target` and removes `source` from the release. */
function mergeMediums(target: EditorMedium, source: EditorMedium): void {
  if (!canMerge(target, source)) {
    return;
  }

  const releaseEditor = getReleaseEditor();
  for (const track of source.tracks()) {
    target.pushTrack({
      gid: track.gid,
      name: track.name(),
      length: track.length(),
      artistCredit: track.artistCredit(),
      isDataTrack: track.isDataTrack(),
      recording: track.recording(),
    });
  }

  releaseEditor.removeMedium(source);

  addEditNote('Medium merge');
}

export function mergeUp(medium: EditorMedium): void {
  const previous = siblingMedium(medium, -1);
  if (previous) {
    mergeMediums(previous, medium);
  }
}

export function mergeDown(medium: EditorMedium): void {
  const next = siblingMedium(medium, 1);
  if (next) {
    mergeMediums(medium, next);
  }
}

/** Moves `track` and everything after it onto a new medium inserted right after `medium`. */
export function splitMedium(medium: EditorMedium, track: EditorTrack): void {
  if (!canSplit(medium, track)) {
    return;
  }

  const releaseEditor = getReleaseEditor();
  const release = getRelease();
  const mediums = release.mediums();
  const mediumIndex = mediums.indexOf(medium);
  const trackIndex = medium.tracks.indexOf(track);

  const movedTracks = medium.tracks.splice(trackIndex, medium.tracks.peek().length - trackIndex);
  const created = new releaseEditor.fields.Medium(
    {
      position: medium.position() + 1,
      format_id: medium.formatID() ? Number(medium.formatID()) : undefined,
      tracks: movedTracks.map((track, index) => ({
        gid: track.gid,
        name: track.name(),
        length: track.length(),
        artistCredit: track.artistCredit(),
        position: index + 1,
        number: track.number() == track.position() ? index + 1 : track.number(),
        isDataTrack: track.isDataTrack(),
        recording: track.recording(),
      })),
    },
    release
  );

  for (const following of mediums.slice(mediumIndex + 1)) {
    following.position(following.position() + 1);
  }
  release.mediums.splice(mediumIndex + 1, 0, created);

  addEditNote('Medium split');
}
