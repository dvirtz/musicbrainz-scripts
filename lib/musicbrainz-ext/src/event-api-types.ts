import type {Event, RelInclude, Series} from '@dvirtz/musicbrainz/api-types';

export const EVENT_RELATION_INCLUDES = [
  'area-rels',
  'artist-rels',
  'event-rels',
  'instrument-rels',
  'label-rels',
  'place-rels',
  'recording-rels',
  'release-rels',
  'release-group-rels',
  'series-rels',
  'url-rels',
  'work-rels',
] satisfies RelInclude[];

export const SERIES_RELATION_INCLUDES = ['area-rels', 'event-rels', 'place-rels'] satisfies RelInclude[];

export type EventWithRelations = Event<(typeof EVENT_RELATION_INCLUDES)[number]>;
export type SeriesWithRelations = Series<(typeof SERIES_RELATION_INCLUDES)[number]>;

export const SUB_EVENT_INCLUDES = ['event-rels', 'place-rels'] satisfies RelInclude[];

export type EventWithSubEvents = Event<(typeof SUB_EVENT_INCLUDES)[number]>;
