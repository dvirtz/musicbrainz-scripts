import {MusicbrainzPage} from '#tests/fixtures/musicbrainz-page.ts';
import {test as base} from '@playwright/test';

export const test = base.extend<{musicbrainzPage: MusicbrainzPage}>({
  musicbrainzPage: async ({page}, use) => {
    const musicbrainzPage = await MusicbrainzPage.create(page);
    await use(musicbrainzPage);
  },
});
