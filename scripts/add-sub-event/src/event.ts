import {tryFetchJSON} from '@repo/fetch/fetch';
import type {EventDateParts} from '@repo/musicbrainz-ext/event-form';
import {MBEvent} from '@repo/musicbrainz-ext/event-types';

export type PlaceSeedData = {
  gid: string;
  credit?: string;
};

export type ParentEventSeedData = {
  parentEventGid: string;
  beginDate?: EventDateParts;
  endDate?: EventDateParts;
  places: PlaceSeedData[];
};

function parseDateParts(value: string | undefined): EventDateParts | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) {
    return undefined;
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
}

export async function fetchParentEventSeedData(eventGid: string): Promise<ParentEventSeedData | null> {
  const event = await tryFetchJSON<MBEvent>(`/ws/2/event/${eventGid}?fmt=json&inc=place-rels`);

  if (!event) {
    return null;
  }

  const parentEventGid = event.gid ?? event.id;
  if (!parentEventGid) {
    return null;
  }

  const seenIds = new Set<string>();
  const places: PlaceSeedData[] = [];
  for (const relation of event.relations ?? []) {
    if (relation['target-type'] !== 'place') {
      continue;
    }
    const gid = relation.place?.gid ?? relation.place?.id;
    if (!gid || seenIds.has(gid)) {
      continue;
    }
    seenIds.add(gid);
    const credit = relation['target-credit'];
    places.push(credit ? {gid, credit} : {gid});
  }

  return {
    parentEventGid,
    beginDate: parseDateParts(event['life-span']?.begin),
    endDate: parseDateParts(event['life-span']?.end ?? event['life-span']?.begin),
    places,
  };
}
