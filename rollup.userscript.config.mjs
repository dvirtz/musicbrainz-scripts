import {defineExternal, definePlugins} from '@gera2ld/plaid-rollup';
import eslint from '@rollup/plugin-eslint';
import typescript from '@rollup/plugin-typescript';
import {defineConfig} from 'rollup';
import userscript from 'rollup-plugin-userscript';
import pkg from './package.json' with {type: 'json'};

export default function scriptConfig(name) {
  return defineConfig({
    input: `src/index.ts`,
    watch: {
      include: [`src/*.{ts,tsx}`],
    },
    plugins: [
      eslint({
        throwOnError: true,
      }),
      typescript(),
      ...definePlugins({
        esm: true,
        minimize: false,
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx'],
        postcss: {
          inject: false,
          minimize: true,
        },
        babelConfig: {
          configFile: '../../babel.config.cjs',
        },
      }),
      userscript(meta => meta.replace('process.env.AUTHOR', `${pkg.author.name} (${pkg.author.email})`)),
    ],
    external: defineExternal(['solid-js', 'solid-js/web']),
    output: {
      format: 'iife',
      file: `dist/${name}.user.js`,
      globals: {
        'solid-js': 'VM.solid',
        'solid-js/web': 'VM.solid.web',
        'solid-js/store': 'VM.solid.store',
      },
    },
  });
}
