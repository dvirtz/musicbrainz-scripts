import defineConfig from '@repo/vite-config/userscript-config';

export default defineConfig('release-artist-toolkit', {
  name: 'Release artist toolkit',
  description:
    'Release editor tools: change-all default, reset artist names, and copy release credit from release group.',
  version: '1.0.0-beta.1',
  // icon: 'https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg',
  match: [
    'http*://*.musicbrainz.org/release/*/edit',
    'http*://*.musicbrainz.org/release/*/edit?*',
    'http*://*.musicbrainz.org/release/add',
    'http*://*.musicbrainz.org/release/add?*',
  ],
});
