import {test as base} from '@playwright/test';
import {SetlistFmPage} from './setlistfm-page';

export const test = base.extend<{setlistfmPage: SetlistFmPage}>({
  setlistfmPage: async ({page}, use) => {
    const setlistfmPage = new SetlistFmPage(page);
    await use(setlistfmPage);
  },
});
