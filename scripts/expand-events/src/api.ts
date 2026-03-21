import {extractParentEventSeedData, ParentEventSeedData} from '@repo/musicbrainz-ext/event-seed';
import type {MBEvent} from '@repo/musicbrainz-ext/event-types';
import {tryFetchJSON} from '@repo/musicbrainz-ext/fetch';

type MBEventRelation = NonNullable<MBEvent['relations']>[number];

export type ChildEventSummary = {
  gid: string;
  name: string;
  type?: string;
  beginDate?: string;
  endDate?: string;
};

export type EventDetails = {
  gid: string;
  name: string;
  type?: string;
  status?: string;
  beginDate?: string;
  endDate?: string;
  places: string[];
  seedData: ParentEventSeedData;
  childEvents: ChildEventSummary[];
};

function isChildEventRelation(relation: MBEventRelation): boolean {
  if (relation['target-type'] && relation['target-type'] !== 'event') {
    return false;
  }

  if (relation.type === 'parts') {
    return relation.direction === 'forward';
  }

  if (relation.type === 'part of') {
    return !relation.direction || relation.direction !== 'backward';
  }

  return false;
}

function formatStatus(event: MBEvent): string | undefined {
  if (event.cancelled) {
    return 'Cancelled';
  }

  return undefined;
}

function normalizePlaceLabel(relation: MBEventRelation): string | null {
  if (relation['target-type'] !== 'place') {
    return null;
  }

  const creditedName = relation['target-credit']?.trim();
  if (creditedName) {
    return creditedName;
  }

  const placeName = relation.place?.name?.trim();
  return placeName || null;
}

function parseChildEvents(relations: ReadonlyArray<MBEventRelation>): ChildEventSummary[] {
  const seen = new Set<string>();
  const children: ChildEventSummary[] = [];

  for (const relation of relations) {
    if (!isChildEventRelation(relation)) {
      continue;
    }

    const relatedEvent = relation.event;
    const gid = relatedEvent?.id ?? null;
    if (!gid || seen.has(gid)) {
      continue;
    }

    seen.add(gid);
    children.push({
      gid,
      name: relatedEvent?.name?.trim() || gid,
      type: relation.event?.type,
      beginDate: relation.event?.['life-span']?.begin,
      endDate: relation.event?.['life-span']?.end,
    });
  }

  return children;
}

export async function fetchEventDetails(eventGid: string): Promise<EventDetails | null> {
  const event = await tryFetchJSON<MBEvent>(`/ws/2/event/${eventGid}?fmt=json&inc=event-rels%20place-rels`);
  if (!event) {
    return null;
  }

  const gid = event.gid ?? event.id;
  const seedData = extractParentEventSeedData(event);
  if (!gid || !seedData) {
    return null;
  }

  const places = new Set<string>();
  for (const relation of event.relations ?? []) {
    const label = normalizePlaceLabel(relation);
    if (label) {
      places.add(label);
    }
  }

  return {
    gid,
    name: event.name ?? gid,
    type: event.type,
    status: formatStatus(event),
    beginDate: event['life-span']?.begin,
    endDate: event['life-span']?.end,
    places: Array.from(places),
    seedData,
    childEvents: parseChildEvents(event.relations ?? []),
  };
}
