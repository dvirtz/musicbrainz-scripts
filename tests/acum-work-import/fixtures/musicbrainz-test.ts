import {test as base} from '@playwright/test';
import {MusicbrainzPage} from './musicbrainz-page';

export const test = base.extend<{musicbrainzPage: MusicbrainzPage}>({
  musicbrainzPage: async ({page}, use) => {
    const musicbrainzPage = await MusicbrainzPage.create(page);
    await use(musicbrainzPage);
  },
});
