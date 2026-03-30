import {EVENT_HELD_AT_RELATIONSHIP_TYPE_ID, EVENT_PART_OF_RELATIONSHIP_TYPE_ID} from '#constants.ts';
import {editNoteFormat} from '#edit-note.ts';
import type {EventDateParts} from '#event-form.ts';
import {EventForm} from '#event-form.ts';
import type {MBEvent} from '#event-types.ts';
import {urlTypes} from '#type-info.ts';
import {tryFetchJSON} from '@repo/fetch/fetch';

type MBEventRelation = NonNullable<MBEvent['relations']>[number];
const EVENT_TYPE_IDS_BY_NAME: Record<string, string> = {
  'award ceremony': '7',
  competition: '40',
  concert: '1',
  'convention/expo': '4',
  festival: '2',
  'launch event': '3',
  'masterclass/clinic': '5',
  'stage performance': '6',
};

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

function resolveEventTypeId(typeName: string | undefined): string | undefined {
  if (!typeName) {
    return undefined;
  }

  return EVENT_TYPE_IDS_BY_NAME[typeName.trim().toLowerCase()];
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
    const gid = relation.place?.id;
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

export function seedEvent(seedData: ParentEventSeedData): string {
  const eventForm = new EventForm()
    .editNote(editNoteFormat(`Created from ${document.location.href}`))
    .dates({
      begin: seedData.beginDate,
      end: seedData.endDate,
    })
    .relationship(0, {
      type: EVENT_PART_OF_RELATIONSHIP_TYPE_ID,
      target: seedData.parentEventGid,
      direction: 'backward',
    });

  seedData.places.forEach((place, index) => {
    eventForm.relationship(index + 1, {
      type: EVENT_HELD_AT_RELATIONSHIP_TYPE_ID,
      target: place.gid,
      targetCredit: place.credit,
    });
  });

  return `/event/create?${eventForm.build().toString()}`;
}

type CloneEventRelationshipAttribute = {
  type: string;
  textValue?: string;
};

export type CloneEventRelationship =
  | {
      kind: 'entity';
      typeId: string;
      target: string;
      direction?: 'backward';
      targetCredit?: string;
      attributes?: CloneEventRelationshipAttribute[];
    }
  | {
      kind: 'url';
      typeId: string;
      url: string;
    };

export type CloneEventSeedData = {
  name: string;
  typeName?: string;
  time?: string;
  setlist?: string;
  disambiguation?: string;
  cancelled?: boolean;
  beginDate?: EventDateParts;
  endDate?: EventDateParts;
  relationships: CloneEventRelationship[];
};

function normalizeTargetType(targetType: string | undefined): string | undefined {
  return targetType?.trim().toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
}

function extractEntityTarget(relation: MBEventRelation, targetType: string): string | undefined {
  switch (targetType) {
    case 'area':
      return relation.area?.id;
    case 'artist':
      return relation.artist?.id;
    case 'event':
      return relation.event?.id;
    case 'label':
      return relation.label?.id;
    case 'place':
      return relation.place?.id;
    case 'recording':
      return relation.recording?.id;
    case 'release':
      return relation.release?.id;
    case 'release-group':
      return relation.release_group?.id;
    case 'series':
      return relation.series?.id;
    case 'work':
      return relation.work?.id;
    default:
      return undefined;
  }
}

function extractRelationshipAttributes(relation: MBEventRelation): CloneEventRelationshipAttribute[] | undefined {
  const attributesByType = new Map<string, CloneEventRelationshipAttribute>();
  const attributeIds = relation['attribute-ids'] ?? {};
  const attributeValues = relation['attribute-values'];

  if (attributeValues) {
    for (const [attrTypeOrName, textValue] of Object.entries(attributeValues)) {
      if (!textValue) {
        continue;
      }
      const type = attributeIds[attrTypeOrName] ?? attrTypeOrName;
      attributesByType.set(type, {type, textValue: String(textValue)});
    }
  }

  for (const type of Object.values(attributeIds)) {
    if (!type || attributesByType.has(type)) {
      continue;
    }
    attributesByType.set(type, {type});
  }

  const attributes = Array.from(attributesByType.values());
  return attributes.length > 0 ? attributes : undefined;
}

function extractCloneRelationship(relation: MBEventRelation): CloneEventRelationship | null {
  const typeId = relation['type-id'];
  if (!typeId) {
    return null;
  }

  const targetType = normalizeTargetType(relation['target-type']);
  if (targetType === 'url') {
    const url = relation.url?.resource?.trim();
    return url ? {kind: 'url', typeId, url} : null;
  }

  if (!targetType) {
    return null;
  }

  const target = extractEntityTarget(relation, targetType);
  if (!target) {
    return null;
  }

  return {
    kind: 'entity',
    typeId,
    target,
    direction: relation.direction === 'backward' ? 'backward' : undefined,
    targetCredit: relation['target-credit'] || undefined,
    attributes: extractRelationshipAttributes(relation),
  };
}

export function extractCloneEventSeedData(event: MBEvent): CloneEventSeedData {
  const relationships = (event.relations ?? [])
    .map(extractCloneRelationship)
    .filter((relationship): relationship is CloneEventRelationship => relationship != null);

  return {
    name: event.name,
    typeName: event.type,
    time: event.time,
    setlist: event.setlist,
    disambiguation: event.disambiguation,
    cancelled: event.cancelled,
    beginDate: parseDateParts(event['life-span']?.begin),
    endDate: parseDateParts(event['life-span']?.end ?? event['life-span']?.begin),
    relationships,
  };
}

export async function fetchEventWithRelations(eventGid: string): Promise<MBEvent | null> {
  return tryFetchJSON<MBEvent>(
    `/ws/2/event/${eventGid}?fmt=json&inc=area-rels+artist-rels+event-rels+genre-rels+instrument-rels+label-rels+place-rels+recording-rels+release-rels+release-group-rels+series-rels+url-rels+work-rels`
  );
}

export async function seedCloneEvent(seedData: CloneEventSeedData): Promise<string> {
  const eventForm = new EventForm();

  eventForm.name(seedData.name);

  const eventTypeId = resolveEventTypeId(seedData.typeName);
  if (eventTypeId) {
    eventForm.typeId(eventTypeId);
  }

  eventForm.time(seedData.time);
  if (seedData.setlist) {
    eventForm.setlist(seedData.setlist);
  }
  if (seedData.disambiguation) {
    eventForm.comment(seedData.disambiguation);
  }
  if (seedData.cancelled !== undefined) {
    eventForm.cancelled(seedData.cancelled);
    eventForm.ended(seedData.cancelled);
  }

  eventForm.dates({
    begin: seedData.beginDate,
    end: seedData.endDate,
  });

  eventForm.editNote(editNoteFormat(`Cloned from ${document.location.href}`));

  let relationshipIndex = 0;
  let urlRelationshipIndex = 0;

  for (const rel of seedData.relationships) {
    if (rel.kind === 'url') {
      const urlType = Object.values(await urlTypes).find(v => v.gid == rel.typeId);
      if (urlType) {
        eventForm.urlRelationship(urlRelationshipIndex, {
          url: rel.url,
          linkTypeId: urlType.id,
        });
        urlRelationshipIndex += 1;
      }
    } else {
      eventForm.relationship(relationshipIndex, {
        type: rel.typeId,
        target: rel.target,
        direction: rel.direction,
        targetCredit: rel.targetCredit,
      });

      rel.attributes?.forEach((attr, attrIndex) => {
        eventForm.relationshipAttribute(relationshipIndex, attrIndex, {
          type: attr.type,
          textValue: attr.textValue,
        });
      });

      relationshipIndex += 1;
    }
  }

  return `/event/create?${eventForm.build().toString()}`;
}
