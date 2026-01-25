import {AcumWorkType} from '#acum-work-type.ts';
import {trackName, WorkBean, workId, workISWCs, workType} from '#acum.ts';
import {linkArtists} from '#artists.ts';
import {addWriterRelationship} from '#relationships.ts';
import {shouldSearchWorks} from '#ui/settings.tsx';
import {assertMB} from '@repo/musicbrainz-ext/asserts';
import {compareTargetTypeWithGroup} from '@repo/musicbrainz-ext/compare';
import {
  COMPOSER_LINK_TYPE_ID,
  LYRICIST_LINK_TYPE_ID,
  TRANSLATOR_LINK_TYPE_ID,
  WRITER_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {fetchJSON, tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {formatISWC} from '@repo/musicbrainz-ext/format-iswc';
import {IswcLookupResultsT, WorkLookupResultT, WorkSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {defaultIfEmpty, filter, firstValueFrom, from, mergeMap} from 'rxjs';
import {ArtistT, RelationshipTargetTypeGroupsT, WorkT} from 'typedbrainz/types';

const workCache = new Map<string, WorkT>();

export async function findWork(track: WorkBean) {
  const workGid = await (async () => {
    for (const iswc of await workISWCs(workId(track))) {
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

  if (workGid) {
    const work = await fetchJSON<WorkT>(`/ws/js/entity/${workGid}`);
    workCache.set(workGid, work);
    return work;
  }

  return undefined;
}

export async function createNewWork(track: WorkBean): Promise<WorkT> {
  assertMB(MB);

  const newWork = await (async () => {
    const id = workId(track);
    if (workCache.has(id)) {
      return workCache.get(id)!;
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
    workCache.set(id, newWork);
    return newWork;
  })();
  MB.linkedEntities.work[newWork.id] = newWork;
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

const SPECIAL_PURPOSE_ARTISTS = [
  '9be7f096-97ec-4615-8957-8d40b5dcbc41', // [traditional]
  'f731ccc4-e22a-43af-a747-64213329e088', // [unknown]
];

function workAuthors(targetTypeGroups: RelationshipTargetTypeGroupsT): readonly ArtistT[] | undefined {
  const targetTypeGroup = MB?.tree?.find(targetTypeGroups, 'artist', compareTargetTypeWithGroup, null);
  if (targetTypeGroup) {
    return iterateRelationshipsInTargetTypeGroup(targetTypeGroup)
      .filter(rel => rel.entity0.entityType === 'artist')
      .map(rel => rel.entity0 as ArtistT)
      .toArray();
  }
}

export async function linkWriters(
  artistCache: Map<string, Promise<ArtistT | null>>,
  track: WorkBean,
  work: WorkT,
  workTargetTypeGroups: RelationshipTargetTypeGroupsT,
  addWarning: (message: string) => Set<string>
) {
  const authors = (workTargetTypeGroups && workAuthors(workTargetTypeGroups)) ?? [];
  const doLink = (linkTypeID: number) => (artist: ArtistT) => {
    if (SPECIAL_PURPOSE_ARTISTS.includes(artist.gid) && authors.length > 0) {
      addWarning(`skipping special purpose artist ${artist.name} when there are existing authors`);
      return;
    }
    if (authors.some(existing => existing.gid === artist.gid)) {
      console.log(`skipping adding existing author ${artist.name} to work ${work.name}`);
      return;
    }
    addWriterRelationship(work, artist, linkTypeID);
  };

  const authorLinkTypeId = await (async () => {
    switch (await workType(track)) {
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
    doLink(authorLinkTypeId),
    addWarning
  );
  await linkArtists(
    artistCache,
    [...(track.composers ?? []), ...(track.composersAndAuthors ?? [])],
    track.creators,
    doLink(COMPOSER_LINK_TYPE_ID),
    addWarning
  );
  await linkArtists(artistCache, track.translators, track.creators, doLink(TRANSLATOR_LINK_TYPE_ID), addWarning);
}

export function isNewWork(work: WorkT) {
  return !work.gid;
}

export function workLink(work: WorkT) {
  return isNewWork(work) ? `#new-work-${work.id}` : `/work/${work.gid}`;
}
