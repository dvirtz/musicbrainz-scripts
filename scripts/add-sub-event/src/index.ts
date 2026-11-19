import {injectAddSubEventLink} from '#sidebar-link.ts';
import {mountDeprecationBanner} from '@repo/common-ui/deprecation-banner';
import {tryLookup} from '@repo/musicbrainz-ext/api-client';
import {getEventGid} from '@repo/musicbrainz-ext/event-path';
import {seedSubEvent} from '@repo/musicbrainz-ext/event-seed';
import {SUB_EVENT_INCLUDES} from '@repo/musicbrainz-ext/event-api-types';

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

  const event = await tryLookup('event', eventGid, {inc: SUB_EVENT_INCLUDES});
  if (!event) {
    return null;
  }

  const createUrl = seedSubEvent(event);
  injectAddSubEventLink(createUrl);
}

void main().catch(error => {
  console.error('[add-sub-event] Error:', error);
});
