import {MusicbrainzPage} from '#musicbrainz-page.ts';
import {test as base} from '@repo/test-support/userscript-test';

export const test = base.extend<{musicbrainzPage: MusicbrainzPage}>({
  fetchImplementation: {module: '@repo/musicbrainz-ext/fetch', exportName: 'fetchResponse'},
  musicbrainzPage: [
    async ({userscriptPage}, use) => {
      const musicbrainzPage = await MusicbrainzPage.create(userscriptPage);
      await use(musicbrainzPage);
    },
    {auto: true},
  ],
});
