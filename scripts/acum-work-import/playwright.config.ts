import {defineConfig} from 'test-support';

export default defineConfig('https://test.musicbrainz.org', {
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
});
