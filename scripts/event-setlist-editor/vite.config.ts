import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('event-setlist-editor', {
  name: 'Event Setlist Editor',
  description: 'Edit MusicBrainz event setlists in a tracklist-style table',
  version: '1.0.0',

  match: ['*://*.musicbrainz.org/event/create*', '*://*.musicbrainz.org/event/*/edit*'],
  'run-at': 'document-end',
});
