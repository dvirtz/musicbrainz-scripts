import {trackName, WorkBean, workId, workISWCs} from '#acum.ts';
import {ArtistLookupCache, findArtistCached} from '#artists.ts';
import {shouldSearchWorks} from '#ui/settings.tsx';
import {assertMB} from '@repo/musicbrainz-ext/asserts';
import {compareInsensitive} from '@repo/musicbrainz-ext/compare';
import {COMPOSER_LINK_TYPE_ID, LYRICIST_LINK_TYPE_ID, TRANSLATOR_LINK_TYPE_ID} from '@repo/musicbrainz-ext/constants';
import {fetchJSON, tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {formatISWC} from '@repo/musicbrainz-ext/format-iswc';
import {IswcLookupResultsT, WorkLookupResultT, WorkSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {WorkT} from 'typedbrainz/types';

const workCache = new Map<string, WorkT>();

export type WorkWarning =
  | {type: 'work-found-by-name'; workId: string; workName: string}
  | {type: 'work-name-different'; recordingName: string};
export type WorkLookupResult = {work: WorkT | null; warnings: WorkWarning[]};

export async function findWork(track: WorkBean, artistCache: ArtistLookupCache = new Map()): Promise<WorkLookupResult> {
  const warnings: WorkWarning[] = [];
  const workGid = await (async () => {
    for (const iswc of await workISWCs(track)) {
      const byIswc = await tryFetchJSON<IswcLookupResultsT>(`/ws/2/iswc/${formatISWC(iswc)}?fmt=json`);
      if (byIswc && byIswc['work-count'] > 0) {
        return byIswc.works[0]!.id;
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
    if (byAcumId) return byAcumId.id;

    const authorIds = new Set<string>();
    const roles = [
      [LYRICIST_LINK_TYPE_ID, track.authors],
      [COMPOSER_LINK_TYPE_ID, [...(track.composers ?? []), ...(track.composersAndAuthors ?? [])]],
      [TRANSLATOR_LINK_TYPE_ID, track.translators],
    ] as const;
    for (const [role, authors] of roles) {
      for (const author of authors ?? []) {
        const {artist} = await findArtistCached(artistCache, role, author.creatorIpBaseNumber, track.creators);
        if (artist) authorIds.add(artist.gid);
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
      warnings.push({type: 'work-found-by-name', workId: byAuthor.id, workName: byAuthor.title});
      return byAuthor.id;
    }
  })();

  if (workGid) {
    const work = await fetchJSON<WorkT>(`/ws/js/entity/${workGid}`);
    return {work, warnings};
  }

  return {work: null, warnings};
}

export async function createNewWork(
  track: WorkBean,
  artistCache?: ArtistLookupCache
): Promise<WorkLookupResult & {work: WorkT}> {
  assertMB(MB);

  const result = await (async () => {
    const id = workId(track);
    if (workCache.has(id)) {
      return {work: workCache.get(id)!, warnings: []};
    }
    if (await shouldSearchWorks()) {
      const {work: existingWork, warnings} = await findWork(track, artistCache);
      if (existingWork) {
        return {work: existingWork, warnings};
      }
    }
    const newWork = createWork({
      _fromBatchCreateWorksDialog: true,
      name: trackName(track),
    });
    workCache.set(id, newWork);
    return {work: newWork, warnings: []};
  })();
  MB.linkedEntities.work[result.work.id] = result.work;
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
