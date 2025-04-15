import defineConfig from '../../vite.userscript-config';

export default defineConfig('setlistfm-musicbrainz-import', {
  name: 'setlist.fm event importer',
  description: 'Import setlist.fm events and places to MusicBrainz',
  version: '1.5.1',
  icon: 'https://api.setlist.fm/favicon.ico',
  match: ['*://www.setlist.fm/setlist/*', '*://www.setlist.fm/venue/*'],
  require: [
    'https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2',
    'https://cdn.jsdelivr.net/npm/@violentmonkey/ui@0.7',
    'https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2/dist/solid.min.js',
  ],
  'run-at': 'document-end',
});
