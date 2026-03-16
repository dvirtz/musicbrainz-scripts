import type {MBEvent, MBPlace} from '#types.ts';
import {fetchResponse, tryFetchJSON} from '@repo/fetch/fetch';
import {
  EDIT_RELATIONSHIP_CREATE,
  EVENT_HELD_AT_RELATIONSHIP_TYPE_ID,
  EVENT_PART_OF_RELATIONSHIP_TYPE_ID,
  MBID_REGEXP,
} from '@repo/musicbrainz-ext/constants';
import {
  appendEventCancelled,
  appendEventComment,
  appendEventDates,
  appendEventEditNote,
  appendEventEnded,
  appendEventName,
  appendEventSetlist,
} from '@repo/musicbrainz-ext/event-form';

const PLACE_URL_REGEXP = new RegExp(`/place/(${MBID_REGEXP.source})`, 'i');

type MBPlaceSearchResponse = {
  places?: Array<{
    id?: string;
    name?: string;
    disambiguation?: string;
  }>;
};

type MBPlaceLookupResponse = {
  id?: string;
  name?: string;
  disambiguation?: string;
};

export async function fetchEvent(eventGid: string): Promise<MBEvent | null> {
  return await tryFetchJSON<MBEvent>(`/ws/2/event/${eventGid}?fmt=json&inc=event-rels%20place-rels`);
}

export function getLinkedPlacesFromEvent(event: MBEvent): MBPlace[] {
  const uniquePlaces = new Map<string, MBPlace>();

  for (const relation of event.relations ?? []) {
    if (relation['target-type'] !== 'place' || !relation.place) {
      continue;
    }

    const place = relation.place;
    if (!place.id || !place.name) {
      continue;
    }

    const placeGid = place.gid || place.id;

    // Deduplicate by gid in case the event has multiple relations to the same place.
    const creditName = relation['target-credit']?.trim() || undefined;

    uniquePlaces.set(placeGid, {
      id: place.id,
      gid: placeGid,
      name: place.name,
      disambiguation: typeof place.disambiguation === 'string' ? place.disambiguation : undefined,
      creditName: creditName,
    });
  }

  return Array.from(uniquePlaces.values());
}

export function extractPlaceGid(input: string): string | null {
  const trimmed = input.trim();
  const mbidMatch = trimmed.match(MBID_REGEXP);
  if (mbidMatch?.[0]) {
    return mbidMatch[0];
  }

  const urlMatch = trimmed.match(PLACE_URL_REGEXP);
  return urlMatch?.[1] ?? null;
}

export async function fetchPlaceByGid(placeGid: string): Promise<MBPlace | null> {
  const response = await tryFetchJSON<MBPlaceLookupResponse>(`/ws/2/place/${placeGid}?fmt=json`);
  if (!response?.id || !response.name) {
    return null;
  }

  return {
    id: response.id,
    gid: response.id,
    name: response.name,
    disambiguation: response.disambiguation,
  };
}

export async function searchPlaces(query: string): Promise<MBPlace[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const response = await tryFetchJSON<MBPlaceSearchResponse>(
    `/ws/2/place?query=${encodeURIComponent(trimmedQuery)}&fmt=json&limit=10`
  );

  return (response?.places ?? [])
    .filter((place): place is Required<Pick<MBPlace, 'id' | 'name'>> & Partial<Pick<MBPlace, 'disambiguation'>> =>
      Boolean(place.id && place.name)
    )
    .map(place => ({
      id: place.id,
      gid: place.id,
      name: place.name,
      disambiguation: place.disambiguation,
    }));
}

export async function createSubEvent(params: {
  name: string;
  begin: {year: string; month: string; day: string};
  end: {year: string; month: string; day: string};
  editNote: string;
}): Promise<string | null> {
  const {name, begin, end, editNote} = params;

  const formData = new URLSearchParams();
  appendEventName(formData, name);
  appendEventComment(formData, '');
  appendEventSetlist(formData, '');
  appendEventDates(formData, {
    begin,
    end,
  });
  appendEventEnded(formData, end !== undefined);
  appendEventCancelled(formData, false);
  appendEventEditNote(formData, editNote);

  try {
    const response = await fetchResponse('/event/create', {
      method: 'POST',
      body: formData,
    });

    const mbidFromUrl = response.url.match(MBID_REGEXP)?.[0];
    if (mbidFromUrl) {
      return mbidFromUrl;
    }

    try {
      const data = (await response.json()) as {mbid?: string};
      if (data.mbid && MBID_REGEXP.test(data.mbid)) {
        return data.mbid;
      }
    } catch {
      // Ignore non-JSON responses; URL-based extraction above is preferred.
    }
  } catch (error) {
    console.error('Failed to create sub-event:', error);
    return null;
  }

  console.error('Failed to parse created event MBID from response');
  return null;
}

export async function createEventRelationships(params: {
  childEventGid: string;
  parentEventGid?: string;
  placeGid?: string;
  placeCreditName?: string;
  editNote: string;
}): Promise<boolean> {
  const {childEventGid, parentEventGid, placeGid, placeCreditName, editNote} = params;

  const edits: Array<{
    edit_type: number;
    linkTypeID: number;
    entities: Array<{entityType: 'event' | 'place'; gid: string; name: string}>;
    attributes: never[];
    entity0_credit: string;
    entity1_credit: string;
    ended: boolean;
  }> = [];

  if (parentEventGid) {
    edits.push({
      edit_type: EDIT_RELATIONSHIP_CREATE,
      linkTypeID: EVENT_PART_OF_RELATIONSHIP_TYPE_ID,
      entities: [
        {entityType: 'event', gid: parentEventGid, name: ''},
        {entityType: 'event', gid: childEventGid, name: ''},
      ],
      attributes: [],
      entity0_credit: '',
      entity1_credit: '',
      ended: false,
    });
  }

  if (placeGid) {
    edits.push({
      edit_type: EDIT_RELATIONSHIP_CREATE,
      linkTypeID: EVENT_HELD_AT_RELATIONSHIP_TYPE_ID,
      entities: [
        {entityType: 'event', gid: childEventGid, name: ''},
        {entityType: 'place', gid: placeGid, name: ''},
      ],
      attributes: [],
      entity0_credit: '',
      entity1_credit: placeCreditName ?? '',
      ended: false,
    });
  }

  if (edits.length === 0) {
    return true;
  }

  const payload = {
    edits,
    makeVotable: false,
    editNote,
  };

  try {
    await fetchResponse('/ws/js/edit/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    console.error('Failed to create event relationships:', error);
    return false;
  }
}

export async function createPartOfRelationship(params: {
  childEventGid: string;
  parentEventGid: string;
  editNote: string;
}): Promise<boolean> {
  return await createEventRelationships(params);
}
