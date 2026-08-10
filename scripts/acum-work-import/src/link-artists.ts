import {AcumWorkType} from '#acum-work-type.ts';
import {Creator, Creators, WorkBean, workType} from '#acum.ts';
import {ArtistLookupCache, ArtistWarning, findArtist} from '#artists.ts';
import {addArrangerRelationship, addWriterRelationship} from '#relationships.ts';
import {assertRelationshipEditor} from '@repo/musicbrainz-ext/asserts';
import {compareTargetTypeWithGroup} from '@repo/musicbrainz-ext/compare';
import {
  ARRANGER_LINK_TYPE_ID,
  COMPOSER_LINK_TYPE_ID,
  LYRICIST_LINK_TYPE_ID,
  TRANSLATOR_LINK_TYPE_ID,
  WRITER_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {findTargetTypeGroups, iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {
  connect,
  filter,
  firstValueFrom,
  from,
  ignoreElements,
  map,
  merge,
  mergeAll,
  mergeMap,
  tap,
  toArray,
} from 'rxjs';
import {ArtistT, RecordingT, RelationshipTargetTypeGroupsT, WorkT} from 'typedbrainz/types';

export type WriterLinkWarning = ArtistWarning | {type: 'skipping-special-purpose'; artistName: string};

const SPECIAL_PURPOSE_ARTISTS = [
  '9be7f096-97ec-4615-8957-8d40b5dcbc41', // [traditional]
  'f731ccc4-e22a-43af-a747-64213329e088', // [unknown]
];

function linkedArtists(targetTypeGroups: RelationshipTargetTypeGroupsT | null): readonly ArtistT[] | undefined {
  if (!targetTypeGroups) {
    return;
  }
  const targetTypeGroup = MB?.tree?.find(targetTypeGroups, 'artist', compareTargetTypeWithGroup, null);
  if (targetTypeGroup) {
    return iterateRelationshipsInTargetTypeGroup(targetTypeGroup)
      .filter(rel => rel.entity0.entityType === 'artist')
      .map(rel => rel.entity0 as ArtistT)
      .toArray();
  }
}

async function linkArtists(
  pendingArtistCache: ArtistLookupCache,
  writers: readonly Creator[] | undefined,
  creators: Creators | undefined,
  linkTypeID: number,
  doLink: (linkTypeID: number, artist: ArtistT) => void
): Promise<ArtistWarning[]> {
  return await firstValueFrom(
    from(writers || []).pipe(
      mergeMap(
        async author =>
          await (pendingArtistCache.get(author.creatorIpBaseNumber) ||
            pendingArtistCache
              .set(author.creatorIpBaseNumber, findArtist(linkTypeID, author.creatorIpBaseNumber, creators))
              .get(author.creatorIpBaseNumber)!)
      ),
      connect(shared =>
        merge(
          shared.pipe(
            map(result => result.artist),
            filter((artist): artist is ArtistT => !!artist),
            tap(artist => doLink(linkTypeID, artist)),
            ignoreElements()
          ),
          shared.pipe(
            map(result => result.warnings),
            mergeAll(),
            toArray()
          )
        )
      )
    )
  );
}

export async function linkArrangers(
  artistCache: ArtistLookupCache,
  recording: RecordingT,
  arrangers: ReadonlyArray<Creator> | undefined,
  creators: Creators | undefined
): Promise<ArtistWarning[]> {
  return await linkArtists(artistCache, arrangers, creators, ARRANGER_LINK_TYPE_ID, (linkTypeID, artist) =>
    addArrangerRelationship(recording, artist)
  );
}

export async function linkWriters(
  artistCache: ArtistLookupCache,
  track: WorkBean,
  work: WorkT,
  workTargetTypeGroups?: RelationshipTargetTypeGroupsT
): Promise<WriterLinkWarning[]> {
  assertRelationshipEditor(MB?.relationshipEditor);

  const authors =
    linkedArtists(
      workTargetTypeGroups ?? findTargetTypeGroups(MB.relationshipEditor.state.existingRelationshipsBySource, work)
    ) ?? [];
  const doLinkWarnings: WriterLinkWarning[] = [];
  const doLink = (linkTypeID: number, artist: ArtistT) => {
    if (SPECIAL_PURPOSE_ARTISTS.includes(artist.gid) && authors.length > 0) {
      doLinkWarnings.push({type: 'skipping-special-purpose', artistName: artist.name});
      return;
    }
    if (authors.some(existing => existing.gid === artist.gid)) {
      console.log(`skipping adding existing author ${artist.name} to work ${work.name}`);
      return;
    }
    addWriterRelationship(work, artist, linkTypeID);
  };

  const authorLinkTypeId = await (async () => {
    switch (await workType(track)) {
      case AcumWorkType.PopularSong:
      case AcumWorkType.OriginalSongFor4PartChoir:
        return LYRICIST_LINK_TYPE_ID;
      default:
        return WRITER_LINK_TYPE_ID;
    }
  })();
  const authorWarnings = await linkArtists(
    artistCache,
    [...(track.authors ?? []), ...(track.composersAndAuthors ?? [])],
    track.creators,
    authorLinkTypeId,
    doLink
  );
  const composerWarnings = await linkArtists(
    artistCache,
    [...(track.composers ?? []), ...(track.composersAndAuthors ?? [])],
    track.creators,
    COMPOSER_LINK_TYPE_ID,
    doLink
  );
  const translatorWarnings = await linkArtists(
    artistCache,
    track.translators,
    track.creators,
    TRANSLATOR_LINK_TYPE_ID,
    doLink
  );
  return [...doLinkWarnings, ...authorWarnings, ...composerWarnings, ...translatorWarnings];
}
