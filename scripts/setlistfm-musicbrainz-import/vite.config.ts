import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('setlistfm-musicbrainz-import', {
  name: 'setlist.fm event importer',
  description: 'Import setlist.fm events and places to MusicBrainz',
  version: '1.5.2',
  icon: 'https://api.setlist.fm/favicon.ico',
  match: ['*://www.setlist.fm/setlist/*', '*://www.setlist.fm/venue/*'],
  'run-at': 'document-end',
});
