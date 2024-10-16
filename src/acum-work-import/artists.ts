import {tryFetch} from '../common/try-fetch';
import {Creators, IPBaseNumber} from './acum';
import {addWarning} from './warnings';

const artistCache = new Map<IPBaseNumber, Promise<ArtistT | null>>();

export async function findArtist(ipBaseNumber: IPBaseNumber, creators: Creators): Promise<ArtistT | null> {
  if (!artistCache.has(ipBaseNumber)) {
    const artistPromise = (async () => {
      const creator = creators.find(creator => creator.creatorIpBaseNumber === ipBaseNumber)!;
      const byIpi = (await tryFetch(`/ws/2/artist?query=ipi:${creator.number}`)) as ArtistSearchResultsT;
      if (byIpi.artists.length > 0) {
        return byIpi.artists[0].id as MBID;
      }

      const byName = (await tryFetch(
        `/ws/2/artist?query=name:(${creator.creatorHebName} OR ${creator.creatorEngName})`
      )) as ArtistSearchResultsT;
      if (byName.artists.length > 0) {
        addWarning(
          'data',
          `artist ${byName.artists[0].name} found by name search, please verify (IPI = ${creator.number})`
        );
        return byName.artists[0].id as MBID;
      }

      addWarning('data', `failed to find ${creator.creatorHebName || creator.creatorEngName}, IPI ${creator.number}`);
      return null;
    })().then(async artistMBID => (artistMBID ? ((await tryFetch(`/ws/js/entity/${artistMBID}`)) as ArtistT) : null));
    artistCache.set(ipBaseNumber, artistPromise);
  }
  return await artistCache.get(ipBaseNumber)!;
}
