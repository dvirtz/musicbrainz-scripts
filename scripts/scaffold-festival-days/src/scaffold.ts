import {createSubEvent} from '#api.ts';
import type {DateParts, MBEvent, MBPlace} from '#types.ts';
import {editNoteFormat} from '@repo/musicbrainz-ext/edit-note';

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
  return event != null && (event.type === 'Festival' || deriveDates(event).length > 1) && !hasChildSubEvents(event);
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
  customEditNote?: string;
  seedOnly: boolean;
}): Promise<boolean> {
  const {
    event,
    places,
    selectedPlaceIds,
    selectedDayPlaceKeys,
    onStatus,
    dayWord = 'Day',
    customEditNote,
    seedOnly,
  } = params;
  const buildEditNote = (generatedScriptNote: string) => {
    const formattedGeneratedScriptNote = editNoteFormat(generatedScriptNote);
    const trimmedCustomEditNote = customEditNote?.trim();
    if (!trimmedCustomEditNote) {
      return formattedGeneratedScriptNote;
    }

    return `${trimmedCustomEditNote}\n\n${formattedGeneratedScriptNote}`;
  };
  const parentEventGid = event.id;
  const dates = deriveDates(event);
  const allowedDayPlaceKeys = selectedDayPlaceKeys ? new Set(selectedDayPlaceKeys) : null;

  if (dates.length === 0) {
    onStatus({
      message: 'Could not determine event dates. Please add full begin/end dates first.',
      kind: 'error',
    });
    return false;
  }

  const placeByGid = new Map(places.map(place => [place.id, place]));
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
      const venueName = `${event.name}: ${place.creditName || place.name}`;
      const venueEventGid = await createSubEvent(
        venueName,
        singleDate,
        singleDate,
        buildEditNote(`Scaffold festival days: created place event for single-day festival (${parentEventGid})`),
        seedOnly,
        parentEventGid,
        {gid: place.id, creditName: place.creditName}
      );

      if (!venueEventGid && !seedOnly) {
        onStatus({message: `Failed to create ${venueName}.`, kind: 'error'});
        return false;
      }

      onStatus({message: `Created: ${venueName}`, kind: 'info'});
    }

    onStatus({message: 'Festival days scaffolding complete!', kind: 'info'});
    return true;
  }

  for (const date of dates) {
    const dayPlaces = selectedPlaces.filter(place => {
      const dayPlaceKey = `${date.dayNumber}|${place.id}`;
      return !allowedDayPlaceKeys || allowedDayPlaceKeys.has(dayPlaceKey);
    });
    if (selectedPlaces.length > 0 && dayPlaces.length === 0) {
      continue;
    }

    const singleDayPlace = selectedPlaces.length === 1 ? dayPlaces[0] : undefined;

    const dayName = `${event.name}, ${dayWord} ${date.dayNumber}`;
    const dayEventGid = await createSubEvent(
      dayName,
      date,
      date,
      buildEditNote(`Scaffold festival days: created day for festival (${parentEventGid})`),
      seedOnly,
      parentEventGid,
      singleDayPlace ? {gid: singleDayPlace.id, creditName: singleDayPlace.creditName} : undefined
    );

    if (!dayEventGid && !seedOnly) {
      onStatus({message: `Failed to create ${dayName}.`, kind: 'error'});
      return false;
    }

    onStatus({message: `Created: ${dayName}`, kind: 'info'});

    if (singleDayPlace) {
      continue;
    }

    for (const place of dayPlaces) {
      const venueName = `${event.name}, ${dayWord} ${date.dayNumber}: ${place.creditName || place.name}`;
      // seed parentId to 0 which to the user to update
      const venueParentGid = dayEventGid ?? (seedOnly ? '0' : undefined);
      const venueEventGid = await createSubEvent(
        venueName,
        date,
        date,
        buildEditNote(`Scaffold festival days: created venue day for ${dayEventGid}`),
        seedOnly,
        venueParentGid,
        {gid: place.id, creditName: place.creditName}
      );

      if (!venueEventGid && !seedOnly) {
        onStatus({message: `Failed to create ${venueName}.`, kind: 'error'});
        return false;
      }

      onStatus({message: `Created: ${venueName}`, kind: 'info'});
    }
  }

  onStatus({message: 'Festival days scaffolding complete!', kind: 'info'});
  return true;
}
