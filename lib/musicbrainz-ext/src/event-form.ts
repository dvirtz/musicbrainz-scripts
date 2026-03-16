export type EventDateParts = {
  year?: string;
  month?: string;
  day?: string;
};

export function appendEventName(searchParams: URLSearchParams, name: string) {
  searchParams.append('edit-event.name', name);
}

export function appendEventTypeId(searchParams: URLSearchParams, typeId: string | number) {
  searchParams.append('edit-event.type_id', String(typeId));
}

export function appendEventSetlist(searchParams: URLSearchParams, setlist: string) {
  searchParams.append('edit-event.setlist', setlist);
}

export function appendEventTime(searchParams: URLSearchParams, time: string | undefined) {
  appendIfValue(searchParams, 'edit-event.time', time);
}

export function appendEventEditNote(searchParams: URLSearchParams, editNote: string) {
  searchParams.append('edit-event.edit_note', editNote);
}

export function appendEventUrlRelationship(
  searchParams: URLSearchParams,
  index: number,
  relationship: {url: string; linkTypeId: string | number}
) {
  const base = `edit-event.url.${index}`;
  searchParams.append(`${base}.text`, relationship.url);
  searchParams.append(`${base}.link_type_id`, String(relationship.linkTypeId));
}

function appendIfValue(searchParams: URLSearchParams, key: string, value: string | undefined) {
  if (value !== undefined && value !== '') {
    searchParams.append(key, value);
  }
}

function appendEventPeriodDate(
  searchParams: URLSearchParams,
  period: 'begin' | 'end',
  date: EventDateParts | undefined
) {
  if (!date) {
    return;
  }

  appendIfValue(searchParams, `edit-event.period.${period}_date.year`, date.year);
  appendIfValue(searchParams, `edit-event.period.${period}_date.month`, date.month);
  appendIfValue(searchParams, `edit-event.period.${period}_date.day`, date.day);
}

export function appendEventDates(searchParams: URLSearchParams, dates: {begin?: EventDateParts; end?: EventDateParts}) {
  appendEventPeriodDate(searchParams, 'begin', dates.begin);
  appendEventPeriodDate(searchParams, 'end', dates.end);
}

export function appendRelationship(
  searchParams: URLSearchParams,
  index: number,
  relationship: {type: string | number; target: string; direction?: string; targetCredit?: string}
) {
  const base = `rels.${index}`;
  searchParams.append(`${base}.type`, String(relationship.type));
  searchParams.append(`${base}.target`, relationship.target);
  // event part-of rel direction is not seeded
  // https://tickets.metabrainz.org/browse/MBS-14299
  appendIfValue(searchParams, `${base}.backward`, relationship.direction === 'backward' ? '1' : undefined);
  appendIfValue(searchParams, `${base}.targetCredit`, relationship.targetCredit);
}

export function appendTextRelationshipAttribute(
  searchParams: URLSearchParams,
  relationshipIndex: number,
  attributeIndex: number,
  attribute: {type: string | number; textValue: string}
) {
  const base = `rels.${relationshipIndex}.attributes.${attributeIndex}`;
  searchParams.append(`${base}.type`, String(attribute.type));
  searchParams.append(`${base}.text_value`, attribute.textValue);
}
