import {AcumWorkType} from '#acum-work-type.ts';
import {trackName, WorkBean, workISWCs, workType} from '#acum.ts';
import {linkArtists} from '#artists.ts';
import {createRelationshipState} from '#relationships.ts';
import {shouldSearchWorks} from '#ui/settings.tsx';
import {
  COMPOSER_LINK_TYPE_ID,
  LYRICIST_LINK_TYPE_ID,
  MEDLEY_LINK_TYPE_ID,
  RECORDING_OF_LINK_TYPE_ID,
  REL_STATUS_ADD,
  TRANSLATOR_LINK_TYPE_ID,
  WRITER_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {fetchJSON, tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {formatISWC} from '@repo/musicbrainz-ext/format-iswc';
import {IswcLookupResultsT, WorkLookupResultT, WorkSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {defaultIfEmpty, filter, firstValueFrom, from, mergeMap} from 'rxjs';
import {isReleaseRelationshipEditor} from 'typedbrainz';
import {ArtistT, LinkAttrT, MediumRecordingStateT, WorkT} from 'typedbrainz/types';

const workCache = new Map<string, WorkT>();

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
              work.attributes.find(
                attr => attr.type === 'ACUM ID' && (attr.value === track.workId || attr.value === track.fullWorkId)
              ) !== undefined
          ),
          defaultIfEmpty(undefined)
        )
      );
      return matchingWork?.id;
    }
  })();

  if (workId) {
    const work = await fetchJSON<WorkT>(`/ws/js/entity/${workId}`);
    workCache.set(track.workId, work);
    return work;
  }

  return undefined;
}

export async function createNewWork(
  index: number | undefined,
  track: WorkBean,
  recordingState: MediumRecordingStateT
): Promise<WorkT> {
  if (!MB || !MB.tree || !isReleaseRelationshipEditor(MB?.relationshipEditor)) {
    throw new Error('MB or MB.tree is not defined or not a release relationship editor');
  }

  const newWork = await (async () => {
    if (workCache.has(track.workId)) {
      return workCache.get(track.workId)!;
    }
    if (await shouldSearchWorks()) {
      const existingWork = await findWork(track);
      if (existingWork) {
        return existingWork;
      }
    }
    const newWork = createWork({
      _fromBatchCreateWorksDialog: true,
      name: trackName(track),
    });
    workCache.set(track.workId, newWork);
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
      console.log('work added observer', newWork);
      if (
        document.querySelector(`.works a[href="${newWork.gid ? `/work/${newWork.gid}` : `#new-work-${newWork.id}`}"]`)
      ) {
        observer.disconnect();
        resolve();
      }
    }).observe(document.body, {
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
    iswcs: [],
    languages: [],
    last_updated: null,
    name: '',
    typeID: null,
    authors: [],
    other_artists: [],
    ...attributes,
    id: MB?.relationshipEditor.getRelationshipStateId(null) ?? 0,
  };
}

export async function linkWriters(
  artistCache: Map<string, Promise<ArtistT | null>>,
  track: WorkBean,
  doLink: (artist: ArtistT, linkTypeID: number) => void,
  addWarning: (message: string) => Set<string>
) {
  const authorLinkTypeId = (() => {
    switch (workType(track)) {
      case AcumWorkType.PopularSong:
      case AcumWorkType.OriginalSongFor4PartChoir:
        return LYRICIST_LINK_TYPE_ID;
      default:
        return WRITER_LINK_TYPE_ID;
    }
  })();
  await linkArtists(
    artistCache,
    [...(track.authors ?? []), ...(track.composersAndAuthors ?? [])],
    track.creators,
    artist => doLink(artist, authorLinkTypeId),
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
