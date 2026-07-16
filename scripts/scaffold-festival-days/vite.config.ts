import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('scaffold-festival-days', {
  name: 'Scaffold festival days',
  description: 'Create festival daily sub-events',
  version: '1.1.1',

  match: ['http*://*.musicbrainz.org/event/*'],
  exclude: ['http*://*.musicbrainz.org/event/*/*'],
  'run-at': 'document-end',
});
