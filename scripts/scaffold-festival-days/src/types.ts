import type {MinimalPlace} from '@dvirtz/musicbrainz/api-types';

export type {EventWithSubEvents} from '@repo/musicbrainz-ext/event-api-types';

export interface MBPlace extends MinimalPlace {
  creditName?: string;
}

export interface DateParts {
  year: string;
  month: string;
  day: string;
  dayNumber: number;
}
