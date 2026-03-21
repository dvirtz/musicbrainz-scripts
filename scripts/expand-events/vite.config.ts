import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('expand-events', {
  name: 'Expand events',
  description:
    "See what's inside sub-events without having to follow their URL. Also adds convenient edit links for it.",
  version: '1.0.0-beta.1',

  match: ['http*://*.musicbrainz.org/event/*'],
  'run-at': 'document-end',
});
