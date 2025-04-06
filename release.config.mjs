import shared from './shared-release-config.mjs';

export default {
  ...shared,
  plugins: [
    ...shared.plugins,
    [
      '@semantic-release/github',
      {
        assets: ['scripts/*/dist/*.user.js'],
      },
    ],
  ],
};
