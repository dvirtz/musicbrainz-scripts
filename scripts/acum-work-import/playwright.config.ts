import {defineConfig} from '@repo/test-support/test-config';
import {fileURLToPath} from 'url';

export default defineConfig(
  'https://test.musicbrainz.org',
  fileURLToPath(import.meta.resolve('@dvirtz/acum-work-import')),
  {
    timeout: 180_000,
    expect: {
      timeout: 60_000,
    },
  }
);
