import {createUI} from './ui';
import {tryFetch} from '../common/try-fetch';
import {type IPBaseNumber, type Creators, getWorkVersions, getAlbumInfo, WorkVersion, albumUrl, Creator} from './acum';
import {addEditNote} from '../common/edit-note';
import map from 'rubico/map';
import pipe from 'rubico/pipe';
import filter from 'rubico/filter';
import forEach from 'rubico/forEach';
import tap from 'rubico/tap';
import not from 'rubico/not';
import {first, isEmpty} from 'rubico/x';

main();

const Constants = {
  RECORDING_OF_LINK_TYPE_ID: 278,
  COMPOSER_LINK_TYPE_ID: 168,
  LYRICIST_LINK_TYPE_ID: 165,
  ARRANGER_LINK_TYPE_ID: 297,
  TRANSLATOR_LINK_TYPE_ID: 872,
  REL_STATUS_NOOP: 0 as RelationshipEditStatusT,
  REL_STATUS_ADD: 1 as RelationshipEditStatusT,
  REL_STATUS_EDIT: 2 as RelationshipEditStatusT,
  REL_STATUS_REMOVE: 3 as RelationshipEditStatusT,
  ACUM_TYPE_ID: 206,
};

function validateInput() {
  const input = document.querySelector('#acum-album-id') as HTMLInputElement;
  const button = document.querySelector('#acum-work-import-container button') as HTMLButtonElement;
  button.disabled = !input.value || !verifySelection();
  input.reportValidity();
}

function main() {
  createUI(importFromAcum, validateInput);

  VM.observe(document.body, () => {
    const recordingCheckboxes = document.querySelectorAll(
      'input[type=checkbox].recording, input[type=checkbox].medium-recordings, input[type=checkbox].all-recordings'
    ) as NodeListOf<HTMLInputElement>;
    if (recordingCheckboxes.length > 0) {
      recordingCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', validateInput);
      });
      return true;
    }
  });
}

const artistCache = new Map<IPBaseNumber, Promise<ArtistT | null>>();

async function findArtist(ipBaseNumber: IPBaseNumber, creators: Creators): Promise<ArtistT | null> {
  if (!artistCache.has(ipBaseNumber)) {
    const artistPromise = (async () => {
      const creator = creators.find(creator => creator.creatorIpBaseNumber === ipBaseNumber)!;
      const byIpi = await tryFetch(`/ws/2/artist?query=ipi:${creator.number}`);
      if (byIpi && byIpi.artists.length > 0) {
        return byIpi.artists[0].id as MBID;
      }

      const byName = await tryFetch(`/ws/2/artist?query=name:(${creator.creatorHebName} OR ${creator.creatorEngName})`);
      if (byName && byName.artists.length > 0) {
        addWarning(
          'data',
          `artist ${byName.artists[0].name} found by name search, please verify (IPI = ${creator.number})`
        );
        return byName.artists[0].id as MBID;
      }

      addWarning('data', `failed to find ${creator.creatorHebName || creator.creatorEngName}, IPI ${creator.number}`);
      return null;
    })().then(async artistMBID => (artistMBID ? ((await tryFetch(`/ws/js/entity/${artistMBID}`)) as ArtistT) : null));
    artistCache.set(ipBaseNumber, artistPromise);
  }
  return await artistCache.get(ipBaseNumber)!;
}

function createRelationshipState(attributes: Partial<RelationshipStateT>): RelationshipStateT {
  return {
    ...{
      _lineage: [],
      _original: null,
      _status: 0,
      attributes: null,
      begin_date: null,
      editsPending: false,
      end_date: null,
      ended: false,
      entity0: null,
      entity0_credit: '',
      entity1: null,
      entity1_credit: '',
      id: -1,
      linkOrder: 0,
      linkTypeID: null,
    },
    ...attributes,
  };
}

function addWriterRelationship(work: WorkT, artist: ArtistT, linkTypeID: number) {
  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity: work,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    newRelationshipState: createRelationshipState({
      _status: Constants.REL_STATUS_ADD,
      backward: true,
      entity0: artist,
      entity1: work,
      id: MB.relationshipEditor.getRelationshipStateId(),
      linkTypeID: linkTypeID,
    }),
    oldRelationshipState: null,
  });
}

function addArrangerRelationship(recording: RecordingT, artist: ArtistT) {
  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity: recording,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    newRelationshipState: createRelationshipState({
      _status: Constants.REL_STATUS_ADD,
      backward: true,
      entity0: artist,
      entity1: recording,
      id: MB.relationshipEditor.getRelationshipStateId(),
      linkTypeID: Constants.ARRANGER_LINK_TYPE_ID,
    }),
    oldRelationshipState: null,
  });
}

async function workISWCs(workID: MBID) {
  const formatISWC = (iswc: string) => iswc.replace(/T(\d{3})(\d{3})(\d{3})(\d)/, 'T-$1.$2.$3-$4');

  return (await getWorkVersions(workID))
    ?.map(albumVersion => albumVersion.versionIswcNumber)
    .filter(iswc => iswc.length > 0)
    .map(formatISWC);
}

const workCache = new Map<string, WorkT>();

function createWork(attributes: Partial<WorkT>): WorkT {
  return {
    ...{
      artists: [],
      attributes: [],
      comment: '',
      editsPending: false,
      entityType: 'work',
      gid: '',
      id: 0,
      iswcs: [],
      languages: [],
      last_updated: null,
      name: '',
      typeID: null,
      writers: [],
    },
    ...attributes,
  };
}

async function addWork(track: WorkVersion, recording: RecordingT) {
  if (not(isEmpty(recording.related_works))) {
    return first(recording.related_works);
  }

  const newWork = await (async () => {
    if (workCache.has(track.fullWorkId)) {
      return workCache.get(track.fullWorkId)!;
    }
    const workId = MB.relationshipEditor.getRelationshipStateId();
    const newWork = createWork({
      _fromBatchCreateWorksDialog: true,
      id: workId,
      name: track.workHebName,
      languages:
        track.workLanguage == '1'
          ? Object.values(MB.linkedEntities.language)
              .filter(lang => lang.name == 'Hebrew')
              .map(language => ({
                language: language,
              }))
          : [],
      iswcs: (await workISWCs(track.workId))?.map(iswc => ({
        entityType: 'iswc',
        id: MB.relationshipEditor.getRelationshipStateId(),
        editsPending: true,
        iswc: iswc,
        work_id: workId,
      })),
      attributes: [
        {
          id: MB.relationshipEditor.getRelationshipStateId(),
          typeID: Constants.ACUM_TYPE_ID,
          typeName: 'ACUM ID',
          value: track.fullWorkId,
          value_id: null,
        },
      ],
    });
    console.log(newWork.languages);
    workCache.set(track.fullWorkId, newWork);
    return newWork;
  })();
  MB.linkedEntities.work[newWork.id] = newWork;
  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity: recording,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    newRelationshipState: createRelationshipState({
      _status: Constants.REL_STATUS_ADD,
      backward: false,
      entity0: recording,
      entity1: newWork,
      id: MB.relationshipEditor.getRelationshipStateId(),
      linkTypeID: Constants.RECORDING_OF_LINK_TYPE_ID,
    }),
    oldRelationshipState: null,
  });
  return newWork;
}

function addWarning(className: string, message: string) {
  const container = document.querySelector('#acum-work-import-container')!;
  for (const element of container.querySelectorAll(`p.warning.${className}`).values()) {
    if (element.textContent === message) {
      return;
    }
  }
  const warning = document.createElement('p');
  warning.classList.add('warning', className);
  warning.textContent = message;
  container.appendChild(warning);
}

function clearWarnings(className: string) {
  const container = document.querySelector('#acum-work-import-container')!;
  container.querySelectorAll(`p.warning.${className}`).forEach(element => element.remove());
}

async function importFromAcum() {
  clearWarnings('data');

  const albumId = (document.getElementById('acum-album-id') as HTMLInputElement).value;
  const albumBean = await getAlbumInfo(albumId);
  if (!albumBean) {
    alert('failed to find this album ID');
    return;
  }

  const searchName = (recording: RecordingT) => (/[א-ת]/.test(recording.name) ? 'workHebName' : 'workEngName');

  const linkArtists = async (
    writers: ReadonlyArray<Creator>,
    creators: Creators,
    doLink: (artist: ArtistT) => void
  ) => {
    pipe(writers, [
      map(async (author: {creatorIpBaseNumber: string}) => await findArtist(author.creatorIpBaseNumber, creators)),
      filter((artist: ArtistT | undefined): artist is ArtistT => artist !== undefined),
      forEach(doLink),
    ]);
  };

  const linkWriters = async (work: WorkT, writers: ReadonlyArray<Creator>, creators: Creators, linkTypeId: number) => {
    linkArtists(writers, creators, (artist: ArtistT) => addWriterRelationship(work, artist, linkTypeId));
  };

  const linkArrangers = async (recording: RecordingT, arrangers: ReadonlyArray<Creator>, creators: Creators) => {
    linkArtists(arrangers, creators, (artist: ArtistT) => addArrangerRelationship(recording, artist));
  };

  const tracks = albumBean.tracks;
  pipe(MB.tree.iterate(MB.relationshipEditor.state.selectedRecordings), [
    map((recording: RecordingT) => {
      const mediums = MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id)!;
      const position = mediums[0].tracks.find(track => track.recording === recording)!.position;
      return [
        recording,
        tracks.find((t, index) => t[searchName(recording)] === recording.name || index === position - 1),
      ];
    }),
    filter((pair: [RecordingT, WorkVersion | undefined]): pair is [RecordingT, WorkVersion] => pair[1] !== undefined),
    tap.if(not(isEmpty), () => addEditNote(`imported from ${albumUrl(albumId)}`)),
    forEach(async ([recording, track]: [RecordingT, WorkVersion]) => {
      if (track[searchName(recording)] != recording.name) {
        addWarning('data', `Work name of ${recording.name} is different than recording name, please verify`);
      }
      const work = await addWork(track, recording);
      linkWriters(work, track.authors, track.creators, Constants.LYRICIST_LINK_TYPE_ID);
      linkWriters(work, track.composers, track.creators, Constants.COMPOSER_LINK_TYPE_ID);
      if (track.translators) {
        linkWriters(work, track.translators, track.creators, Constants.TRANSLATOR_LINK_TYPE_ID);
      }
      if (track.arrangers) {
        linkArrangers(recording, track.arrangers, track.creators);
      }
    }),
  ]);
}

let verifiedRecordings: ImmutableTree<RecordingT> | undefined = undefined;
let recordingVerifyResult: boolean | undefined = undefined;

function verifySelection() {
  if (verifiedRecordings && MB.tree.equals(MB.relationshipEditor.state.selectedRecordings, verifiedRecordings)) {
    return recordingVerifyResult;
  }

  recordingVerifyResult = (() => {
    if (!MB.relationshipEditor.state.selectedRecordings || MB.relationshipEditor.state.selectedRecordings.size == 0) {
      addWarning('selection', 'select at least one recording');
      return false;
    }

    const selectedMediums = new Set(
      MB.tree
        .toArray(
          MB.tree.map(MB.relationshipEditor.state.selectedRecordings, recording =>
            MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id)
          )
        )
        .flat()
    );

    if (selectedMediums.size > 1) {
      addWarning('selection', 'select recordings only from a single medium');
      return false;
    }

    clearWarnings('selection');
    return true;
  })();
  verifiedRecordings = MB.relationshipEditor.state.selectedRecordings;
  return recordingVerifyResult;
}
