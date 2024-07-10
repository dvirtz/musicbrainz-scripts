import globals from 'globals';
import pluginJs from '@eslint/js';
import greaseMonkey from 'eslint-config-greasemonkey';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import userscripts from 'eslint-plugin-userscripts';

export default [
  {
    files: ['**/*.user.js'],
    languageOptions: {
      sourceType: 'script',
      globals: greaseMonkey.globals,
    },
    plugins: {
      userscripts: {
        rules: userscripts.rules,
      },
    },
    rules: {
      ...userscripts.configs.recommended.rules,
    },
    settings: {
      userscriptVersions: {
        violentmonkey: '*',
        tampermonkey: '*',
        greasemonkey: '*',
      },
    },
  },
  {
    languageOptions: {globals: globals.browser},
  },
  eslintPluginPrettierRecommended,
  pluginJs.configs.recommended,
];
