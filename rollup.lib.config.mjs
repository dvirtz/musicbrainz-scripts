import eslint from '@rollup/plugin-eslint';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import {defineConfig} from 'rollup';
import {dts} from 'rollup-plugin-dts';
import css from 'rollup-plugin-import-css';

export default function libConfig({external = [], watchInclude = []} = {}) {
  return [
    defineConfig({
      input: `src/index.ts`,
      watch: {
        include: [`src/*.{ts,tsx}`, ...watchInclude],
      },
      jsx: 'preserve',
      plugins: [
        typescript(),
        eslint({
          throwOnError: true,
        }),
        css(),
        nodeResolve(),
      ],
      external: [/node_modules/, /\/types/, ...external],
      output: {
        dir: `dist`,
        format: 'esm',
      },
    }),
    defineConfig({
      input: `src/index.ts`,
      plugins: [dts()],
      output: {
        dir: `dist`,
      },
    }),
  ];
}
