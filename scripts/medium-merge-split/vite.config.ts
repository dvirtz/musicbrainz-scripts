import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('medium-merge-split', {
  name: 'Medium Merge Split',
  description: 'Merge and split mediums in the MusicBrainz release editor',
  version: '1.0.1',

  match: ['*://*.musicbrainz.org/release/add*', '*://*.musicbrainz.org/release/*/edit*'],
  'run-at': 'document-end',
});
