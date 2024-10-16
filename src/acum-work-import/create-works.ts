import {albumUrl, Creator, Creators, searchName, WorkVersion} from './acum';
import {albumInfo} from './albums';
import {addWarning, clearWarnings} from './warnings';
import {findArtist} from './artists';
import {addArrangerRelationship, addWriterRelationship} from './relationships';
import {addEditNote} from '../common/edit-note';
import {addWork} from './works';
import {COMPOSER_LINK_TYPE_ID, LYRICIST_LINK_TYPE_ID, TRANSLATOR_LINK_TYPE_ID} from './constants';
import {from, filter, switchMap, zip, tap, isEmpty} from 'rxjs';
import {trackRecordingState} from '../common/track-recording-state';

export async function createWorks() {
  clearWarnings('data');

  const albumId = (document.getElementById('acum-album-id') as HTMLInputElement).value;
  const albumBean = await albumInfo(albumId);

  const linkArtists = async (
    writers: ReadonlyArray<Creator>,
    creators: Creators,
    doLink: (artist: ArtistT) => void
  ) => {
    from(writers)
      .pipe(
        switchMap(async author => await findArtist(author.creatorIpBaseNumber, creators)),
        filter((artist: ArtistT | null): artist is ArtistT => artist !== null)
      )
      .subscribe(doLink);
  };

  const linkWriters = async (work: WorkT, writers: ReadonlyArray<Creator>, creators: Creators, linkTypeId: number) => {
    linkArtists(writers, creators, (artist: ArtistT) => addWriterRelationship(work, artist, linkTypeId));
  };

  const linkArrangers = async (recording: RecordingT, arrangers: ReadonlyArray<Creator>, creators: Creators) => {
    linkArtists(arrangers, creators, (artist: ArtistT) => addArrangerRelationship(recording, artist));
  };

  const pipeline = from(MB.tree.iterate(MB.relationshipEditor.state.mediums!)).pipe(
    switchMap(([medium, recordingStateTree]) => {
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
        addWarning('data', `Work name of ${recording.name} is different than recording name, please verify`);
      }
    })
  );

  pipeline.subscribe(([track, recordingState]) => {
    const work = addWork(track, recordingState);
    linkWriters(work, track.authors, track.creators, LYRICIST_LINK_TYPE_ID);
    linkWriters(work, track.composers, track.creators, COMPOSER_LINK_TYPE_ID);
    if (track.translators) {
      linkWriters(work, track.translators, track.creators, TRANSLATOR_LINK_TYPE_ID);
    }
    if (track.arrangers) {
      linkArrangers(recordingState.recording, track.arrangers, track.creators);
    }
  });

  pipeline.pipe(isEmpty()).subscribe(isEmpty => {
    if (!isEmpty) addEditNote(`imported from ${albumUrl(albumId)}`);
  });
}
