import {SetlistFmPage} from '#tests/fixtures/setlistfm-page.ts';
import {test as base} from '@repo/test-support/userscript-test';

export const test = base.extend<{setlistfmPage: SetlistFmPage}>({
  setlistfmPage: async ({page}, use) => {
    const setlistfmPage = await SetlistFmPage.create(page);
    await use(setlistfmPage);
  },
});
