import {default as eslint, default as pluginJs} from '@eslint/js';
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
    },
  }
);
