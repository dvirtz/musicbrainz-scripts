// cspell: ignore joinphrase

import {SourceTrackArtistCredit} from '#release-artist-actions.ts';
import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {fetchJSON, fetchResponse, tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {EditorRelease, getRelease} from '@repo/musicbrainz-ext/release-editor';
import {ArtistCreditT, MediumT, ReleaseT} from 'typedbrainz/types';

type Ws2Track = {
  artistCredit?: ArtistCreditT;
  position: number;
};

type Ws2Medium = {
  position: number;
  'track-count'?: number;
  tracks?: Ws2Track[];
};

export type Ws2Release = {
  'artist-credit'?: Ws2ArtistCreditName[];
  country?: string;
  date?: string;
  disambiguation?: string;
  id: string;
  media?: Ws2Medium[];
  title: string;
  'track-count'?: number;
};

type Ws2ArtistCreditName = {
  artist?: {
    name?: string;
  };
  joinphrase?: string;
  name?: string;
};

export function formatArtistCredit(names: Ws2ArtistCreditName[] | undefined) {
  return (names ?? [])
    .map(name => `${name.name ?? name.artist?.name ?? ''}${name.joinphrase ?? ''}`)
    .join('')
    .trim();
}

const mediumUrlPattern = new RegExp(`/medium/(${MBID_REGEXP.source})`);
const releaseDiscUrlPattern = new RegExp(`/release/(${MBID_REGEXP.source})/disc/(\\d+)`);

export async function getReleaseGroupSources() {
  const release: EditorRelease = getRelease();
  const releaseGroup = release.releaseGroup();
  if (typeof releaseGroup.gid !== 'string') {
    return [];
  }

  const response = await tryFetchJSON<{releases?: Ws2Release[]}>(
    `/ws/2/release?release-group=${releaseGroup.gid}&inc=artist-credits+media&fmt=json`
  );
  return (response?.releases ?? []).filter(source => source.id !== release.gid);
}

export async function getSourceRelease(value: string) {
  const source = await parseSource(value);
  if (!source) {
    throw new Error('Paste a release or medium MBID or URL.');
  }

  const release = await tryFetchJSON<ReleaseT>(`/ws/js/release/${source.releaseId}`);
  if (!release) {
    throw new Error('The source release could not be found.');
  }

  const sourceMediums = source.mediumPosition
    ? release.mediums?.filter(medium => medium.position === source.mediumPosition)
    : release.mediums;
  return {
    mediumPosition: source.mediumPosition,
    release: await releaseWithMediums(release, sourceMediums),
    sourceUrl: source.sourceUrl,
  };
}

export function getSourceTrackArtistCredits(release: ReleaseT, mediumPosition?: number): SourceTrackArtistCredit[] {
  return (release.mediums ?? [])
    .filter(medium => mediumPosition === undefined || medium.position === mediumPosition)
    .flatMap(medium =>
      (medium.tracks ?? []).flatMap(track =>
        track.artistCredit
          ? [
              {
                artistCredit: track.artistCredit,
                mediumPosition: medium.position,
                trackPosition: track.position,
              },
            ]
          : []
      )
    );
}

async function parseSource(value: string) {
  const mediumMatch = value.match(mediumUrlPattern);
  if (mediumMatch) {
    const response = await fetchResponse(`/medium/${mediumMatch[1]}`);
    const discMatch = response.url.match(releaseDiscUrlPattern);
    if (!discMatch) {
      throw new Error('The medium could not be resolved to a release disc.');
    }
    return {
      mediumPosition: Number(discMatch[2]),
      releaseId: discMatch[1]!,
      sourceUrl: releaseSourceUrl(discMatch[1]!, Number(discMatch[2])),
    };
  }

  const discMatch = value.match(releaseDiscUrlPattern);
  if (discMatch) {
    return {
      mediumPosition: Number(discMatch[2]),
      releaseId: discMatch[1]!,
      sourceUrl: releaseSourceUrl(discMatch[1]!, Number(discMatch[2])),
    };
  }

  const releaseId = value.match(MBID_REGEXP)?.[0];
  return releaseId ? {releaseId, sourceUrl: releaseSourceUrl(releaseId)} : undefined;
}

function releaseSourceUrl(releaseId: string, mediumPosition?: number) {
  return `${window.location.origin}/release/${releaseId}${mediumPosition ? `/disc/${mediumPosition}` : ''}`;
}

async function releaseWithMediums(release: ReleaseT, mediums: readonly MediumT[] | undefined): Promise<ReleaseT> {
  return {
    ...release,
    mediums: await Promise.all((mediums ?? []).map(fetchMediumFromJsMedium)),
  };
}

async function fetchMediumFromJsMedium(medium: MediumT): Promise<MediumT> {
  return await fetchJSON<MediumT>(`/ws/js/medium/${medium.id}`);
}
