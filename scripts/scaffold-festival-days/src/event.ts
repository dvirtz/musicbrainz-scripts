import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';

const EVENT_GID_REGEXP = new RegExp(`/event/(${MBID_REGEXP.source})`, 'i');

export function getEventGid(pathname: string = window.location.pathname): string | null {
  const match = pathname.match(EVENT_GID_REGEXP);
  return match?.[1] ?? null;
}
