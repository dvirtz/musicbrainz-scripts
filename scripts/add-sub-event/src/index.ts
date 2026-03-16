import {getEventGid} from '@repo/musicbrainz-ext/event-path';
import {fetchParentEventSeedData} from './event.ts';
import {seedEvent} from './seed-event.ts';
import {injectAddSubEventLink} from './sidebar-link.ts';

async function main() {
  const eventGid = getEventGid();
  if (!eventGid) {
    return;
  }

  const seedData = await fetchParentEventSeedData(eventGid);
  if (!seedData) {
    return;
  }

  const createUrl = seedEvent(seedData);
  injectAddSubEventLink(createUrl);
}

void main().catch(error => {
  console.error('[add-sub-event] Error:', error);
});
