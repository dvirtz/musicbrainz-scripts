import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('add-sub-event', {
  name: 'Add Sub-event',
  description: 'Seeds a sub-event page from parent event',
  version: '1.0.0-beta.2',

  match: ['http*://*.musicbrainz.org/event/*'],
  'run-at': 'document-end',
});
