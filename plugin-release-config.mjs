import shared from './shared-release-config.mjs';

export default {
  ...shared,
  plugins: [
    ...shared.plugins,
    [
      'semantic-release-mirror-version',
      {
        fileGlob: '{src/meta.ts,dist/*.user.js}',
        placeholderRegExp: '(?<=@version\\s+)\\d+\\.\\d+\\.\\d+(-beta\\.\\d+)?',
      },
    ],
    '@semantic-release/changelog',
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'src/meta.ts'],
      },
    ],
  ],
};
