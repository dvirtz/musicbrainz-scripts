// cspell:words joinphrase
import {
  MBArtistCredit as Credit,
  MBEntityReference as Entity,
  MBRelationship as Relation,
  MBRelease as Release,
  MBTrack as Track,
} from '@repo/musicbrainz-ext/web-service-types';
import {
  relationshipAttributeCatalog,
  RelationshipAttributeCatalog as AttributeCatalog,
} from '@repo/musicbrainz-ext/type-info';
import {editNoteFormat} from '@repo/musicbrainz-ext/edit-note';
import {SidebarLink} from '@repo/musicbrainz-ext/sidebar-link';
import {
  EVENT_CONDUCTOR_RELATIONSHIP_TYPE_ID,
  EVENT_ENGINEER_RELATIONSHIP_TYPE_ID,
  EVENT_ORCHESTRA_RELATIONSHIP_TYPE_ID,
  EVENT_RECORDING_LOCATION_RELATIONSHIP_TYPE_ID,
  SPECIAL_PURPOSE_ARTIST_IDS,
  EVENT_GUEST_PERFORMER_RELATIONSHIP_TYPE_ID,
  EVENT_HELD_AT_RELATIONSHIP_TYPE_ID,
  EVENT_HELD_IN_RELATIONSHIP_TYPE_ID,
  EVENT_MAIN_PERFORMER_RELATIONSHIP_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {parseDateParts} from '@repo/musicbrainz-ext/date';
import {EventForm} from '@repo/musicbrainz-ext/event-form';
import {createSetlistItem, serializeSetlist, SetlistCredit} from '@repo/musicbrainz-ext/setlist';

const PERFORMANCE_ROLES = new Set(['instrument', 'vocal', 'performer', 'orchestra', 'conductor']);

export async function releaseSidebarLinks(release: Release): Promise<SidebarLink[]> {
  if (!isLiveRelease(release)) return [];
  const catalog = await relationshipAttributeCatalog();
  const seed = buildEventSeed(release, editNoteFormat(`Seeded event from ${location.href}`), catalog);
  return [
    {
      id: 'release-to-event-link',
      text: 'Create or update event',
      url: seed,
    },
  ];
}

function realArtist(entity: Entity) {
  return !SPECIAL_PURPOSE_ARTIST_IDS.has(entity.id);
}

function artistRole(rel: Relation): number | undefined {
  if (rel.type?.includes('engineer')) return EVENT_ENGINEER_RELATIONSHIP_TYPE_ID;
  if (rel.type === 'conductor') return EVENT_CONDUCTOR_RELATIONSHIP_TYPE_ID;
  if (!PERFORMANCE_ROLES.has(rel.type ?? '')) return undefined;
  if (rel.type === 'orchestra' || rel.artist?.type === 'Orchestra') return EVENT_ORCHESTRA_RELATIONSHIP_TYPE_ID;
  return rel.attributes?.includes('guest')
    ? EVENT_GUEST_PERFORMER_RELATIONSHIP_TYPE_ID
    : EVENT_MAIN_PERFORMER_RELATIONSHIP_TYPE_ID;
}

function eventIds(relations: Relation[]) {
  return new Set(relations.filter(rel => rel.type === 'recorded at' && rel.event).map(rel => rel.event!.id));
}

function selectEvent(release: Release, tracks: Track[]) {
  let candidates = eventIds(release.relations);
  if (!candidates.size) {
    const recordings = [...new Map(tracks.map(track => [track.recording.id, track.recording])).values()];
    candidates = eventIds(recordings[0]!.relations ?? []);
    for (const recording of recordings.slice(1)) {
      const ids = eventIds(recording.relations ?? []);
      candidates = new Set([...candidates].filter(id => ids.has(id)));
    }
  }
  if (candidates.size > 1)
    throw new Error(
      `Multiple events match this release: ${[...candidates].join(', ')}. Resolve the event links first.`
    );
  return [...candidates][0];
}

function mergeDate(current: string | undefined, incoming: string | null | undefined): string | undefined {
  if (!incoming) return current;
  if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(incoming)) throw new Error(`Invalid source date: ${incoming}`);
  if (!current) return incoming;
  if (!current.startsWith(incoming) && !incoming.startsWith(current))
    throw new Error(`Conflicting recording/performance dates: ${current} and ${incoming}.`);
  return current.length >= incoming.length ? current : incoming;
}

function setlistCredits(credits: Credit[]): SetlistCredit[] {
  return credits
    .filter(credit => realArtist(credit.artist))
    .map((credit, index, all) => ({
      mbid: credit.artist.id,
      name: credit.name ?? credit.artist.name ?? '',
      joinPhrase: index === all.length - 1 ? '' : credit.joinphrase || ' & ',
    }));
}

function buildSetlist(release: Release, tracks: Track[]) {
  const entries = tracks.map(track => {
    const item = createSetlistItem(
      track.title,
      setlistCredits(track['artist-credit'] ?? track.recording['artist-credit'] ?? release['artist-credit'])
    );
    const works = (track.recording.relations ?? [])
      .filter(rel => rel.type === 'performance' && rel.work)
      .sort((a, b) => (a['ordering-key'] ?? 0) - (b['ordering-key'] ?? 0));
    if (works.length)
      item.works = works.map((rel, index) => ({
        mbid: rel.work!.id,
        name: rel.work!.title ?? rel.work!.name ?? track.title,
        joinPhrase: index === works.length - 1 ? '' : ' / ',
      }));
    return item;
  });
  return serializeSetlist({entries, original: '', baseline: ''});
}

function isLiveRelease(release: Pick<Release, 'release-group'>) {
  return release['release-group']?.['secondary-types']?.includes('Live') === true;
}

function prepareSource(release: Release) {
  if (!isLiveRelease(release)) throw new Error('Event Seeder only supports live releases.');
  const tracks = [...release.media]
    .sort((a, b) => a.position - b.position)
    .flatMap(medium => [...medium.tracks].sort((a, b) => a.position - b.position));
  if (!tracks.length) throw new Error('This release has no recordings.');
  if (tracks.some(track => !track.recording?.id))
    throw new Error('The release contains a track without recording data.');
  const eventId = selectEvent(release, tracks);
  const recordings = [...new Map(tracks.map(track => [track.recording.id, track.recording])).values()];
  const relations = [...release.relations, ...recordings.flatMap(recording => recording.relations ?? [])];
  const locations = relations.filter(
    rel => (rel.type === 'recorded at' && rel.place) || (rel.type === 'recorded in' && rel.area)
  );
  if (new Set(locations.filter(rel => rel.place).map(rel => rel.place!.id)).size > 1)
    throw new Error('The source names multiple recording venues. Resolve the venue conflict first.');
  if (new Set(locations.filter(rel => rel.area).map(rel => rel.area!.id)).size > 1)
    throw new Error('The source names multiple recording areas. Resolve the location conflict first.');
  return {release, tracks, eventId, recordings, relations, locations};
}

type SeedSource = ReturnType<typeof prepareSource>;

function eventDates({relations, locations}: SeedSource) {
  let begin: string | undefined;
  let end: string | undefined;
  for (const rel of relations) {
    if (
      !locations.includes(rel) &&
      !(rel.work && rel.type === 'performance') &&
      !(rel.artist && (PERFORMANCE_ROLES.has(rel.type ?? '') || rel.type === 'recording'))
    )
      continue;
    begin = mergeDate(begin, rel.begin);
    end = mergeDate(end, rel.end);
  }
  if (
    begin &&
    end &&
    begin.slice(0, Math.min(begin.length, end.length)) > end.slice(0, Math.min(begin.length, end.length))
  )
    throw new Error('Conflicting recording/performance dates: end precedes begin.');
  return {begin: parseDateParts(begin ?? end), end: parseDateParts(end ?? begin)};
}

function eventName({release, eventId, locations}: SeedSource) {
  if (eventId) return undefined;
  const place = locations.find(rel => rel.place);
  const artist = release['artist-credit']
    .filter(credit => realArtist(credit.artist))
    .map(credit => `${credit.name ?? credit.artist.name ?? ''}${credit.joinphrase ?? ''}`)
    .join('')
    .trim();
  return place && artist ? `${artist} at ${place['target-credit'] || place.place!.name}` : release.title;
}

function eventRelationships(
  {release, tracks, recordings, relations, locations}: SeedSource,
  catalog: AttributeCatalog
) {
  const relationships: Array<Parameters<EventForm['relationship']>> = [];
  const seeded = new Set<string>();
  function add(type: number, target: Entity, rel?: Relation, backward = false) {
    const attributes = Object.entries(rel?.['attribute-ids'] ?? {})
      .filter(([, gid]) => catalog.get(type)?.has(gid))
      .map(([name, gid]) => ({type: gid, textValue: rel?.['attribute-values']?.[name]}));
    const relationship = {
      type,
      target: target.id,
      direction: backward ? 'backward' : undefined,
      targetCredit: rel?.['target-credit'],
    };
    const key = JSON.stringify([relationship, attributes]);
    if (seeded.has(key)) return;
    seeded.add(key);
    relationships.push([relationship, attributes]);
  }
  for (const track of tracks) {
    for (const credit of track['artist-credit'] ?? track.recording['artist-credit'] ?? release['artist-credit']) {
      if (realArtist(credit.artist))
        add(
          credit.artist.type === 'Orchestra'
            ? EVENT_ORCHESTRA_RELATIONSHIP_TYPE_ID
            : EVENT_MAIN_PERFORMER_RELATIONSHIP_TYPE_ID,
          credit.artist,
          {type: '', 'target-credit': credit.name},
          true
        );
    }
  }
  for (const rel of relations) {
    if (locations.includes(rel))
      add(
        rel.place ? EVENT_HELD_AT_RELATIONSHIP_TYPE_ID : EVENT_HELD_IN_RELATIONSHIP_TYPE_ID,
        (rel.place ?? rel.area)!,
        rel
      );
    if (!rel.artist || !realArtist(rel.artist)) continue;
    const role = artistRole(rel);
    if (role) add(role, rel.artist, rel, true);
  }
  for (const recording of recordings) add(EVENT_RECORDING_LOCATION_RELATIONSHIP_TYPE_ID, recording);
  return relationships;
}

function buildEventSeed(release: Release, editNote: string, catalog: AttributeCatalog = new Map()): string {
  const source = prepareSource(release);
  return new EventForm()
    .setlist(buildSetlist(release, source.tracks))
    .editNote(editNote)
    .name(eventName(source))
    .typeId(source.eventId ? undefined : 1)
    .dates(eventDates(source))
    .relationships(eventRelationships(source, catalog))
    .buildUrl(source.eventId ? `/event/${source.eventId}/edit` : '/event/create');
}
