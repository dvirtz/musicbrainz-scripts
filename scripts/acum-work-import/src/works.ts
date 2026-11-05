import {WorkNameMatchWarning} from '#ui/work-data-warnings.tsx';
import type {WarningStore} from '#warning-store.ts';
import {trackName, WorkBean, workId, workISWCs} from '#acum.ts';
import {ArtistLookupCache, findArtistCached} from '#artists.ts';
import {shouldSearchWorks} from '#ui/settings.tsx';
import {assertMB} from '@repo/musicbrainz-ext/asserts';
import {compareInsensitive} from '@repo/musicbrainz-ext/compare';
import {
  COMPOSER_LINK_TYPE_ID,
  LYRICIST_LINK_TYPE_ID,
  SPECIAL_PURPOSE_ARTIST_IDS,
  TRANSLATOR_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {fetchJSON, tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {formatISWC} from '@repo/musicbrainz-ext/format-iswc';
import {IswcLookupResultsT, WorkLookupResultT, WorkSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {RecordingT, WorkT} from 'typedbrainz/types';

const workCache = new Map<string, WorkT>();

export async function findWork(
  track: WorkBean,
  artistCache: ArtistLookupCache = new Map(),
  store?: WarningStore,
  recording?: RecordingT
): Promise<WorkT | null> {
  const match = await (async () => {
    for (const iswc of await workISWCs(track)) {
      const byIswc = await tryFetchJSON<IswcLookupResultsT>(`/ws/2/iswc/${formatISWC(iswc)}?fmt=json`);
      if (byIswc && byIswc['work-count'] > 0) {
        return {workGid: byIswc.works[0]!.id, matchedByAuthor: false};
      }
    }

    const byName = await fetchJSON<WorkSearchResultsT>(`/ws/2/work?query=work:"${trackName(track)}"&fmt=json`);
    if (byName.works.length === 0) return;

    const candidates = await Promise.all(
      byName.works.map(work => fetchJSON<WorkLookupResultT>(`/ws/2/work/${work.id}?inc=artist-rels&fmt=json`))
    );
    const byAcumId = candidates.find(work =>
      work.attributes.some(attr => attr.type === 'ACUM ID' && attr.value === workId(track))
    );
    if (byAcumId) return {workGid: byAcumId.id, matchedByAuthor: false};

    const authorIds = new Set<string>();
    const roles = [
      [LYRICIST_LINK_TYPE_ID, track.authors],
      [COMPOSER_LINK_TYPE_ID, [...(track.composers ?? []), ...(track.composersAndAuthors ?? [])]],
      [TRANSLATOR_LINK_TYPE_ID, track.translators],
    ] as const;
    for (const [, authors] of roles) {
      for (const author of authors ?? []) {
        const {artist} = await findArtistCached(artistCache, author.creatorIpBaseNumber, track.creators);
        if (artist && !SPECIAL_PURPOSE_ARTIST_IDS.has(artist.gid)) authorIds.add(artist.gid);
      }
    }
    if (authorIds.size === 0) return;

    // Search results can include partial title matches. Verify the full title and artist relationship.
    const matchesWorkNameAndAuthor = (work: WorkLookupResultT) => {
      const linkedArtistIds = new Set(
        work.relations?.flatMap(relation => (relation.artist ? [relation.artist.id] : []))
      );
      return (
        compareInsensitive(work.title.trim(), trackName(track).trim()) === 0 &&
        linkedArtistIds.intersection(authorIds).size > 0
      );
    };
    const byAuthor = candidates.find(matchesWorkNameAndAuthor);
    if (byAuthor) {
      return {workGid: byAuthor.id, matchedByAuthor: true};
    }
  })();

  if (match) {
    const {workGid, matchedByAuthor} = match;
    const work = await fetchJSON<WorkT>(`/ws/js/entity/${workGid}`);
    if (matchedByAuthor && store) {
      store.add(new WorkNameMatchWarning({work, track, recording}, store));
    }
    return work;
  }

  return null;
}

export async function createNewWork(
  track: WorkBean,
  store: WarningStore,
  artistCache?: ArtistLookupCache,
  recording?: RecordingT
): Promise<WorkT> {
  assertMB(MB);

  const result = await (async () => {
    const id = workId(track);
    if (workCache.has(id)) {
      return workCache.get(id)!;
    }
    if (await shouldSearchWorks()) {
      const existingWork = await findWork(track, artistCache, store, recording);
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
  MB.linkedEntities.work[result.id] = result;
  return result;
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

export function isNewWork(work: WorkT) {
  return !work.gid;
}

export function workLink(work: WorkT) {
  return isNewWork(work) ? `#new-work-${work.id}` : `/work/${work.gid}`;
}
