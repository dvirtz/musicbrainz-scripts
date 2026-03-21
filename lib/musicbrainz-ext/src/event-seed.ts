import {EVENT_HELD_AT_RELATIONSHIP_TYPE_ID, EVENT_PART_OF_RELATIONSHIP_TYPE_ID} from '#constants.ts';
import {editNoteFormat} from '#edit-note.ts';
import type {EventDateParts} from '#event-form.ts';
import {appendEventDates, appendEventEditNote, appendRelationship} from '#event-form.ts';
import type {MBEvent} from '#event-types.ts';
import {tryFetchJSON} from '@repo/fetch/fetch';

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

export function extractParentEventSeedData(event: MBEvent): ParentEventSeedData | null {
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

export async function fetchParentEventSeedData(eventGid: string): Promise<ParentEventSeedData | null> {
  const event = await tryFetchJSON<MBEvent>(`/ws/2/event/${eventGid}?fmt=json&inc=place-rels`);

  if (!event) {
    return null;
  }

  return extractParentEventSeedData(event);
}

export function seedEvent(seedData: ParentEventSeedData): string {
  const searchParams = new URLSearchParams();

  appendEventEditNote(searchParams, editNoteFormat(`Created from ${document.location.href}`));

  appendEventDates(searchParams, {
    begin: seedData.beginDate,
    end: seedData.endDate,
  });

  appendRelationship(searchParams, 0, {
    type: EVENT_PART_OF_RELATIONSHIP_TYPE_ID,
    target: seedData.parentEventGid,
    direction: 'backward',
  });

  seedData.places.forEach((place, index) => {
    appendRelationship(searchParams, index + 1, {
      type: EVENT_HELD_AT_RELATIONSHIP_TYPE_ID,
      target: place.gid,
      targetCredit: place.credit,
    });
  });

  return `/event/create?${searchParams.toString()}`;
}
