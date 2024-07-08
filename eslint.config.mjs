import globals from 'globals';
import pluginJs from '@eslint/js';
import greaseMonkey from 'eslint-config-greasemonkey';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    files: ['**/*.user.js'],
    languageOptions: {
      sourceType: 'script',
      globals: greaseMonkey.globals,
    },
  },
  {
    languageOptions: {globals: globals.browser},
  },
  eslintPluginPrettierRecommended,
  pluginJs.configs.recommended,
];
