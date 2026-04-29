import {UserscriptPage} from '#userscript-page.ts';
import {test as base} from '@playwright/test';
import crypto from 'crypto';
import {mkdir} from 'fs/promises';
import path from 'path';

const ONE_MINUTE = 60_000;
const MAXIMUM_DELAY = 5 * ONE_MINUTE;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export type UserscriptTestOptions = {
  userscriptPath: string;
};

export const test = base.extend<UserscriptTestOptions & {userscriptPage: UserscriptPage}>({
  userscriptPath: ['', {option: true}],

  userscriptPage: async ({page, userscriptPath}, use, testInfo) => {
    const shouldUpdateHar = process.env.UPDATE_HAR === '1';
    const specBaseName = path.basename(testInfo.file, path.extname(testInfo.file));
    const titlePathJoined = testInfo.titlePath.slice(1).join('__');
    const slug = slugify(titlePathJoined);
    // add hash to make sure har paths are unique
    const hash = crypto.createHash('md5').update(titlePathJoined).digest('hex').slice(0, 8);
    const testSlug = `${slug}-${hash}`;
    const harPath = path.join(path.dirname(testInfo.file), 'fixtures', 'har', specBaseName, `${testSlug}.har`);

    await mkdir(path.dirname(harPath), {recursive: true});
    await page.routeFromHAR(harPath, {
      update: shouldUpdateHar,
      notFound: shouldUpdateHar ? 'fallback' : 'abort',
    });

    // exponential backoff for flaky tests
    // https://github.com/microsoft/playwright/issues/28857#issuecomment-2511850509
    if (testInfo.retry) {
      const delay = Math.min(2 ** (testInfo.retry - 1) * ONE_MINUTE, MAXIMUM_DELAY);
      testInfo.setTimeout(testInfo.timeout + delay);
      console.info(`Exponential backoff: waiting ${delay}ms before the next test retry`);
      await page.waitForTimeout(delay);
    }

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        console.error(`error: "${msg.text()}"`);
      }
    });

    const userscriptPage = await UserscriptPage.create(page, userscriptPath, !shouldUpdateHar);
    await use(userscriptPage);
  },
});
