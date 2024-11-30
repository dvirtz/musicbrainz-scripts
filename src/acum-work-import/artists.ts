import {tryFetchJSON} from 'src/common/musicbrainz/fetch';
import {CreatorFull, Creators, IPBaseNumber} from './acum';
import {AddWarning} from './ui/warnings';

function nameMatch(creator: CreatorFull, artist: ArtistSearchResultsT['artists'][number]): boolean {
  const removePunctuation = (name: string) => name.replace(/\p{P}/gu, '');
  return [removePunctuation(creator.creatorHebName), removePunctuation(creator.creatorEngName)].includes(
    removePunctuation(artist.name)
  );
}

export async function findArtist(
  ipBaseNumber: IPBaseNumber,
  creators: Creators,
  addWarning: AddWarning
): Promise<ArtistT | null> {
  const artistMBID = await (async () => {
    const creator = creators.find(creator => creator.creatorIpBaseNumber === ipBaseNumber)!;
    const byIpi = await tryFetchJSON<ArtistSearchResultsT>(`/ws/2/artist?query=ipi:${creator.number}&limit=1&fmt=json`);
    if (byIpi && byIpi.artists.length > 0) {
      return byIpi.artists[0].id;
    }

    const byName = await tryFetchJSON<ArtistSearchResultsT>(
      `/ws/2/artist?query=name:(${creator.creatorHebName} OR ${creator.creatorEngName})&limit=1&fmt=json`
    );
    if (byName && byName.artists.length > 0 && nameMatch(creator, byName.artists[0])) {
      addWarning(`artist ${byName.artists[0].name} found by name search, please verify (IPI = ${creator.number})`);
      return byName.artists[0].id;
    }

    addWarning(`failed to find ${creator.creatorHebName || creator.creatorEngName}, IPI ${creator.number}`);
    return null;
  })();

  return artistMBID ? await tryFetchJSON<ArtistT>(`/ws/js/entity/${artistMBID}`) : null;
}
