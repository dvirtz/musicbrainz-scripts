import {count, filter, from, lastValueFrom, map, mergeMap, tap, zip} from 'rxjs';
import {COMPOSER_LINK_TYPE_ID, LYRICIST_LINK_TYPE_ID, TRANSLATOR_LINK_TYPE_ID} from 'src/common/musicbrainz/constants';
import {addEditNote} from 'src/common/musicbrainz/edit-note';
import {trackRecordingState} from 'src/common/musicbrainz/track-recording-state';
import {albumUrl, Creator, Creators, IPBaseNumber, searchName, WorkVersion} from './acum';
import {albumInfo} from './albums';
import {findArtist} from './artists';
import {AddWarning, ClearWarnings} from './components/warnings';
import {workEditDataEqual} from './components/work-edit-data';
import {addArrangerRelationship, addWriterRelationship} from './relationships';
import {addWork} from './works';

export async function importWorks(
  albumId: string,
  addWarning: AddWarning,
  clearWarnings: ClearWarnings
): Promise<boolean> {
  clearWarnings();

  const albumBean = await albumInfo(albumId);

  const artistCache = new Map<IPBaseNumber, Promise<ArtistT | null>>();

  const linkArtists = async (
    writers: ReadonlyArray<Creator> | undefined,
    creators: Creators,
    doLink: (artist: ArtistT) => void
  ) => {
    from(writers || [])
      .pipe(
        mergeMap(
          async author =>
            await (artistCache.get(author.creatorIpBaseNumber) ||
              artistCache
                .set(author.creatorIpBaseNumber, findArtist(author.creatorIpBaseNumber, creators, addWarning))
                .get(author.creatorIpBaseNumber))
        ),
        filter((artist): artist is ArtistT => artist !== null)
      )
      .subscribe(doLink);
  };

  const linkWriters = async (
    work: WorkT,
    writers: ReadonlyArray<Creator> | undefined,
    creators: Creators,
    linkTypeId: number
  ) => {
    linkArtists(writers, creators, (artist: ArtistT) => addWriterRelationship(work, artist, linkTypeId));
  };

  const linkArrangers = async (
    recording: RecordingT,
    arrangers: ReadonlyArray<Creator> | undefined,
    creators: Creators
  ) => {
    linkArtists(arrangers, creators, (artist: ArtistT) => addArrangerRelationship(recording, artist));
  };

  return await lastValueFrom(
    from(MB.tree.iterate(MB.relationshipEditor.state.mediums!)).pipe(
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
      tap(([track, recordingState]) => {
        const recording = recordingState.recording;
        if (track[searchName(recording.name)] != recording.name) {
          addWarning(`Work name of ${recording.name} is different than recording name, please verify`);
        }
      }),
      mergeMap(
        async ([track, recordingState]) =>
          [track, recordingState.recording, await addWork(track, recordingState, addWarning)] as const
      ),
      tap(([track, recording, workState]) => {
        const work = workState.work;
        linkWriters(work, track.authors, track.creators, LYRICIST_LINK_TYPE_ID);
        linkWriters(work, track.composers, track.creators, COMPOSER_LINK_TYPE_ID);
        linkWriters(work, track.translators, track.creators, TRANSLATOR_LINK_TYPE_ID);
        linkArrangers(recording, track.arrangers, track.creators);
      }),
      map(([, , workState]) => workState),
      count(workState => !workEditDataEqual(workState.editData, workState.originalEditData)),
      map(count => count > 0),
      tap(hasEdits => {
        if (hasEdits) {
          addEditNote(`Imported from ${albumUrl(albumId)}`);
        } else {
          addWarning('All works are up to date');
        }
      })
    )
  );
}
