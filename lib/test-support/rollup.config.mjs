import eslint from '@rollup/plugin-eslint';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import {defineConfig} from 'rollup';
import libConfig from '../../rollup.lib.config.mjs';

export default [
  ...libConfig(),
  defineConfig({
    input: 'src/userscript-manager.ts',
    plugins: [
      eslint({
        throwOnError: true,
      }),
      typescript(),
      nodeResolve(),
    ],
    output: {
      format: 'iife',
      file: `dist/userscript-manager.js`,
    },
  }),
];
