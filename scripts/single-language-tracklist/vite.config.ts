import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('single-language-tracklist', {
  name: 'Single Language Tracklist',
  description: 'Keeps one language of a double language tracklist (like often seen in Discogs)',
  version: '1.0.0-beta.3',
  icon: 'https://raw.githubusercontent.com/dvirtz/musicbrainz-scripts/main/scripts/single-language-tracklist/assets/icon.png',

  match: [
    'http*://*.musicbrainz.org/release/*/edit',
    'http*://*.musicbrainz.org/release/*/edit?*',
    'http*://*.musicbrainz.org/release/add',
    'http*://*.musicbrainz.org/release/add?*',
  ],
  'run-at': 'document-end',
});
