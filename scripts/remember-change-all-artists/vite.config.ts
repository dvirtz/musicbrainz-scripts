import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('remember-change-all-artists', {
  name: 'Remember change all artists',
  description: 'Remember the "Change all Artists" checkbox state on MusicBrainz release edit pages.',
  version: '1.0.1',
  // icon: 'https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg',
  match: [
    'http*://*.musicbrainz.org/release/*/edit',
    'http*://*.musicbrainz.org/release/*/edit?*',
    'http*://*.musicbrainz.org/release/add',
    'http*://*.musicbrainz.org/release/add?*',
  ],
});
