import {compareInsensitive, tryFetchJSON} from 'musicbrainz-ext';
import {filter, from, mergeMap, tap} from 'rxjs';
import {executePipeline} from 'rxjs-ext';
import {Creator, CreatorFull, Creators, creatorUrl, IPBaseNumber, RoleCode} from './acum';
import {AddWarning} from './ui/warnings';

function nameMatch(creator: CreatorFull, artistName: string): boolean {
  return (
    compareInsensitive(creator.creatorHebName, artistName, 'he') === 0 ||
    compareInsensitive(creator.creatorEngName, artistName, 'en') === 0
  );
}

async function findArtist(
  ipBaseNumber: IPBaseNumber,
  creators: Creators | undefined,
  addWarning: AddWarning
): Promise<ArtistT | null> {
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
      return byIpi.artists[0].id;
    }

    const byLink = await tryFetchJSON<UrlRelsSearchResultsT<'artist'>>(
      `/ws/2/url?resource=${creatorUrl(creator)}&inc=artist-rels&fmt=json`
    );
    if (byLink && byLink.relations[0].artist.id) {
      return byLink.relations[0].artist.id;
    }

    const byName = await tryFetchJSON<ArtistSearchResultsT>(
      `/ws/2/artist?query=name:(${creator.creatorHebName} OR ${creator.creatorEngName})&limit=1&fmt=json`
    );
    if (byName && byName.artists.length > 0 && nameMatch(creator, byName.artists[0].name)) {
      addWarning(`${role} ${byName.artists[0].name} found by name search, please verify (IPI = ${creator.number})`);
      return byName.artists[0].id;
    }

    const byAlias = await tryFetchJSON<ArtistSearchResultsT>(
      `/ws/2/artist?query=alias:(${creator.creatorHebName} OR ${creator.creatorEngName})&limit=1&fmt=json`
    );
    if (
      byAlias &&
      byAlias.artists.length > 0 &&
      byAlias.artists[0].aliases.some(alias => nameMatch(creator, alias.name))
    ) {
      addWarning(`${role} ${byAlias.artists[0].name} found by alias search, please verify (IPI = ${creator.number})`);
      return byAlias.artists[0].id;
    }

    addWarning(`failed to find ${role} ${creator.creatorHebName || creator.creatorEngName}, IPI ${creator.number}`);
    return null;
  })();

  return artistMBID ? await tryFetchJSON<ArtistT>(`/ws/js/entity/${artistMBID}`) : null;
}

export async function linkArtists(
  artistCache: Map<string, Promise<ArtistT | null>>,
  writers: readonly Creator[] | undefined,
  creators: Creators | undefined,
  doLink: (artist: ArtistT) => void,
  addWarning: (message: string) => Set<string>
) {
  await executePipeline(
    from(writers || []).pipe(
      mergeMap(
        async author =>
          await (artistCache.get(author.creatorIpBaseNumber) ||
            artistCache
              .set(author.creatorIpBaseNumber, findArtist(author.creatorIpBaseNumber, creators, addWarning))
              .get(author.creatorIpBaseNumber))
      ),
      filter((artist): artist is ArtistT => artist !== null),
      tap(doLink)
    )
  );
}
