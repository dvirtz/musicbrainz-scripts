import {
  connect,
  count,
  endWith,
  filter,
  from,
  ignoreElements,
  lastValueFrom,
  map,
  merge,
  mergeMap,
  pipe,
  scan,
  tap,
  toArray,
  zip,
} from 'rxjs';
import {Setter} from 'solid-js';
import {compareInsensitive} from 'src/common/lib/compare';
import {addEditNote} from 'src/common/musicbrainz/edit-note';
import {trackRecordingState} from 'src/common/musicbrainz/track-recording-state';
import {albumUrl, Creator, Creators, IPBaseNumber, trackName, WorkVersion} from './acum';
import {albumInfo} from './albums';
import {linkArtists} from './artists';
import {addArrangerRelationship, addWriterRelationship} from './relationships';
import {AddWarning} from './ui/warnings';
import {workEditDataEqual} from './ui/work-edit-data';
import {WorkStateWithEditDataT} from './work-state';
import {addWork, linkWriters} from './works';

export async function importAlbum(
  albumId: string,
  addWarning: AddWarning,
  setProgress: Setter<readonly [number, string]>
): Promise<boolean> {
  setProgress([0, 'Loading album info']);

  const addTrackWarning = (track: WorkVersion) => (warning: string) =>
    addWarning(`Track ${track.albumTrackNumber}: ${warning}`);

  const albumBean = await albumInfo(albumId);

  // map of promises so that we don't fetch the same artist multiple times
  const artistCache = new Map<IPBaseNumber, Promise<ArtistT | null>>();

  const linkArrangers = async (
    recording: RecordingT,
    arrangers: ReadonlyArray<Creator> | undefined,
    creators: Creators,
    addWarning: AddWarning
  ) => {
    await linkArtists(
      artistCache,
      arrangers,
      creators,
      (artist: ArtistT) => addArrangerRelationship(recording, artist),
      addWarning
    );
  };

  const selectedRecordings = await lastValueFrom(
    from(MB.tree.iterate(MB.relationshipEditor.state.mediums)).pipe(
      mergeMap(([medium, recordingStateTree]) => {
        return zip(
          from(albumBean.tracks),
          from(medium.tracks!.map(track => trackRecordingState(track, recordingStateTree)))
        );
      }),
      filter((trackAndRecordingState): trackAndRecordingState is [WorkVersion, MediumRecordingStateT] => {
        const [, recordingState] = trackAndRecordingState;
        return recordingState != null && recordingState.isSelected;
      }),
      toArray()
    )
  );

  const linkCreators = async ([track, recording, workState]: readonly [
    WorkVersion,
    RecordingT,
    WorkStateWithEditDataT,
  ]): Promise<WorkStateWithEditDataT> => {
    const work = workState.work;
    const addWarning = addTrackWarning(track);
    await linkWriters(
      artistCache,
      track,
      (artist: ArtistT, linkTypeId: number) => addWriterRelationship(work, artist, linkTypeId),
      addWarning
    );
    await linkArrangers(recording, track.arrangers, track.creators, addWarning);
    return workState;
  };

  const maybeSetEditNote = pipe(
    count((workState: WorkStateWithEditDataT) => !workEditDataEqual(workState.editData, workState.originalEditData)),
    map(editedCount => editedCount > 0),
    tap(hasEdits => {
      if (hasEdits) {
        addEditNote(`Imported from ${albumUrl(albumId)}`);
      } else {
        addWarning('All works are up to date');
      }
    })
  );

  const updateProgress = pipe(
    scan(accumulator => accumulator + 1, 0),
    map(count => [count / selectedRecordings.length, `Loaded ${count}/${selectedRecordings.length} works`] as const),
    endWith([1, 'Done'] as const),
    tap(setProgress)
  );

  return await lastValueFrom(
    from(selectedRecordings).pipe(
      map(([track, recordingState]) => [track, recordingState, addTrackWarning(track)] as const),
      tap(([track, recordingState, addWarning]) => {
        const recording = recordingState.recording;
        if (trackName(track) != recording.name) {
          if (compareInsensitive(trackName(track), recording.name) === 0) {
            track.workEngName = recording.name;
          } else {
            addWarning(`Work name of ${recording.name} is different from recording name, please verify`);
          }
        }
      }),
      mergeMap(
        async ([track, recordingState, addWarning]) =>
          [track, recordingState.recording, await addWork(track, recordingState, addWarning)] as const
      ),
      mergeMap(linkCreators),
      connect(shared => merge(shared.pipe(maybeSetEditNote), shared.pipe(updateProgress, ignoreElements())))
    )
  );
}
