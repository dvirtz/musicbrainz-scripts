import {tryLookup} from '@repo/musicbrainz-ext/api-client';
import {seedSubEvent} from '@repo/musicbrainz-ext/event-seed';
import {
  EVENT_RELATION_INCLUDES,
  SERIES_RELATION_INCLUDES,
  SUB_EVENT_INCLUDES,
  type EventWithSubEvents,
} from '@repo/musicbrainz-ext/event-api-types';

type EventRelation = EventWithSubEvents['relations'][number];

export async function fetchEntityWithRelations(entityType: 'event' | 'series', gid: string) {
  return entityType === 'event'
    ? await tryLookup('event', gid, {inc: EVENT_RELATION_INCLUDES})
    : await tryLookup('series', gid, {inc: SERIES_RELATION_INCLUDES});
}

export type ChildEventSummary = {
  gid: string;
  name: string;
  type?: string;
  beginDate?: string;
  endDate?: string;
  time?: string;
};

export type EventDetails = {
  gid: string;
  name: string;
  type?: string;
  status?: string;
  beginDate?: string;
  endDate?: string;
  time?: string;
  places: string[];
  subEventSeed: string;
  childEvents: ChildEventSummary[];
};

function isChildEventRelation(relation: EventRelation): relation is Extract<EventRelation, {'target-type': 'event'}> {
  if (relation['target-type'] !== 'event') {
    return false;
  }

  if (relation.type === 'parts') {
    return relation.direction === 'forward';
  }

  if (relation.type === 'part of') {
    return relation.direction !== 'backward';
  }

  return false;
}

function formatStatus(event: EventWithSubEvents): string | undefined {
  if (event.cancelled) {
    return 'Cancelled';
  }

  return undefined;
}

function normalizeTime(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function compareOptionalStrings(a?: string, b?: string): number {
  if (!a && !b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  return a.localeCompare(b, undefined, {sensitivity: 'base'});
}

function normalizePlaceLabel(relation: EventRelation): string | null {
  if (relation['target-type'] !== 'place') {
    return null;
  }

  const creditedName = relation['target-credit'].trim();
  if (creditedName) {
    return creditedName;
  }

  const placeName = relation.place.name.trim();
  return placeName || null;
}

function parseChildEvents(relations: ReadonlyArray<EventRelation>): ChildEventSummary[] {
  const seen = new Set<string>();
  const children: ChildEventSummary[] = [];

  for (const relation of relations) {
    if (!isChildEventRelation(relation)) {
      continue;
    }

    const relatedEvent = relation.event;
    const gid = relatedEvent.id;
    if (!gid || seen.has(gid)) {
      continue;
    }

    seen.add(gid);
    children.push({
      gid,
      name: relatedEvent.name.trim() || gid,
      type: relatedEvent.type ?? undefined,
      beginDate: relatedEvent['life-span'].begin ?? undefined,
      endDate: relatedEvent['life-span'].end ?? undefined,
      time: normalizeTime(relatedEvent.time),
    });
  }

  return children.sort((a, b) => {
    const byDate = compareOptionalStrings(a.beginDate, b.beginDate);
    if (byDate !== 0) {
      return byDate;
    }

    const byTime = compareOptionalStrings(a.time, b.time);
    if (byTime !== 0) {
      return byTime;
    }

    return a.name.localeCompare(b.name, undefined, {sensitivity: 'base'});
  });
}

export async function fetchEventDetails(eventGid: string): Promise<EventDetails | null> {
  const event = await tryLookup('event', eventGid, {inc: SUB_EVENT_INCLUDES});
  if (!event) {
    return null;
  }

  const places = new Set<string>();
  for (const relation of event.relations) {
    const label = normalizePlaceLabel(relation);
    if (label) {
      places.add(label);
    }
  }

  return {
    gid: event.id,
    name: event.name,
    type: event.type ?? undefined,
    status: formatStatus(event),
    beginDate: event['life-span'].begin ?? undefined,
    endDate: event['life-span'].end ?? undefined,
    time: normalizeTime(event.time),
    places: Array.from(places),
    subEventSeed: seedSubEvent(event),
    childEvents: parseChildEvents(event.relations),
  };
}
