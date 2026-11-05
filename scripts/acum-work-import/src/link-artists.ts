import type {WarningStore} from '#warning-store.ts';
import {
  CreatorNotFoundWarning,
  FoundArtistWarning,
  MissingArtistWarning,
  SkippingSpecialPurposeArtistWarning,
} from '#ui/work-artist-warnings.tsx';
import type {WorkWarningContext} from '#work-warning.ts';
import {AcumWorkType} from '#acum-work-type.ts';
import {workType} from '#acum.ts';
import {ArtistLinkTypeID, ArtistLookupCache, findArtistCached} from '#artists.ts';
import {addArtistRelationship} from '#relationships.ts';
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

import {ArtistT, RelationshipTargetTypeGroupsT} from 'typedbrainz/types';

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
  linkTypeID: ArtistLinkTypeID,
  context: WorkWarningContext,
  store: WarningStore,
  doLink: (linkTypeID: number, artist: ArtistT) => void
): Promise<void> {
  const {track} = context;
  const writers = (() => {
    switch (linkTypeID) {
      case ARRANGER_LINK_TYPE_ID:
        return track.arrangers;
      case COMPOSER_LINK_TYPE_ID:
        return [...(track.composers ?? []), ...(track.composersAndAuthors ?? [])];
      case TRANSLATOR_LINK_TYPE_ID:
        return track.translators;
      case LYRICIST_LINK_TYPE_ID:
      case WRITER_LINK_TYPE_ID:
        return [...(track.authors ?? []), ...(track.composersAndAuthors ?? [])];
    }
  })();
  await Promise.all(
    (writers ?? []).map(async author => {
      const {artist, match} = await findArtistCached(pendingArtistCache, author.creatorIpBaseNumber, track.creators);
      if (artist) doLink(linkTypeID, artist);
      const creator = track.creators?.find(creator => creator.creatorIpBaseNumber === author.creatorIpBaseNumber);
      if (!creator) {
        store.add(new CreatorNotFoundWarning(context, author.creatorIpBaseNumber));
      } else if (match === 'missing') {
        store.add(new MissingArtistWarning(context, linkTypeID, creator, store));
      } else if (match !== 'identifier') {
        store.add(
          new FoundArtistWarning(
            context,
            linkTypeID,
            creator,
            store,
            match.id,
            match.name,
            match.type === 'name' ? 'was found by name' : 'was found by an alias'
          )
        );
      }
    })
  );
}

export async function linkArrangers(
  artistCache: ArtistLookupCache,
  context: WorkWarningContext,
  store: WarningStore
): Promise<void> {
  const {recording} = context;
  if (!recording) return;
  await linkArtists(artistCache, ARRANGER_LINK_TYPE_ID, context, store, (linkTypeID, artist) =>
    addArtistRelationship(recording, linkTypeID, artist)
  );
}

export async function linkWriters(
  artistCache: ArtistLookupCache,
  context: WorkWarningContext,
  store: WarningStore,
  workTargetTypeGroups?: RelationshipTargetTypeGroupsT
): Promise<void> {
  const {track, work} = context;
  assertRelationshipEditor(MB?.relationshipEditor);

  const authors =
    linkedArtists(
      workTargetTypeGroups ?? findTargetTypeGroups(MB.relationshipEditor.state.relationshipsBySource, work)
    ) ?? [];
  const doLink = (linkTypeID: number, artist: ArtistT) => {
    if (SPECIAL_PURPOSE_ARTISTS.includes(artist.gid) && authors.length > 0) {
      store.add(new SkippingSpecialPurposeArtistWarning(context, artist.name));
      return;
    }
    if (authors.some(existing => existing.gid === artist.gid)) {
      console.log(`skipping adding existing author ${artist.name} to work ${work.name}`);
      return;
    }
    addArtistRelationship(work, linkTypeID, artist);
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
  await linkArtists(artistCache, authorLinkTypeId, context, store, doLink);
  await linkArtists(artistCache, COMPOSER_LINK_TYPE_ID, context, store, doLink);
  await linkArtists(artistCache, TRANSLATOR_LINK_TYPE_ID, context, store, doLink);
}
