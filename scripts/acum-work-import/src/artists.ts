import {CreatorFull, Creators, creatorUrl, IPBaseNumber, RoleCode} from '#acum.ts';
import {compareInsensitive} from '@repo/musicbrainz-ext/compare';
import {tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {ArtistSearchResultsT, UrlRelsSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {ArtistT} from 'typedbrainz/types';

type MissingArtistWarningBase = {
  linkTypeID: number;
  role: string;
  ipi: string;
  ipBaseNumber: string;
  creatorHebName: string;
  creatorEngName: string;
};

export type ArtistWarning =
  | {type: 'creator-not-found'; ipi: string}
  | (MissingArtistWarningBase & {
      type: 'found-by-name';
      artistId: string;
      artistName: string;
    })
  | (MissingArtistWarningBase & {
      type: 'found-by-alias';
      artistId: string;
      artistName: string;
    })
  | (MissingArtistWarningBase & {
      type: 'failed-to-find';
    });

export type ArtistLookupResult = [ArtistT | null, ArtistWarning[]];
export type ArtistLookupCache = Map<IPBaseNumber, Promise<ArtistLookupResult>>;

function creatorMatchesArtistName(creator: CreatorFull, artistName: string): boolean {
  return (
    compareInsensitive(creator.creatorHebName, artistName, 'he') === 0 ||
    compareInsensitive(creator.creatorEngName, artistName, 'en') === 0
  );
}

function ipiMatch(creator: CreatorFull, artist: ArtistT): boolean {
  return artist.ipi_codes.some(({ipi}) => ipi === creator.number);
}

function linkMatch(creator: CreatorFull, artist: ArtistT): boolean {
  const expectedCreatorUrl = creatorUrl(creator.creatorIpBaseNumber);
  return (
    artist.relationships?.some(rel => {
      if (rel.target.entityType !== 'url') {
        return false;
      }
      return compareInsensitive(rel.target.href_url, expectedCreatorUrl, 'en') === 0;
    }) ?? false
  );
}

function aliasMatch(creator: CreatorFull, artist: ArtistT): boolean {
  return artist.primaryAlias ? creatorMatchesArtistName(creator, artist.primaryAlias) : false;
}

function matchLinkedArtist(
  linkTypeID: number,
  creator: CreatorFull,
  linkedArtists: readonly ArtistT[] | undefined
): ArtistLookupResult | undefined {
  for (const artist of linkedArtists ?? []) {
    if (ipiMatch(creator, artist) || linkMatch(creator, artist)) {
      return [artist, []];
    }
    if (creatorMatchesArtistName(creator, artist.name)) {
      return [
        artist,
        [
          buildFoundArtistWarning('found-by-name', linkTypeID, creator, {
            id: artist.gid,
            name: artist.name,
          }),
        ],
      ];
    }
    if (aliasMatch(creator, artist)) {
      return [
        artist,
        [
          buildFoundArtistWarning('found-by-alias', linkTypeID, creator, {
            id: artist.gid,
            name: artist.name,
          }),
        ],
      ];
    }
  }
}

function creatorRole(creator: CreatorFull) {
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
}

function buildFoundArtistWarning(
  type: 'found-by-name' | 'found-by-alias',
  linkTypeID: number,
  creator: CreatorFull,
  artist: {id: string; name: string}
): ArtistWarning {
  return {
    type,
    role: creatorRole(creator),
    linkTypeID,
    artistId: artist.id,
    artistName: artist.name,
    ipi: creator.number,
    ipBaseNumber: creator.creatorIpBaseNumber,
    creatorHebName: creator.creatorHebName,
    creatorEngName: creator.creatorEngName,
  };
}

function creatorSearchQuery(creator: CreatorFull, field: 'name' | 'alias'): string {
  return `${field}:(${creator.creatorHebName} OR ${creator.creatorEngName})`;
}

function isNameSearchMatch(creator: CreatorFull, artist: {name: string}): boolean {
  return creatorMatchesArtistName(creator, artist.name);
}

function isAliasSearchMatch(creator: CreatorFull, artist: {aliases?: ReadonlyArray<{name: string}>}): boolean {
  return artist.aliases?.some(alias => creatorMatchesArtistName(creator, alias.name)) ?? false;
}

async function findMatchingArtistSearchResult(
  creator: CreatorFull,
  linkTypeID: number,
  field: 'name' | 'alias'
): Promise<{artistId: string; warning: ArtistWarning} | null> {
  const result = await tryFetchJSON<ArtistSearchResultsT>(
    `/ws/2/artist?query=${creatorSearchQuery(creator, field)}&limit=1&fmt=json`
  );
  const artist = result?.artists[0];
  if (!artist) {
    return null;
  }

  const matched = field === 'name' ? isNameSearchMatch(creator, artist) : isAliasSearchMatch(creator, artist);
  if (!matched) {
    return null;
  }

  return {
    artistId: artist.id,
    warning: buildFoundArtistWarning(
      field === 'name' ? 'found-by-name' : 'found-by-alias',
      linkTypeID,
      creator,
      artist
    ),
  };
}

const artistCache = new Map<string, ArtistT>();

async function searchArtist(linkTypeID: number, creator: CreatorFull): Promise<ArtistLookupResult> {
  const fetchArtist = async (mbid: string) => tryFetchJSON<ArtistT>(`/ws/js/entity/${mbid}`);
  const byIpi = await tryFetchJSON<ArtistSearchResultsT>(`/ws/2/artist?query=ipi:${creator.number}&limit=1&fmt=json`);
  if (byIpi && byIpi.artists.length > 0) {
    return [await fetchArtist(byIpi.artists[0]!.id), []];
  }

  const byLink = await tryFetchJSON<UrlRelsSearchResultsT<'artist'>>(
    `/ws/2/url?resource=${creatorUrl(creator.creatorIpBaseNumber)}&inc=artist-rels&fmt=json`
  );
  if (byLink && byLink.relations.length > 0 && byLink.relations[0]!.artist.id) {
    return [await fetchArtist(byLink.relations[0]!.artist.id), []];
  }

  const byName = await findMatchingArtistSearchResult(creator, linkTypeID, 'name');
  if (byName) {
    return [await fetchArtist(byName.artistId), [byName.warning]];
  }

  const byAlias = await findMatchingArtistSearchResult(creator, linkTypeID, 'alias');
  if (byAlias) {
    return [await fetchArtist(byAlias.artistId), [byAlias.warning]];
  }

  return [
    null,
    [
      {
        type: 'failed-to-find',
        role: creatorRole(creator),
        linkTypeID,
        ipi: creator.number,
        ipBaseNumber: creator.creatorIpBaseNumber,
        creatorHebName: creator.creatorHebName,
        creatorEngName: creator.creatorEngName,
      },
    ],
  ];
}

export async function findArtist(
  linkTypeID: number,
  ipBaseNumber: IPBaseNumber,
  creators: Creators | undefined,
  linkedArtists?: readonly ArtistT[]
): Promise<ArtistLookupResult> {
  const cached = artistCache.get(ipBaseNumber);
  if (cached) {
    return [cached, []];
  }

  const creator = creators?.find(creator => creator.creatorIpBaseNumber === ipBaseNumber);
  if (!creator) {
    return [null, [{type: 'creator-not-found', ipi: ipBaseNumber}]];
  }

  const [artist, warnings] =
    matchLinkedArtist(linkTypeID, creator, linkedArtists) ?? (await searchArtist(linkTypeID, creator));
  if (artist) {
    artistCache.set(ipBaseNumber, artist);
  }

  return [artist, warnings];
}
