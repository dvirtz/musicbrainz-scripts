import {defineConfig} from 'test-support';

export default defineConfig('https://test.musicbrainz.org', {
  timeout: 180_000,
  expect: {
    timeout: 60_000,
  },
});
