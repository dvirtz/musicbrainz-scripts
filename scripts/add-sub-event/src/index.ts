import {injectAddSubEventLink} from '#sidebar-link.ts';
import {mountDeprecationBanner} from '@repo/common-ui/deprecation-banner';
import {getEventGid} from '@repo/musicbrainz-ext/event-path';
import {extractParentEventSeedData, seedEvent} from '@repo/musicbrainz-ext/event-seed';
import type {MBEvent} from '@repo/musicbrainz-ext/event-types';
import {tryFetchJSON} from '@repo/musicbrainz-ext/fetch';

async function main() {
  await mountDeprecationBanner({
    name: 'Add sub-event',
    replacementName: 'Event Seeder',
    replacementUrl: 'https://github.com/dvirtz/musicbrainz-scripts/blob/main/scripts/event-seeder/README.md',
  });

  const eventGid = getEventGid();
  if (!eventGid) {
    return;
  }

  const event = await tryFetchJSON<MBEvent>(`/ws/2/event/${eventGid}?fmt=json&inc=event-rels%20place-rels`);
  if (!event) {
    return null;
  }

  const seedData = extractParentEventSeedData(event);
  if (!seedData) {
    return;
  }

  const createUrl = seedEvent(seedData);
  injectAddSubEventLink(createUrl);
}

void main().catch(error => {
  console.error('[add-sub-event] Error:', error);
});
