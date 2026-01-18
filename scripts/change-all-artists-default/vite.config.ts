import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('change-all-artists-default', {
  name: 'Change all artists default',
  description: 'Set the default value for the "Change all Artists" checkbox on MusicBrainz release edit pages.',
  version: '1.1.2-beta.1',
  // icon: 'https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg',
  match: [
    'http*://*.musicbrainz.org/release/*/edit',
    'http*://*.musicbrainz.org/release/*/edit?*',
    'http*://*.musicbrainz.org/release/add',
    'http*://*.musicbrainz.org/release/add?*',
  ],
});
