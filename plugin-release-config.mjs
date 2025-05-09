import shared from './shared-release-config.mjs';

export default {
  ...shared,
  plugins: [
    ...shared.plugins,
    [
      'semantic-release-mirror-version',
      {
        fileGlob: '{vite.config.ts,dist/*.user.js}',
        placeholderRegExp: "(?<=(@version|version:)\\s+'?)\\d+\\.\\d+\\.\\d+(-beta\\.\\d+)?(?='?)",
      },
    ],
    '@semantic-release/changelog',
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'vite.config.ts'],
      },
    ],
  ],
};
