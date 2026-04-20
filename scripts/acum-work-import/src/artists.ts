import {CreatorFull, Creators, creatorUrl, IPBaseNumber, RoleCode} from '#acum.ts';
import {compareInsensitive} from '@repo/musicbrainz-ext/compare';
import {tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {ArtistSearchResultsT, UrlRelsSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {ArtistT} from 'typedbrainz/types';

export type ArtistWarning =
  | {type: 'creator-not-found'; ipi: string}
  | {type: 'found-by-name'; role: string; artistId: string; artistName: string; ipi: string; ipBaseNumber: string}
  | {type: 'found-by-alias'; role: string; artistId: string; artistName: string; ipi: string; ipBaseNumber: string}
  | {type: 'failed-to-find'; role: string; creatorName: string; ipi: string; ipBaseNumber: string};

export type ArtistLookupResult = {artist: ArtistT | null; warnings: ArtistWarning[]};
export type ArtistLookupCache = Map<IPBaseNumber, Promise<ArtistLookupResult>>;

function nameMatch(creator: CreatorFull, artistName: string): boolean {
  return (
    compareInsensitive(creator.creatorHebName, artistName, 'he') === 0 ||
    compareInsensitive(creator.creatorEngName, artistName, 'en') === 0
  );
}

const artistCache = new Map<string, ArtistT>();

export async function findArtist(
  ipBaseNumber: IPBaseNumber,
  creators: Creators | undefined
): Promise<ArtistLookupResult> {
  const cached = artistCache.get(ipBaseNumber);
  if (cached) {
    return {artist: cached, warnings: []};
  }

  const warnings: ArtistWarning[] = [];
  const artistMBID = await (async () => {
    const creator = creators?.find(creator => creator.creatorIpBaseNumber === ipBaseNumber);
    if (!creator) {
      warnings.push({type: 'creator-not-found', ipi: ipBaseNumber});
      return null;
    }
    const role = (() => {
      switch (creator.roleCode) {
        case RoleCode.Composer:
          return 'composer';
        case RoleCode.Author:
          return 'lyricist';
        case RoleCode.Arranger:
          return 'arranger';
        case RoleCode.Translator:
          return 'translator';
        case RoleCode.ComposerAndAuthor:
          return 'composer and lyricist';
      }
    })();
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
      warnings.push({
        type: 'found-by-name',
        role,
        artistId: byName.artists[0]!.id,
        artistName: byName.artists[0]!.name,
        ipi: creator.number,
        ipBaseNumber: creator.creatorIpBaseNumber,
      });
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
      warnings.push({
        type: 'found-by-alias',
        role,
        artistId: byAlias.artists[0]!.id,
        artistName: byAlias.artists[0]!.name,
        ipi: creator.number,
        ipBaseNumber: creator.creatorIpBaseNumber,
      });
      return byAlias.artists[0]!.id;
    }

    const creatorName = creator.creatorHebName || creator.creatorEngName || creator.number;
    warnings.push({
      type: 'failed-to-find',
      role,
      creatorName,
      ipi: creator.number,
      ipBaseNumber: creator.creatorIpBaseNumber,
    });
    return null;
  })();

  if (artistMBID) {
    const artist = await tryFetchJSON<ArtistT>(`/ws/js/entity/${artistMBID}`);
    if (artist) {
      artistCache.set(ipBaseNumber, artist);
      return {artist, warnings};
    }
  }

  return {artist: null, warnings};
}
