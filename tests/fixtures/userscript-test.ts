import {test as base} from '@playwright/test';
import {UserscriptPage} from './userscript-page';

export const test = base.extend<{userscriptPage: UserscriptPage}>({
  userscriptPage: [
    async ({page}, use) => {
      const userscriptPage = new UserscriptPage(page);

      await userscriptPage.mockWindowOpen();

      await page.addInitScript({
        path: 'src/setlistfm-musicbrainz-import/dist/userscript-manager.js',
      });

      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`error: "${msg.text()}"`);
        }
      });

      await use(userscriptPage);
    },
    {auto: true},
  ],
});
