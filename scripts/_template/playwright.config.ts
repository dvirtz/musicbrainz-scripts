import {defineConfig} from '@repo/test-support/test-config';
import {fileURLToPath} from 'url';

export default defineConfig('https://test.musicbrainz.org', fileURLToPath(import.meta.resolve('@dvirtz/__ID__')), {
  timeout: process.env.PWDEBUG ? 0 : 180_000,
  expect: {
    timeout: process.env.PWDEBUG ? 0 : 60_000,
  },
});
