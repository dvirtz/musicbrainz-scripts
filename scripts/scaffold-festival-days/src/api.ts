import type {MBEvent, MBPlace} from '#types.ts';
import {fetchResponse} from '@repo/fetch/fetch';
import {
  EDIT_RELATIONSHIP_CREATE,
  EVENT_HELD_AT_RELATIONSHIP_TYPE_ID,
  EVENT_PART_OF_RELATIONSHIP_TYPE_ID,
  MBID_REGEXP,
  PLACE_PART_OF_RELATIONSHIP_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {EventForm} from '@repo/musicbrainz-ext/event-form';
import {tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {linkTypeGid} from '@repo/musicbrainz-ext/type-info';
import PLazy from 'p-lazy';
import {filter, firstValueFrom, from, map, mergeAll, mergeMap, Observable, startWith, toArray} from 'rxjs';

const heldAtTypeGid = PLazy.from(async () => linkTypeGid(EVENT_HELD_AT_RELATIONSHIP_TYPE_ID));
const partOfTypeGid = PLazy.from(async () => linkTypeGid(PLACE_PART_OF_RELATIONSHIP_TYPE_ID));

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
  relations?: Array<{
    'type-id'?: number | string;
    type?: string;
    direction?: string;
    'target-type'?: string;
    'target-credit': string;
    place?: {
      id: string;
      name: string;
      disambiguation?: string;
    };
  }>;
};

function toMBPlace(place: {id: string; name: string; disambiguation?: string; creditName?: string}): MBPlace {
  return {
    ...place,
  };
}

export async function fetchEvent(eventGid: string): Promise<MBEvent | null> {
  return await tryFetchJSON<MBEvent>(`/ws/2/event/${eventGid}?fmt=json&inc=event-rels%20place-rels`);
}

async function getSubPlaces(place: MBPlace): Promise<Observable<MBPlace>> {
  const response = await tryFetchJSON<MBPlaceLookupResponse>(`/ws/2/place/${place.id}?fmt=json&inc=place-rels`);

  const partOfId = await partOfTypeGid;

  return from(response?.relations ?? []).pipe(
    filter(relation => relation['type-id'] == partOfId),
    map(relation => toMBPlace({...relation.place!, creditName: relation['target-credit']})),
    mergeMap(async place => (await getSubPlaces(place)).pipe(startWith(place))),
    mergeAll()
  );
}

export async function getLinkedPlacesFromEvent(event: MBEvent): Promise<MBPlace[]> {
  const heldAtId = await heldAtTypeGid;

  return firstValueFrom(
    from(event.relations ?? []).pipe(
      filter(relation => relation['type-id'] == heldAtId),
      map(relation =>
        toMBPlace({
          ...relation.place!,
          creditName: relation['target-credit'],
        })
      ),
      mergeMap(async place => (await getSubPlaces(place)).pipe(startWith(place))),
      mergeAll(),
      toArray()
    )
  );
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

  const formData = new EventForm()
    .name(name)
    .comment('')
    .setlist('')
    .dates({
      begin,
      end,
    })
    .ended(end !== undefined)
    .cancelled(false)
    .editNote(editNote)
    .build();

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
