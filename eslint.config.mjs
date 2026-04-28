import {default as eslint, default as pluginJs} from '@eslint/js';
import eslintPluginNoRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  eslintPluginPrettierRecommended,
  pluginJs.configs.recommended,
  eslint.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  {
    ignores: [
      '**/dist/**',
      '_template/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/fixtures/har/**',
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.cjs'],
    extends: [tsEslint.configs.disableTypeChecked],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.amd,
      },
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [tsEslint.configs.disableTypeChecked],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    plugins: {
      'no-relative-import-paths': eslintPluginNoRelativeImportPaths,
    },
    rules: {
      'no-relative-import-paths/no-relative-import-paths': ['error', {allowSameFolder: false}],
    },
  },
  {
    files: ['**/*config*.ts', '**/*config*.mjs'],
    rules: {
      'no-relative-import-paths/no-relative-import-paths': 'off',
    },
  },
  {
    files: ['scripts/single-language-tracklist/src/**/*.ts', 'scripts/single-language-tracklist/src/**/*.tsx'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'MB',
          message: 'Use global MB instead of window.MB for mobile userscript compatibility.',
        },
      ],
    },
  }
);
