import {filter, from, lastValueFrom, mergeMap, tap} from 'rxjs';
import {compareInsensitive} from 'src/common/lib/compare';
import {tryFetchJSON} from 'src/common/musicbrainz/fetch';
import {Creator, CreatorFull, Creators, IPBaseNumber, RoleCode} from './acum';
import {AddWarning} from './ui/warnings';

function nameMatch(creator: CreatorFull, artist: ArtistSearchResultsT['artists'][number]): boolean {
  return (
    compareInsensitive(creator.creatorHebName, artist.name, 'he') === 0 ||
    compareInsensitive(creator.creatorEngName, artist.name, 'en') === 0
  );
}

async function findArtist(
  ipBaseNumber: IPBaseNumber,
  creators: Creators,
  addWarning: AddWarning
): Promise<ArtistT | null> {
  const artistMBID = await (async () => {
    const creator = creators.find(creator => creator.creatorIpBaseNumber === ipBaseNumber)!;
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

    const byName = await tryFetchJSON<ArtistSearchResultsT>(
      `/ws/2/artist?query=name:(${creator.creatorHebName} OR ${creator.creatorEngName})&limit=1&fmt=json`
    );
    if (byName && byName.artists.length > 0 && nameMatch(creator, byName.artists[0])) {
      addWarning(`${role} ${byName.artists[0].name} found by name search, please verify (IPI = ${creator.number})`);
      return byName.artists[0].id;
    }

    addWarning(`failed to find ${role} ${creator.creatorHebName || creator.creatorEngName}, IPI ${creator.number}`);
    return null;
  })();

  return artistMBID ? await tryFetchJSON<ArtistT>(`/ws/js/entity/${artistMBID}`) : null;
}

export async function linkArtists(
  artistCache: Map<string, Promise<ArtistT | null>>,
  writers: readonly Creator[] | undefined,
  creators: Creators,
  doLink: (artist: ArtistT) => void,
  addWarning: (message: string) => Set<string>
) {
  await lastValueFrom(
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
    ),
    {
      defaultValue: null,
    }
  );
}
