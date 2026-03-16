import type {ParentEventSeedData} from '#event.ts';
import {EVENT_HELD_AT_RELATIONSHIP_TYPE_ID, EVENT_PART_OF_RELATIONSHIP_TYPE_ID} from '@repo/musicbrainz-ext/constants';
import {editNoteFormat} from '@repo/musicbrainz-ext/edit-note';
import {appendEventDates, appendEventEditNote, appendRelationship} from '@repo/musicbrainz-ext/event-form';

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
