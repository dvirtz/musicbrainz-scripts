import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('event-seeder', {
  name: 'Event Seeder',
  description: 'Seeds events from events, series and live releases',
  version: '1.2.0-beta.1',

  match: ['http*://*.musicbrainz.org/event/*', 'http*://*.musicbrainz.org/series/*', '*://*.musicbrainz.org/release/*'],
  exclude: ['*://*.musicbrainz.org/release/*/*'],
  'run-at': 'document-end',
});
