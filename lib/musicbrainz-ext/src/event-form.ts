export type EventDateParts = {
  year?: string;
  month?: string;
  day?: string;
};

export class EventForm {
  private relationshipCount: number = 0;
  private urlCount: number = 0;
  private searchParams: URLSearchParams;

  constructor(searchParams?: URLSearchParams) {
    this.searchParams = searchParams || new URLSearchParams();
  }

  name(value: string): this {
    this.searchParams.append('edit-event.name', value);
    return this;
  }

  comment(value: string): this {
    this.searchParams.append('edit-event.comment', value);
    return this;
  }

  typeId(value: string | number): this {
    this.searchParams.append('edit-event.type_id', String(value));
    return this;
  }

  setlist(value: string): this {
    this.searchParams.append('edit-event.setlist', value);
    return this;
  }

  ended(value: boolean): this {
    this.searchParams.append('edit-event.period.ended', value ? '1' : '0');
    return this;
  }

  cancelled(value: boolean): this {
    this.searchParams.append('edit-event.cancelled', value ? '1' : '0');
    return this;
  }

  time(value: string | undefined): this {
    appendIfValue(this.searchParams, 'edit-event.time', value);
    return this;
  }

  editNote(value: string): this {
    this.searchParams.append('edit-event.edit_note', value);
    return this;
  }

  urlRelationship(relationship: {url: string; linkTypeId: number}): this {
    const base = `edit-event.url.${this.urlCount++}`;
    this.searchParams.append(`${base}.text`, relationship.url);
    this.searchParams.append(`${base}.link_type_id`, String(relationship.linkTypeId));
    return this;
  }

  dates(dates: {begin?: EventDateParts; end?: EventDateParts}): this {
    this.addEventPeriodDate('begin', dates.begin);
    this.addEventPeriodDate('end', dates.end);
    return this;
  }

  private addEventPeriodDate(period: 'begin' | 'end', date: EventDateParts | undefined): void {
    if (!date) {
      return;
    }
    appendIfValue(this.searchParams, `edit-event.period.${period}_date.year`, date.year);
    appendIfValue(this.searchParams, `edit-event.period.${period}_date.month`, date.month);
    appendIfValue(this.searchParams, `edit-event.period.${period}_date.day`, date.day);
  }

  relationship(
    relationship: {type: string | number; target: string; direction?: string; targetCredit?: string},
    attributes?: readonly {type: string | number; textValue?: string}[],
    options?: {postSyntax: boolean}
  ): this {
    const {postSyntax = false} = options ?? {};
    const base = `${postSyntax ? 'edit-event.rel' : `rels`}.${this.relationshipCount++}`;
    this.searchParams.append(`${base}.${postSyntax ? 'link_type_id' : 'type'}`, String(relationship.type));
    this.searchParams.append(`${base}.target`, relationship.target);
    // event part-of rel direction is not seeded
    // https://tickets.metabrainz.org/browse/MBS-14299
    appendIfValue(this.searchParams, `${base}.backward`, relationship.direction === 'backward' ? '1' : undefined);
    appendIfValue(this.searchParams, `${base}.target_credit`, relationship.targetCredit);
    attributes?.forEach((attribute, index) => {
      const attrBase = `${base}.attributes.${index}`;
      this.searchParams.append(`${attrBase}.${postSyntax ? 'type.gid' : 'type'}`, String(attribute.type));
      appendIfValue(this.searchParams, `${attrBase}.text_value`, attribute.textValue);
    });
    return this;
  }

  build(): URLSearchParams {
    return this.searchParams;
  }
}

function appendIfValue(searchParams: URLSearchParams, key: string, value: string | undefined) {
  if (value !== undefined && value !== '') {
    searchParams.append(key, value);
  }
}
