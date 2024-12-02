import shared from './shared-release-config.mjs';

export default {
  ...shared,
  plugins: [
    ...shared.plugins,
    '@semantic-release/changelog',
    [
      '@semantic-release/git',
      {
        assets: ['**/CHANGELOG.md'],
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: ['CHANGELOG.md', '**/dist/**'],
      },
    ],
  ],
};
