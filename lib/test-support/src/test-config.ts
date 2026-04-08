import {UserscriptTestOptions} from '#userscript-test.ts';
import {defineConfig as defineTestConfig, devices, type PlaywrightTestConfig} from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({path: path.resolve(import.meta.dirname, '..', '..', '..', '.env')});

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export function defineConfig(baseURL: string, userscriptPath: string, options?: PlaywrightTestConfig) {
  return defineTestConfig<UserscriptTestOptions>({
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Can't run in parallel due to Musicbrainz rate limit */
    workers: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
      /* Base URL to use in actions like `await page.goto('/')`. */
      // baseURL: 'http://localhost:3000',

      /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
      trace: 'on-first-retry',

      bypassCSP: true,

      baseURL,

      userscriptPath,
    },
    ...options,
    projects: [
      {
        name: 'chromium',
        use: {...devices['Desktop Chrome']},
      },
    ],
  });
}
