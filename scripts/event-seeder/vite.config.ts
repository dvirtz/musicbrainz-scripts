import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('event-seeder', {
  name: 'Event Seeder',
  description: 'Seeds sub-events or clones events from event pages',
  version: '1.0.0-beta.1',

  match: ['http*://*.musicbrainz.org/event/*'],
  'run-at': 'document-end',
});
