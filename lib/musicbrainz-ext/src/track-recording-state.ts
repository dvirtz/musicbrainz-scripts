// adapted from https://github.com/metabrainz/musicbrainz-server/blob/5a64d781cb84039afd4894688f12164f21dc92f0/root/static/scripts/release/components/MediumRelationshipEditor.js

/*
 * @flow strict-local
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

function compareRecordingWithRecordingState(recording: RecordingT, recordingState: MediumRecordingStateT): number {
  return recording.id - recordingState.recording.id;
}

export function trackRecordingState(track: TrackWithRecordingT, recordingStates: MediumRecordingStateTreeT) {
  return MB.tree.find(recordingStates, track.recording, compareRecordingWithRecordingState, null);
}
