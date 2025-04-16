import {test as base} from 'test-support';
import {SetlistFmPage} from './setlistfm-page';

export const test = base.extend<{setlistfmPage: SetlistFmPage}>({
  setlistfmPage: async ({page}, use) => {
    const setlistfmPage = await SetlistFmPage.create(page);
    await use(setlistfmPage);
  },
});
