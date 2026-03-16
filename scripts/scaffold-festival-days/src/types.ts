export type {MBEvent} from '@repo/musicbrainz-ext/event-types';

export interface MBPlace {
  id: string;
  gid: string;
  name: string;
  disambiguation?: string;
  creditName?: string;
}

export interface DateParts {
  year: string;
  month: string;
  day: string;
  dayNumber: number;
}
