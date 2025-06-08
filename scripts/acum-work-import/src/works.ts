import {isSong, trackName, WorkBean, workISWCs} from '#acum.ts';
import {linkArtists} from '#artists.ts';
import {createRelationshipState} from '#relationships.ts';
import {shouldSearchWorks} from '#ui/settings.tsx';
import {AddWarning} from '#ui/warnings.tsx';
import {addWorkEditor} from '#ui/work-editor.tsx';
import {workEditData} from '#work-edit-data.ts';
import {WorkStateWithEditDataT} from '#work-state.ts';
import {head} from '@repo/common/head';
import {compareNumbers, compareTargetTypeWithGroup, compareWorks} from '@repo/musicbrainz-ext/compare';
import {
  COMPOSER_LINK_TYPE_ID,
  LYRICIST_LINK_TYPE_ID,
  MEDLEY_LINK_TYPE_ID,
  RECORDING_OF_LINK_TYPE_ID,
  REL_STATUS_ADD,
  REL_STATUS_REMOVE,
  TRANSLATOR_LINK_TYPE_ID,
  WRITER_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {fetchJSON, tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {formatISWC} from '@repo/musicbrainz-ext/format-iswc';
import {IswcLookupResultsT, WorkLookupResultT, WorkSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {defaultIfEmpty, filter, firstValueFrom, from, mergeMap} from 'rxjs';
import {isReleaseRelationshipEditor} from 'typedbrainz';
import {
  ArtistT,
  LinkAttrT,
  MediumRecordingStateT,
  MediumWorkStateT,
  MediumWorkStateTreeT,
  RecordingT,
  WorkT,
} from 'typedbrainz/types';

const workCache = new Map<string, WorkT>();

function relatedWork(relatedWorks: MediumWorkStateTreeT): MediumWorkStateT | undefined {
  if (!MB?.tree) {
    return;
  }

  const relatedWork = head(MB.tree.iterate(relatedWorks));
  if (relatedWork) {
    const targetTypeGroup = MB.tree.find(relatedWork.targetTypeGroups, 'recording', compareTargetTypeWithGroup, null);
    if (targetTypeGroup) {
      for (const relationship of iterateRelationshipsInTargetTypeGroup(targetTypeGroup)) {
        if (relationship._status !== REL_STATUS_REMOVE) {
          return relatedWork;
        }
      }
    }
  }
}

export async function findWork(track: WorkBean) {
  const workId = await (async () => {
    for (const iswc of await workISWCs(track.workId)) {
      const byIswc = await tryFetchJSON<IswcLookupResultsT>(`/ws/2/iswc/${formatISWC(iswc)}?fmt=json`);
      if (byIswc && byIswc['work-count'] > 0) {
        return byIswc.works[0]!.id;
      }
    }

    const byName = await fetchJSON<WorkSearchResultsT>(`/ws/2/work?query=work:"${trackName(track)}"&fmt=json`);
    if (byName && byName.count > 0) {
      const matchingWork = await firstValueFrom(
        from(byName.works).pipe(
          mergeMap(async work => await fetchJSON<WorkLookupResultT>(`/ws/2/work/${work.id}`)),
          filter(
            work =>
              work.attributes.find(attr => attr.type === 'ACUM ID' && attr.value === track.fullWorkId) !== undefined
          ),
          defaultIfEmpty(undefined)
        )
      );
      return matchingWork?.id;
    }
  })();

  if (workId) {
    const work = await fetchJSON<WorkT>(`/ws/js/entity/${workId}`);
    workCache.set(track.fullWorkId, work);
    return work;
  }

  return undefined;
}

export async function addWork(
  position: number,
  index: number | undefined,
  track: WorkBean,
  recordingState: MediumRecordingStateT,
  addWarning: AddWarning
): Promise<WorkStateWithEditDataT> {
  const workState = (await (async () => {
    if (!MB || !MB.tree || !isReleaseRelationshipEditor(MB?.relationshipEditor)) {
      throw new Error('MB or MB.tree is not defined or not a release relationship editor');
    }

    const existing = relatedWork(recordingState.relatedWorks);
    if (existing) {
      return existing as WorkStateWithEditDataT;
    }

    const newWork = await createNewWork(position, index, track, recordingState);

    recordingState = refreshRecordingState(recordingState.recording);

    return MB.tree.find(
      recordingState.relatedWorks,
      newWork,
      (work, relatedWork) => compareWorks(work, relatedWork.work),
      null
    )!;
  })()) as WorkStateWithEditDataT;

  Object.assign(workState, await workEditData(workState.work, track, addWarning));
  addWorkEditor(workState, recordingState);
  return workState;
}

function refreshRecordingState(recording: RecordingT): MediumRecordingStateT {
  if (!MB || !MB.tree || !isReleaseRelationshipEditor(MB?.relationshipEditor)) {
    throw new Error('MB or MB.tree is not defined or not a release relationship editor');
  }

  const mediumRecordingStates = MB.tree.find(
    MB.relationshipEditor.state.mediums,
    MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id)![0],
    (mediumKey, [mediumVal]) => {
      return compareNumbers(mediumKey?.id ?? 0, mediumVal.id);
    },
    null
  )![1];
  return MB.tree.find(
    mediumRecordingStates,
    recording,
    (recording, recordingState) => compareNumbers(recording.id, recordingState.recording.id),
    null
  )!;
}

async function createNewWork(
  position: number,
  index: number | undefined,
  track: WorkBean,
  recordingState: MediumRecordingStateT
): Promise<WorkT> {
  if (!MB || !MB.tree || !isReleaseRelationshipEditor(MB?.relationshipEditor)) {
    throw new Error('MB or MB.tree is not defined or not a release relationship editor');
  }

  const newWork = await (async () => {
    if (workCache.has(track.fullWorkId)) {
      return workCache.get(track.fullWorkId)!;
    }
    if (await shouldSearchWorks()) {
      const existingWork = await findWork(track);
      if (existingWork) {
        return existingWork;
      }
    }
    const newWork = createWork({
      _fromBatchCreateWorksDialog: true,
      id: MB?.relationshipEditor.getRelationshipStateId(null),
      name: trackName(track),
    });
    workCache.set(track.fullWorkId, newWork);
    return newWork;
  })();
  MB.linkedEntities.work[newWork.id] = newWork;

  const medleyLinkType = MB.linkedEntities.link_attribute_type[MEDLEY_LINK_TYPE_ID]!;

  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity: recordingState.recording,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    newRelationshipState: createRelationshipState({
      _status: REL_STATUS_ADD,
      entity0: recordingState.recording,
      entity1: newWork,
      id: MB.relationshipEditor.getRelationshipStateId(null),
      linkTypeID: RECORDING_OF_LINK_TYPE_ID,
      ...(index !== undefined
        ? {
            attributes: MB.tree.fromDistinctAscArray<LinkAttrT>([
              {
                typeID: medleyLinkType.id,
                typeName: medleyLinkType.name,
                type: {
                  gid: medleyLinkType.gid,
                },
              },
            ]),
            linkOrder: index + 1,
          }
        : {}),
    }),
    oldRelationshipState: null,
  });
  // wait for the work to be added
  await new Promise<void>(resolve => {
    new MutationObserver((_mutations, observer) => {
      if (
        document.querySelector(`.works a[href="${newWork.gid ? `/work/${newWork.gid}` : `#new-work-${newWork.id}`}"]`)
      ) {
        observer.disconnect();
        resolve();
      }
    }).observe(document.querySelector('.release-relationship-editor')!, {
      childList: true,
      subtree: true,
    });
  });
  return newWork;
}

export function createWork(attributes: Partial<WorkT>): WorkT {
  return {
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
    authors: [],
    other_artists: [],
    ...attributes,
  };
}

export async function linkWriters(
  artistCache: Map<string, Promise<ArtistT | null>>,
  track: WorkBean,
  doLink: (artist: ArtistT, linkTypeID: number) => void,
  addWarning: (message: string) => Set<string>
) {
  await linkArtists(
    artistCache,
    [...(track.authors ?? []), ...(track.composersAndAuthors ?? [])],
    track.creators,
    artist => doLink(artist, isSong(track) ? LYRICIST_LINK_TYPE_ID : WRITER_LINK_TYPE_ID),
    addWarning
  );
  await linkArtists(
    artistCache,
    [...(track.composers ?? []), ...(track.composersAndAuthors ?? [])],
    track.creators,
    artist => doLink(artist, COMPOSER_LINK_TYPE_ID),
    addWarning
  );
  await linkArtists(
    artistCache,
    track.translators,
    track.creators,
    artist => doLink(artist, TRANSLATOR_LINK_TYPE_ID),
    addWarning
  );
}
