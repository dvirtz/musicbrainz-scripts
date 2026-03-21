import {injectAddSubEventLink} from '#sidebar-link.ts';
import {getEventGid} from '@repo/musicbrainz-ext/event-path';
import {fetchParentEventSeedData, seedEvent} from '@repo/musicbrainz-ext/event-seed';

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
