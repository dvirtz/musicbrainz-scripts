import {releaseSidebarLinks} from '#release-seed.ts';
import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {
  fetchEntityWithRelations,
  seedCloneEvent,
  seedSeriesEvent,
  seedSubEvent,
} from '@repo/musicbrainz-ext/event-seed';
import {MBEvent, MBSeries} from '@repo/musicbrainz-ext/event-types';
import {injectSidebarLinks, SidebarLink} from '@repo/musicbrainz-ext/sidebar-link';
import {MBRelease} from '@repo/musicbrainz-ext/web-service-types';

const ADD_SUB_EVENT_LINK_ID = 'add-sub-event-link';
const CLONE_EVENT_LINK_ID = 'clone-event-link';
const EVENT_SERIES_TYPES = ['event series', 'festival', 'tour', 'run', 'residency', 'award ceremony'];

async function main() {
  const match = location.pathname.match(new RegExp(`/(event|series|release)/(${MBID_REGEXP.source})`));
  if (!match) {
    return;
  }

  const entityType = match[1]!;
  const entity = await fetchEntityWithRelations(entityType, match[2]!);
  if (!entity) {
    return;
  }

  const sidebarLinks: SidebarLink[] = await (async () => {
    if (entityType == 'event') {
      return [
        {id: ADD_SUB_EVENT_LINK_ID, url: seedSubEvent(entity as MBEvent), text: 'Add sub-event'},
        {id: CLONE_EVENT_LINK_ID, url: await seedCloneEvent(entity as MBEvent), text: 'Clone event'},
      ];
    } else if (entityType === 'series') {
      const series = entity as MBSeries;
      if (series.type && EVENT_SERIES_TYPES.includes(series.type.toLowerCase())) {
        return [
          {
            id: ADD_SUB_EVENT_LINK_ID,
            url: seedSeriesEvent(entity as MBSeries),
            text: 'Add event',
          },
        ];
      }
    } else if (entityType === 'release') {
      return await releaseSidebarLinks(entity as MBRelease);
    }
    return [];
  })();
  injectSidebarLinks(sidebarLinks);
}

void main().catch(error => {
  console.error('[event-seeder] Error:', error);
  if (location.pathname.startsWith('/release/')) {
    window.alert(`Event Seeder: ${error instanceof Error ? error.message : String(error)}`);
  }
});
