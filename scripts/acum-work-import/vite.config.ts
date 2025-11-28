import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('acum-work-import', {
  name: 'ACUM work importer',
  description: 'imports MusicBrainz works from acum.org.il database',
  version: '1.20.0-beta.1',
  icon: 'https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg',
  match: [
    'http*://*.musicbrainz.org/release/*/edit-relationships',
    'http*://*.musicbrainz.org/release/*/edit-relationships?*',
    'http*://*.musicbrainz.org/work/*/edit',
    'http*://*.musicbrainz.org/work/*/edit?*',
    'http*://*.musicbrainz.org/work/create*',
    'http*://*.musicbrainz.org/work/create?*',
    'http*://*.musicbrainz.org/dialog?path=%2Fwork%2F*',
  ],
  'run-at': 'document-end',
});
