import {Creator, CreatorFull, Creators, creatorUrl, IPBaseNumber, RoleCode} from '#acum.ts';
import {AddWarning} from '#ui/warnings.tsx';
import {compareInsensitive} from '@repo/musicbrainz-ext/compare';
import {tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {ArtistSearchResultsT, UrlRelsSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import {filter, from, mergeMap, tap} from 'rxjs';
import {ArtistT} from 'typedbrainz/types';

function nameMatch(creator: CreatorFull, artistName: string): boolean {
  return (
    compareInsensitive(creator.creatorHebName, artistName, 'he') === 0 ||
    compareInsensitive(creator.creatorEngName, artistName, 'en') === 0
  );
}

const artistCache = new Map<string, ArtistT>();

async function findArtist(
  ipBaseNumber: IPBaseNumber,
  creators: Creators | undefined,
  addWarning: AddWarning
): Promise<ArtistT | null> {
  const cached = artistCache.get(ipBaseNumber);
  if (cached) {
    return cached;
  }

  const artistMBID = await (async () => {
    const creator = creators?.find(creator => creator.creatorIpBaseNumber === ipBaseNumber);
    if (!creator) {
      addWarning(`failed to find creator with IPI ${ipBaseNumber}`);
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
      `/ws/2/url?resource=${creatorUrl(creator)}&inc=artist-rels&fmt=json`
    );
    if (byLink && byLink.relations.length > 0 && byLink.relations[0]!.artist.id) {
      return byLink.relations[0]!.artist.id;
    }

    const byName = await tryFetchJSON<ArtistSearchResultsT>(
      `/ws/2/artist?query=name:(${creator.creatorHebName} OR ${creator.creatorEngName})&limit=1&fmt=json`
    );
    if (byName && byName.artists.length > 0 && nameMatch(creator, byName.artists[0]!.name)) {
      addWarning(`${role} ${byName.artists[0]!.name} found by name search, please verify (IPI = ${creator.number})`);
      return byName.artists[0]!.id;
    }

    const byAlias = await tryFetchJSON<ArtistSearchResultsT>(
      `/ws/2/artist?query=alias:(${creator.creatorHebName} OR ${creator.creatorEngName})&limit=1&fmt=json`
    );
    if (
      byAlias &&
      byAlias.artists.length > 0 &&
      byAlias.artists[0]!.aliases.some(alias => nameMatch(creator, alias.name))
    ) {
      addWarning(`${role} ${byAlias.artists[0]!.name} found by alias search, please verify (IPI = ${creator.number})`);
      return byAlias.artists[0]!.id;
    }

    addWarning(`failed to find ${role} ${creator.creatorHebName || creator.creatorEngName}, IPI ${creator.number}`);
    return null;
  })();

  if (artistMBID) {
    const artist = await tryFetchJSON<ArtistT>(`/ws/js/entity/${artistMBID}`);
    if (artist) {
      artistCache.set(ipBaseNumber, artist);
      return artist;
    }
  }

  return null;
}

export async function linkArtists(
  pendingArtistCache: Map<string, Promise<ArtistT | null>>,
  writers: readonly Creator[] | undefined,
  creators: Creators | undefined,
  doLink: (artist: ArtistT) => void,
  addWarning: (message: string) => Set<string>
) {
  await executePipeline(
    from(writers || []).pipe(
      mergeMap(
        async author =>
          await (pendingArtistCache.get(author.creatorIpBaseNumber) ||
            pendingArtistCache
              .set(author.creatorIpBaseNumber, findArtist(author.creatorIpBaseNumber, creators, addWarning))
              .get(author.creatorIpBaseNumber))
      ),
      filter((artist): artist is ArtistT => artist !== null),
      tap(doLink)
    )
  );
}
