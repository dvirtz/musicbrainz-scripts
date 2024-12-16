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
import {COMPOSER_LINK_TYPE_ID, LYRICIST_LINK_TYPE_ID, TRANSLATOR_LINK_TYPE_ID} from 'src/common/musicbrainz/constants';
import {addEditNote} from 'src/common/musicbrainz/edit-note';
import {trackRecordingState} from 'src/common/musicbrainz/track-recording-state';
import {albumUrl, Creator, Creators, IPBaseNumber, searchName, WorkVersion} from './acum';
import {albumInfo} from './albums';
import {linkArtists} from './artists';
import {addArrangerRelationship, addWriterRelationship} from './relationships';
import {AddWarning, ClearWarnings} from './ui/warnings';
import {workEditDataEqual} from './ui/work-edit-data';
import {WorkStateWithEditDataT} from './work-state';
import {addWork} from './works';

export async function importAlbum(
  albumId: string,
  addWarning: AddWarning,
  clearWarnings: ClearWarnings,
  setProgress: Setter<readonly [number, string]>
): Promise<boolean> {
  clearWarnings();
  setProgress([0, 'Loading album info']);

  const addTrackWarning = (track: WorkVersion) => (warning: string) =>
    addWarning(`Track ${track.albumTrackNumber}: ${warning}`);

  const albumBean = await albumInfo(albumId);

  // map of promises so that we don't fetch the same artist multiple times
  const artistCache = new Map<IPBaseNumber, Promise<ArtistT | null>>();

  const linkWriters = async (
    work: WorkT,
    writers: ReadonlyArray<Creator> | undefined,
    creators: Creators,
    linkTypeId: number
  ) => {
    await linkArtists(
      artistCache,
      writers,
      creators,
      (artist: ArtistT) => addWriterRelationship(work, artist, linkTypeId),
      addWarning
    );
  };

  const linkArrangers = async (
    recording: RecordingT,
    arrangers: ReadonlyArray<Creator> | undefined,
    creators: Creators
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
    await linkWriters(work, track.authors, track.creators, LYRICIST_LINK_TYPE_ID);
    await linkWriters(work, track.composers, track.creators, COMPOSER_LINK_TYPE_ID);
    await linkWriters(work, track.translators, track.creators, TRANSLATOR_LINK_TYPE_ID);
    await linkArrangers(recording, track.arrangers, track.creators);
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
    scan(accumaltor => accumaltor + 1, 0),
    map(count => [count / selectedRecordings.length, `Loaded ${count}/${selectedRecordings.length} works`] as const),
    endWith([1, 'Done'] as const),
    tap(setProgress)
  );

  return await lastValueFrom(
    from(selectedRecordings).pipe(
      map(([track, recordingState]) => [track, recordingState, addTrackWarning(track)] as const),
      tap(([track, recordingState, addWarning]) => {
        const recording = recordingState.recording;
        if (track[searchName(recording.name)] != recording.name) {
          addWarning(`Work name of ${recording.name} is different than recording name, please verify`);
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
