// adapted from https://github.com/metabrainz/musicbrainz-server/blob/5a64d781cb84039afd4894688f12164f21dc92f0/root/static/scripts/release/components/MediumRelationshipEditor.js

function compareRecordingWithRecordingState(recording: RecordingT, recordingState: MediumRecordingStateT): number {
  return recording.id - recordingState.recording.id;
}

export function trackRecordingState(track: TrackWithRecordingT, recordingStates: MediumRecordingStateTreeT) {
  return MB.tree.find(recordingStates, track.recording, compareRecordingWithRecordingState, null);
}
