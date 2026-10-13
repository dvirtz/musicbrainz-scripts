import {sanitizeHarArtifacts} from '#har-sanitizer.ts';
import {UserscriptPage} from '#userscript-page.ts';
import {test as base} from '@playwright/test';
import {build} from 'esbuild';
import {mkdir} from 'fs/promises';
import path from 'path';

const ONE_MINUTE = 60_000;
const MAXIMUM_DELAY = 5 * ONE_MINUTE;
const fetchImplementationCache = new Map<string, Promise<string>>();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export type UserscriptTestOptions = {
  userscriptPath: string;
  updateHar?: boolean;
  fetchImplementation?: {module: string; exportName: string};
};

export const test = base.extend<UserscriptTestOptions & {userscriptPage: UserscriptPage}>({
  userscriptPath: ['', {option: true}],
  updateHar: [false, {option: true}],
  fetchImplementation: [undefined, {option: true}],

  userscriptPage: async ({baseURL, page, userscriptPath, updateHar, fetchImplementation}, use, testInfo) => {
    const specBaseName = path.basename(testInfo.file, path.extname(testInfo.file));
    const slug = slugify(testInfo.title);
    const testArtifactsDir = path.join(path.dirname(testInfo.file), 'fixtures', 'har', specBaseName, slug);
    const harPath = path.join(testArtifactsDir, `${slug}.har`);

    await mkdir(testArtifactsDir, {recursive: true});

    if (baseURL) {
      await page.context().grantPermissions(['local-network-access'], {
        origin: new URL(baseURL).origin,
      });
    }

    await page.routeFromHAR(harPath, {
      update: updateHar,
      notFound: updateHar ? 'fallback' : 'abort',
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

    let fetchScript: string | undefined;
    if (fetchImplementation && updateHar) {
      const {module, exportName} = fetchImplementation;
      const cacheKey = JSON.stringify(fetchImplementation);
      let bundled = fetchImplementationCache.get(cacheKey);
      if (!bundled) {
        bundled = build({
          stdin: {
            contents: `import * as implementation from ${JSON.stringify(module)}; globalThis.__testSupportFetch = implementation[${JSON.stringify(exportName)}];`,
            resolveDir: import.meta.dirname,
          },
          bundle: true,
          format: 'iife',
          platform: 'browser',
          write: false,
        }).then(result => result.outputFiles[0]!.text);
        fetchImplementationCache.set(cacheKey, bundled);
      }
      fetchScript = await bundled;
    }
    const userscriptPage = await UserscriptPage.create(page, userscriptPath, !updateHar, fetchScript);
    await use(userscriptPage);

    if (updateHar) {
      const context = page.context();
      await context.close();
      await sanitizeHarArtifacts(harPath);
    }
  },
});
