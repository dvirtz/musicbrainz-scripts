import {test as base} from '@playwright/test';
import path from 'path';
import {UserscriptPage} from './userscript-page';

const ONE_MINUTE = 60_000;
const MAXIMUM_DELAY = 5 * ONE_MINUTE;

export const test = base.extend<{userscriptPage: UserscriptPage}>({
  userscriptPage: [
    async ({page}, use, testInfo) => {
      // exponential backoff for flaky tests
      // https://github.com/microsoft/playwright/issues/28857#issuecomment-2511850509
      if (testInfo.retry) {
        const delay = Math.min(2 ** (testInfo.retry - 1) * ONE_MINUTE, MAXIMUM_DELAY);
        testInfo.setTimeout(testInfo.timeout + delay);
        console.info(`Exponential backoff: waiting ${delay}ms before the next test retry`);
        await page.waitForTimeout(delay);
      }

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
