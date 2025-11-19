import {defineConfig} from '@repo/test-support/test-config';
import {fileURLToPath} from 'url';

export default defineConfig(
  'https://test.musicbrainz.org',
  fileURLToPath(import.meta.resolve('@dvirtz/change-all-artists-default'))
);
