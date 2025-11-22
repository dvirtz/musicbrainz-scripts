import {defineConfig} from '@repo/test-support/test-config';
import {fileURLToPath} from 'url';

export default defineConfig('__BASE_URL__', fileURLToPath(import.meta.resolve('@dvirtz/__ID__')));
