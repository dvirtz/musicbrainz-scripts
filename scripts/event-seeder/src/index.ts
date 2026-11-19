import {injectEventSidebarLinks, SidebarLink} from '#sidebar-link.ts';
import {tryLookup} from '@repo/musicbrainz-ext/api-client';
import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {EVENT_RELATION_INCLUDES, SERIES_RELATION_INCLUDES} from '@repo/musicbrainz-ext/event-api-types';
import {seedCloneEvent, seedSeriesEvent, seedSubEvent} from '@repo/musicbrainz-ext/event-seed';

const ADD_SUB_EVENT_LINK_ID = 'add-sub-event-link';
const CLONE_EVENT_LINK_ID = 'clone-event-link';
const EVENT_SERIES_TYPES = ['event series', 'festival', 'tour', 'run', 'residency', 'award ceremony'];

async function main() {
  const match = location.pathname.match(new RegExp(`/(event|series)/(${MBID_REGEXP.source})`));
  if (!match) {
    return;
  }

  const sidebarLinks: SidebarLink[] = [];
  if (match[1] === 'event') {
    const event = await tryLookup('event', match[2]!, {inc: EVENT_RELATION_INCLUDES});
    if (!event) {
      return;
    }
    sidebarLinks.push({id: ADD_SUB_EVENT_LINK_ID, url: seedSubEvent(event), text: 'Add sub-event'});
    sidebarLinks.push({id: CLONE_EVENT_LINK_ID, url: await seedCloneEvent(event), text: 'Clone event'});
  } else {
    const series = await tryLookup('series', match[2]!, {inc: SERIES_RELATION_INCLUDES});
    if (series?.type && EVENT_SERIES_TYPES.includes(series.type.toLowerCase())) {
      sidebarLinks.push({
        id: ADD_SUB_EVENT_LINK_ID,
        url: seedSeriesEvent(series),
        text: 'Add event',
      });
    }
  }
  injectEventSidebarLinks(sidebarLinks);
}

void main().catch(error => {
  console.error('[event-seeder] Error:', error);
});
