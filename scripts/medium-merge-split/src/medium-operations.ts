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
  const targetHasDataTracks = target.dataTracks().length > 0;
  const movedTracks = source.tracks.removeAll();

  for (const track of movedTracks) {
    // `medium` is a plain property, so it has to be repointed explicitly.
    track.medium = target;
    if (!targetHasDataTracks) {
      track.isDataTrack(false);
    }
  }

  target.tracks.push(...movedTracks);
  releaseEditor.resetTrackNumbers(target);
  releaseEditor.removeMedium(source);
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

  const created = new releaseEditor.fields.Medium(
    {position: medium.position() + 1, format_id: medium.formatID() ? Number(medium.formatID()) : null},
    release
  );
  created.loaded(true);
  created.collapsed(false);

  const movedTracks = medium.tracks.splice(trackIndex, medium.tracks.peek().length - trackIndex);
  for (const moved of movedTracks) {
    moved.medium = created;
  }
  created.tracks.push(...movedTracks);

  releaseEditor.resetTrackNumbers(medium);
  releaseEditor.resetTrackNumbers(created);

  for (const following of mediums.slice(mediumIndex + 1)) {
    following.position(following.position() + 1);
  }
  release.mediums.splice(mediumIndex + 1, 0, created);
}
