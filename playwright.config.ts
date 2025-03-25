import {defineConfig, devices} from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({path: path.resolve(__dirname, '.env')});

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    bypassCSP: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setlistfm-musicbrainz-import',
      use: {...devices['Desktop Chrome'], baseURL: 'https://www.setlist.fm'},
      testMatch: /setlistfm-musicbrainz-import\/.*\.spec\.ts/,
    },
    {
      name: 'acum-work-import',
      use: {...devices['Desktop Chrome'], baseURL: 'https://test.musicbrainz.org'},
      testMatch: /acum-work-import\/.*\.spec\.ts/,
    },
  ],
});
