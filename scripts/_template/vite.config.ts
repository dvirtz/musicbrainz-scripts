import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('__ID__', {
  name: '__DISPLAY_NAME__',
  description: '__DESCRIPTION__',
  version: '__VERSION__',
  __ICON_LINE__
  match: [
__MATCH_ARRAY__
  ],
  'run-at': '__RUN_AT__'
});
