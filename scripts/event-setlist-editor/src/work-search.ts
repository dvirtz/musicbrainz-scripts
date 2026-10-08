import {fetchJSON} from '@repo/musicbrainz-ext/fetch';

export type RelatedArtists = {hits: number | string; results: string[]};

export type WorkSearchResult = {
  performedByLinkedArtist?: boolean;
  gid: string;
  entityType: string;
  name: string;
  comment?: string;
  primaryAlias?: string | null;
  typeName?: string;
  languages?: {language: {name: string}}[];
  related_artists?: {authors?: RelatedArtists; artists?: RelatedArtists};
};

export async function searchWorks(query: string, id?: string) {
  const options = {signal: AbortSignal.timeout(15000)};
  if (id) {
    const work = await fetchJSON<WorkSearchResult>(`${location.origin}/ws/js/entity/${id}`, options);
    if (work.entityType !== 'work') throw new Error('The MBID does not identify a work.');
    return [work];
  }
  const params = new URLSearchParams({q: query, page: '1', direct: 'false'});
  const response = await fetchJSON<(WorkSearchResult | {current: string; pages: number})[]>(
    `${location.origin}/ws/js/work/?${params}`,
    options
  );
  // MusicBrainz appends pagination metadata to the autocomplete results.
  return response.filter((result): result is WorkSearchResult => 'gid' in result);
}

export function prioritizePerformedWorks(works: WorkSearchResult[], artistNames: string[]) {
  const names = new Set(artistNames);
  return works
    .map(work => ({
      ...work,
      performedByLinkedArtist: work.related_artists?.artists?.results.some(name => names.has(name)) ?? false,
    }))
    .sort((a, b) => Number(b.performedByLinkedArtist) - Number(a.performedByLinkedArtist));
}
