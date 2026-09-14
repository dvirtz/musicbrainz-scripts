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

type MissingArtistWarningBase = {
  linkTypeID: ArtistLinkTypeID;
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
    })
  | (MissingArtistWarningBase & {
      type: 'artist-missing-data';
      artistId: string;
      artistName: string;
    });

export type ArtistLookupResult = {artist: ArtistT | null; warnings: ArtistWarning[]};

function nameMatch(creator: CreatorFull, artistName: string): boolean {
  return (
    compareInsensitive(creator.creatorHebName, artistName, 'he') === 0 ||
    compareInsensitive(creator.creatorEngName, artistName, 'en') === 0
  );
}

export async function findArtist(
  linkTypeID: ArtistLinkTypeID,
  ipBaseNumber: IPBaseNumber,
  creators: Creators | undefined
): Promise<ArtistLookupResult> {
  const warnings: ArtistWarning[] = [];
  const artistMBID = await (async () => {
    const creator = creators?.find(creator => creator.creatorIpBaseNumber === ipBaseNumber);
    if (!creator) {
      warnings.push({type: 'creator-not-found', ipi: ipBaseNumber});
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
      warnings.push({
        type: 'found-by-name',
        linkTypeID,
        artistId: byName.artists[0]!.id,
        artistName: byName.artists[0]!.name,
        ipi: creator.number,
        ipBaseNumber: creator.creatorIpBaseNumber,
        creatorHebName: creator.creatorHebName,
        creatorEngName: creator.creatorEngName,
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
        linkTypeID,
        artistId: byAlias.artists[0]!.id,
        artistName: byAlias.artists[0]!.name,
        ipi: creator.number,
        ipBaseNumber: creator.creatorIpBaseNumber,
        creatorHebName: creator.creatorHebName,
        creatorEngName: creator.creatorEngName,
      });
      return byAlias.artists[0]!.id;
    }

    warnings.push({
      type: 'failed-to-find',
      linkTypeID,
      ipi: creator.number,
      ipBaseNumber: creator.creatorIpBaseNumber,
      creatorHebName: creator.creatorHebName,
      creatorEngName: creator.creatorEngName,
    });
    return null;
  })();

  if (artistMBID) {
    const artist = await tryFetchJSON<ArtistT>(`/ws/js/entity/${artistMBID}`);
    return {artist, warnings};
  }

  return {artist: null, warnings};
}
