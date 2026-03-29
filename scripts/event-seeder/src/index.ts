import {injectEventSidebarLinks} from '#sidebar-link.ts';
import {getEventGid} from '@repo/musicbrainz-ext/event-path';
import {
  extractCloneEventSeedData,
  extractParentEventSeedData,
  fetchEventWithRelations,
  seedCloneEvent,
  seedEvent,
} from '@repo/musicbrainz-ext/event-seed';

async function main() {
  const eventGid = getEventGid();
  if (!eventGid) {
    return;
  }

  const event = await fetchEventWithRelations(eventGid);
  if (!event) {
    return;
  }

  const parentSeedData = extractParentEventSeedData(event);
  if (!parentSeedData) {
    return;
  }

  const addSubEventUrl = seedEvent(parentSeedData);
  const cloneUrl = await seedCloneEvent(extractCloneEventSeedData(event));
  injectEventSidebarLinks(addSubEventUrl, cloneUrl);
}

void main().catch(error => {
  console.error('[event-seeder] Error:', error);
});
