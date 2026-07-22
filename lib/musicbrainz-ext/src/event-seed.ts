import {
  EVENT_HELD_AT_RELATIONSHIP_TYPE_ID,
  EVENT_HELD_IN_RELATIONSHIP_TYPE_ID,
  EVENT_IN_SERIES_RELATIONSHIP_TYPE_ID,
  EVENT_PART_OF_RELATIONSHIP_TYPE_ID,
} from '#constants.ts';
import {editNoteFormat} from '#edit-note.ts';
import type {EventDateParts} from '#event-form.ts';
import {EventForm} from '#event-form.ts';
import type {MBEntity, MBEvent, MBSeries} from '#event-types.ts';
import {linkTypeId} from '#type-info.ts';
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

  return EVENT_TYPE_IDS_BY_NAME[typeName.toLowerCase()];
}

function copyLocations(from: MBEntity, to: EventForm) {
  for (const relationship of from.relations?.filter(relationship => !relationship.url) ?? []) {
    switch (relationship.type?.toLocaleLowerCase()) {
      case 'held at':
        to.relationship({
          type: EVENT_HELD_AT_RELATIONSHIP_TYPE_ID,
          target: extractEntityTarget(relationship) ?? '',
          targetCredit: relationship['target-credit'],
        });
        break;
      case 'held in':
        to.relationship({
          type: EVENT_HELD_IN_RELATIONSHIP_TYPE_ID,
          target: extractEntityTarget(relationship) ?? '',
          targetCredit: relationship['target-credit'],
        });
    }
  }
}

export function seedSubEvent(event: MBEvent): string {
  const eventForm = new EventForm()
    .editNote(editNoteFormat(`Created from ${document.location.href}`))
    .dates({
      begin: parseDateParts(event['life-span']?.begin),
      end: parseDateParts(event['life-span']?.end),
    })
    .relationship({
      type: EVENT_PART_OF_RELATIONSHIP_TYPE_ID,
      target: event.id,
      direction: 'backward',
    });

  copyLocations(event, eventForm);

  return `/event/create?${eventForm.build().toString()}`;
}

export function seedSeriesEvent(series: MBSeries): string {
  const eventForm = new EventForm()
    .editNote(editNoteFormat(`Created from ${document.location.href}`))
    .name(series.name)
    .typeId(resolveEventTypeId(series.type) ?? '')
    .relationship({
      type: EVENT_IN_SERIES_RELATIONSHIP_TYPE_ID,
      target: series.id,
      direction: 'backward',
    });

  copyLocations(series, eventForm);

  return `/event/create?${eventForm.build().toString()}`;
}

type CloneEventRelationshipAttribute = {
  type: string;
  textValue?: string;
};

function extractEntityTarget(relation: MBEventRelation): string | undefined {
  switch (relation['target-type']) {
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
    case 'release_group':
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

export async function fetchEntityWithRelations(entityType: string, gid: string): Promise<MBEntity | null> {
  return tryFetchJSON<MBEntity>(
    `/ws/2/${entityType}/${gid}?fmt=json&inc=area-rels+artist-rels+event-rels+genre-rels+instrument-rels+label-rels+place-rels+recording-rels+release-rels+release-group-rels+series-rels+url-rels+work-rels`
  );
}

export async function seedCloneEvent(event: MBEvent): Promise<string> {
  const eventForm = new EventForm();

  eventForm.name(event.name);

  const eventTypeId = resolveEventTypeId(event.type);
  if (eventTypeId) {
    eventForm.typeId(eventTypeId);
  }

  eventForm.time(event.time);
  if (event.setlist) {
    eventForm.setlist(event.setlist);
  }
  if (event.disambiguation) {
    eventForm.comment(event.disambiguation);
  }
  if (event.cancelled !== undefined) {
    eventForm.cancelled(event.cancelled);
    eventForm.ended(event.cancelled);
  }

  eventForm.dates({
    begin: parseDateParts(event['life-span']?.begin),
    end: parseDateParts(event['life-span']?.end),
  });

  eventForm.editNote(editNoteFormat(`Cloned from ${document.location.href}`));

  for (const rel of event.relations ?? []) {
    if (rel.url) {
      const urlTypeId = await linkTypeId(rel['type-id'] ?? '');
      if (urlTypeId) {
        eventForm.urlRelationship({
          url: rel.url.resource ?? '',
          linkTypeId: urlTypeId,
        });
      }
    } else {
      eventForm.relationship(
        {
          type: rel['type-id'] ?? '',
          target: extractEntityTarget(rel) ?? '',
          direction: rel.direction,
          targetCredit: rel['target-credit'],
        },
        extractRelationshipAttributes(rel)
      );
    }
  }

  return `/event/create?${eventForm.build().toString()}`;
}
