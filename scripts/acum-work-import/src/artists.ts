import {CreatorFull, Creators, creatorUrl, IPBaseNumber} from '#acum.ts';
import {compareInsensitive} from '@repo/musicbrainz-ext/compare';
import {
  ARRANGER_LINK_TYPE_ID,
  COMPOSER_LINK_TYPE_ID,
  LYRICIST_LINK_TYPE_ID,
  TRANSLATOR_LINK_TYPE_ID,
  WRITER_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {ArtistSearchResultsT, UrlRelsSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {ArtistT} from 'typedbrainz/types';

export type ArtistLinkTypeID =
  | typeof COMPOSER_LINK_TYPE_ID
  | typeof LYRICIST_LINK_TYPE_ID
  | typeof ARRANGER_LINK_TYPE_ID
  | typeof TRANSLATOR_LINK_TYPE_ID
  | typeof WRITER_LINK_TYPE_ID;

export type ArtistLookupResult = {
  artist: ArtistT | null;
  match: 'identifier' | 'missing' | {type: 'name' | 'alias'; id: string; name: string};
};
export type ArtistLookupCache = Map<IPBaseNumber, Promise<ArtistLookupResult>>;

export function findArtistCached(
  cache: ArtistLookupCache,
  ipBaseNumber: IPBaseNumber,
  creators: Creators | undefined
): Promise<ArtistLookupResult> {
  let result = cache.get(ipBaseNumber);
  if (!result) {
    result = findArtist(ipBaseNumber, creators);
    cache.set(ipBaseNumber, result);
  }
  return result;
}

function nameMatch(creator: CreatorFull, artistName: string): boolean {
  return (
    compareInsensitive(creator.creatorHebName, artistName, 'he') === 0 ||
    compareInsensitive(creator.creatorEngName, artistName, 'en') === 0
  );
}

async function findArtist(ipBaseNumber: IPBaseNumber, creators: Creators | undefined): Promise<ArtistLookupResult> {
  const creator = creators?.find(creator => creator.creatorIpBaseNumber === ipBaseNumber);
  let match: ArtistLookupResult['match'] = 'identifier';
  const artistMBID = await (async () => {
    if (!creator) {
      match = 'missing';
      return null;
    }
    const byIpi = await tryFetchJSON<ArtistSearchResultsT>(`/ws/2/artist?query=ipi:${creator.number}&limit=1&fmt=json`);
    if (byIpi && byIpi.artists.length > 0) {
      return byIpi.artists[0]!.id;
    }

    const byLink = await tryFetchJSON<UrlRelsSearchResultsT<'artist'>>(
      `/ws/2/url?resource=${creatorUrl(creator.creatorIpBaseNumber)}&inc=artist-rels&fmt=json`
    );
    if (byLink && byLink.relations.length > 0 && byLink.relations[0]!.artist.id) {
      return byLink.relations[0]!.artist.id;
    }

    const byName = await tryFetchJSON<ArtistSearchResultsT>(
      `/ws/2/artist?query=name:(${creator.creatorHebName} OR ${creator.creatorEngName})&limit=1&fmt=json`
    );
    if (byName && byName.artists.length > 0 && nameMatch(creator, byName.artists[0]!.name)) {
      match = {type: 'name', id: byName.artists[0]!.id, name: byName.artists[0]!.name};
      return byName.artists[0]!.id;
    }

    const byAlias = await tryFetchJSON<ArtistSearchResultsT>(
      `/ws/2/artist?query=alias:(${creator.creatorHebName} OR ${creator.creatorEngName})&limit=1&fmt=json`
    );
    if (
      byAlias &&
      byAlias.artists.length > 0 &&
      byAlias.artists[0]!.aliases?.some(alias => nameMatch(creator, alias.name))
    ) {
      match = {type: 'alias', id: byAlias.artists[0]!.id, name: byAlias.artists[0]!.name};
      return byAlias.artists[0]!.id;
    }

    match = 'missing';
    return null;
  })();

  if (artistMBID) {
    const artist = await tryFetchJSON<ArtistT>(`/ws/js/entity/${artistMBID}`);
    return {artist, match};
  }

  return {artist: null, match};
}
