import {defineConfig} from '@repo/test-support/test-config';
import {fileURLToPath} from 'url';

export default defineConfig(
  'https://www.setlist.fm',
  fileURLToPath(import.meta.resolve('@dvirtz/setlistfm-musicbrainz-import'))
);
