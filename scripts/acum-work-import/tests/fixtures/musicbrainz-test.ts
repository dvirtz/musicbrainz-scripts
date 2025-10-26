import {MusicbrainzPage} from '#tests/fixtures/musicbrainz-page.ts';
import {test as base} from '@repo/test-support/userscript-test';

export const test = base.extend<{musicbrainzPage: MusicbrainzPage}>({
  musicbrainzPage: [
    async ({userscriptPage}, use) => {
      const musicbrainzPage = await MusicbrainzPage.create(userscriptPage);
      await use(musicbrainzPage);
    },
    {auto: true},
  ],
});
