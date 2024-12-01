import {defineExternal, definePlugins} from '@gera2ld/plaid-rollup';
import path from 'path';
import {defineConfig} from 'rollup';
import userscript from 'rollup-plugin-userscript';
import pkg from './package.json' with {type: 'json'};

const baseImportUrl = 'src';

export default defineConfig(
  Object.entries({
    'setlistfm-musicbrainz-import': 'src/setlistfm-musicbrainz-import/index.ts',
    'acum-work-import': 'src/acum-work-import/index.ts',
  }).map(([name, entry]) => ({
    logLevel: 'debug',
    input: entry,
    plugins: [
      ...definePlugins({
        esm: true,
        minimize: false,
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx'],
        postcss: {
          inject: name === 'acum-work-import',
          minimize: true,
        },
        aliases: {
          entries: [{find: 'src', replacement: path.resolve(baseImportUrl)}],
        },
      }),
      userscript(meta => meta.replace('process.env.AUTHOR', `${pkg.author.name} (${pkg.author.email})`)),
    ],
    external: defineExternal(['@violentmonkey/ui', '@violentmonkey/dom', 'solid-js', 'solid-js/web']),
    output: {
      format: 'iife',
      file: `src/${name}/dist/${name}.user.js`,
      globals: {
        'solid-js': 'VM.solid',
        'solid-js/web': 'VM.solid.web',
        'solid-js/store': 'VM.solid.store',
        '@violentmonkey/ui': 'VM',
      },
      indent: false,
    },
  }))
);
