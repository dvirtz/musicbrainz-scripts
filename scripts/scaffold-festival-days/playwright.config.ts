import {defineConfig} from '@repo/test-support/test-config';
import {fileURLToPath} from 'url';

export default defineConfig(
  'https://test.musicbrainz.org',
  fileURLToPath(new URL('./dist/scaffold-festival-days.user.js', import.meta.url))
);
