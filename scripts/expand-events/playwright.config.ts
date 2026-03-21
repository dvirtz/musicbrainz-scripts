import {defineConfig} from '@repo/test-support/test-config';
import {fileURLToPath} from 'url';

export default defineConfig('https://musicbrainz.org', fileURLToPath(import.meta.resolve('@dvirtz/expand-events')));
