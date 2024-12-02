const types = [
  {type: 'feat', section: 'Features'},
  {type: 'fix', section: 'Bug Fixes'},
  {type: 'docs', section: 'Documentation'},
  {type: 'perf', section: 'Performance improvements'},
  {type: 'revert', section: 'Bug Fixes'},
  {type: 'test', section: 'Tests'},
  {type: 'ci', section: 'Build and continuous integration'},
  {type: 'build', section: 'Build and continuous integration'},
  {type: 'chore', section: 'General maintenance'},
  {type: 'style', section: 'Style improvements'},
  {type: 'refactor', section: 'Refactoring'},
];

const releaseRules = [
  {type: 'ci', release: 'patch'},
  {type: 'docs', release: 'patch'},
  {type: 'test', release: 'patch'},
];

export default {
  branches: [
    'main',
    {
      name: 'beta',
      prerelease: true,
    },
  ],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalCommits',
        presetConfig: {
          types,
        },
        releaseRules,
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalCommits',
        presetConfig: {
          types,
        },
      },
    ],
  ],
};
