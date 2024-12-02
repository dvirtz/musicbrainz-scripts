import shared from './shared-release-config.mjs';

export default {
  ...shared,
  plugins: [
    ...shared.plugins,
    [
      '@semantic-release/github',
      {
        assets: ['src/*/CHANGELOG.md', 'src/*/dist/**'],
      },
    ],
  ],
};
