import {test as base} from '@playwright/test';
import path from 'path';
import {UserscriptPage} from './userscript-page';

export const test = base.extend<{userscriptPage: UserscriptPage}>({
  userscriptPage: [
    async ({page}, use) => {
      const userscriptPage = new UserscriptPage(page);

      await userscriptPage.mockWindowOpen();

      await page.addInitScript({path: path.resolve(import.meta.dirname, 'userscript-manager.js')});

      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
          console.error(`error: "${msg.text()}"`);
        }
      });

      await use(userscriptPage);
    },
    {auto: true},
  ],
});
