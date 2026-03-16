import {createEventRelationships, createPartOfRelationship, createSubEvent} from './api.ts';
import type {DateParts, MBEvent, MBPlace} from './types.ts';

export interface StatusMessage {
  message: string;
  kind: 'info' | 'error';
}

function parseDateParts(value: string | undefined): {year: string; month: string; day: string} | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return null;
  }

  return {year, month, day};
}

function hasChildSubEvents(event: MBEvent): boolean {
  return (event.relations ?? []).some(
    relation => relation.type === 'parts' && relation.direction === 'forward' && relation['target-type'] === 'event'
  );
}

export function shouldShowScaffoldUI(event: MBEvent | null): event is MBEvent {
  return event != null && event.type === 'Festival' && deriveDates(event).length > 0 && !hasChildSubEvents(event);
}

export function isSingleDayFestival(event: MBEvent): boolean {
  return deriveDates(event).length === 1;
}

export function deriveDates(event: MBEvent): DateParts[] {
  const beginParts = parseDateParts(event['life-span']?.begin);
  const endParts = parseDateParts(event['life-span']?.end ?? event['life-span']?.begin);
  if (!beginParts || !endParts) {
    return [];
  }

  const startDate = new Date(Date.UTC(Number(beginParts.year), Number(beginParts.month) - 1, Number(beginParts.day)));
  const endDate = new Date(Date.UTC(Number(endParts.year), Number(endParts.month) - 1, Number(endParts.day)));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    return [];
  }

  const dates: DateParts[] = [];
  for (let current = startDate, dayNumber = 1; current <= endDate; dayNumber += 1) {
    const year = String(current.getUTCFullYear());
    const month = String(current.getUTCMonth() + 1).padStart(2, '0');
    const day = String(current.getUTCDate()).padStart(2, '0');
    dates.push({year, month, day, dayNumber});
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return dates;
}

export async function scaffoldFestivalDays(params: {
  event: MBEvent;
  places: MBPlace[];
  selectedPlaceIds: string[];
  selectedDayPlaceKeys?: string[];
  onStatus: (status: StatusMessage) => void;
  dayWord?: string;
}): Promise<boolean> {
  const {event, places, selectedPlaceIds, selectedDayPlaceKeys, onStatus, dayWord = 'Day'} = params;
  const parentEventGid = event.gid || event.id;
  const dates = deriveDates(event);
  const allowedDayPlaceKeys = selectedDayPlaceKeys ? new Set(selectedDayPlaceKeys) : null;

  if (dates.length === 0) {
    onStatus({
      message: 'Could not determine event dates. Please add full begin/end dates first.',
      kind: 'error',
    });
    return false;
  }

  const placeByGid = new Map(places.map(place => [place.gid, place]));
  const selectedPlaces = selectedPlaceIds.map(gid => placeByGid.get(gid)).filter(Boolean) as MBPlace[];

  if (dates.length === 1) {
    const singleDate = dates[0];
    if (!singleDate) {
      onStatus({message: 'Could not determine the festival date.', kind: 'error'});
      return false;
    }

    if (selectedPlaces.length === 0) {
      onStatus({message: 'Select or add at least one place for a single-day festival.', kind: 'error'});
      return false;
    }

    for (const place of selectedPlaces) {
      const venueName = `${event.name}: ${place.creditName ?? place.name}`;
      const venueEventGid = await createSubEvent({
        name: venueName,
        begin: singleDate,
        end: singleDate,
        editNote: `Scaffold festival days: created place event for single-day festival (${parentEventGid})`,
      });

      if (!venueEventGid) {
        onStatus({message: `Failed to create ${venueName}.`, kind: 'error'});
        return false;
      }

      const venueRelationshipCreated = await createEventRelationships({
        childEventGid: venueEventGid,
        parentEventGid,
        placeGid: place.gid,
        placeCreditName: place.creditName,
        editNote: `Scaffold festival days: linked place event ${venueEventGid} to festival ${parentEventGid} and place ${place.gid}`,
      });
      if (!venueRelationshipCreated) {
        onStatus({message: `Failed to create relationships for ${venueName}.`, kind: 'error'});
        return false;
      }

      onStatus({message: `Created: ${venueName}`, kind: 'info'});
    }

    onStatus({message: 'Festival days scaffolding complete!', kind: 'info'});
    return true;
  }

  const createdDayEvents: Array<{gid: string; date: DateParts}> = [];

  for (const date of dates) {
    const dayName = `${event.name}, ${dayWord} ${date.dayNumber}`;
    const dayEventGid = await createSubEvent({
      name: dayName,
      begin: date,
      end: date,
      editNote: `Scaffold festival days: created day for festival (${parentEventGid})`,
    });

    if (!dayEventGid) {
      onStatus({message: `Failed to create ${dayName}.`, kind: 'error'});
      return false;
    }

    const dayRelationshipCreated = await createPartOfRelationship({
      childEventGid: dayEventGid,
      parentEventGid,
      editNote: `Scaffold festival days: linked day ${dayEventGid} to festival ${parentEventGid}`,
    });
    if (!dayRelationshipCreated) {
      onStatus({message: `Failed to create part-of relationship for ${dayName}.`, kind: 'error'});
      return false;
    }

    createdDayEvents.push({gid: dayEventGid, date});
    onStatus({message: `Created: ${dayName}`, kind: 'info'});
  }

  if (selectedPlaces.length > 0) {
    for (const dayEvent of createdDayEvents) {
      for (const place of selectedPlaces) {
        const dayPlaceKey = `${dayEvent.date.dayNumber}|${place.gid}`;
        if (allowedDayPlaceKeys && !allowedDayPlaceKeys.has(dayPlaceKey)) {
          continue;
        }

        const venueName = `${event.name}, ${dayWord} ${dayEvent.date.dayNumber}: ${place.creditName ?? place.name}`;
        const venueEventGid = await createSubEvent({
          name: venueName,
          begin: dayEvent.date,
          end: dayEvent.date,
          editNote: `Scaffold festival days: created venue day for ${dayEvent.gid}`,
        });

        if (!venueEventGid) {
          onStatus({message: `Failed to create ${venueName}.`, kind: 'error'});
          return false;
        }
        const venueRelationshipCreated = await createEventRelationships({
          childEventGid: venueEventGid,
          parentEventGid: dayEvent.gid,
          placeGid: place.gid,
          placeCreditName: place.creditName,
          editNote: `Scaffold festival days: linked venue event ${venueEventGid} to day ${dayEvent.gid} and place ${place.gid}`,
        });
        if (!venueRelationshipCreated) {
          onStatus({message: `Failed to create relationships for ${venueName}.`, kind: 'error'});
          return false;
        }

        onStatus({message: `Created: ${venueName}`, kind: 'info'});
      }
    }
  }

  onStatus({message: 'Festival days scaffolding complete!', kind: 'info'});
  return true;
}
