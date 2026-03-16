import {createUI} from '#ui.tsx';
import {getEventGid} from '@repo/musicbrainz-ext/event-path';

try {
  const eventGid = getEventGid();
  if (eventGid) {
    void createUI(eventGid);
  }
} catch (error) {
  console.error('[scaffold-festival-days] Error:', error);
}
