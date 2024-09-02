import {defineExternal, definePlugins} from '@gera2ld/plaid-rollup';
import {defineConfig} from 'rollup';
import userscript from 'rollup-plugin-userscript';
import pkg from './package.json' with {type: 'json'};

export default defineConfig(
  Object.entries({
    'setlistfm-musicbrainz-import': 'src/setlistfm-musicbrainz-import/index.ts',
  }).map(([name, entry]) => ({
    input: entry,
    plugins: [
      ...definePlugins({
        esm: true,
        minimize: false,
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx'],
      }),
      userscript(meta => meta.replace('process.env.AUTHOR', `${pkg.author.name} (${pkg.author.email})`)),
    ],
    external: defineExternal(['@violentmonkey/ui', '@violentmonkey/dom', 'solid-js', 'solid-js/web']),
    output: {
      format: 'iife',
      file: `scripts/${name}/${name}.user.js`,
      globals: {
        // Note:
        // - VM.solid is just a third-party UMD bundle for solid-js since there is no official one
        // - If you don't want to use it, just remove `solid-js` related packages from `external`, `globals` and the `meta.js` file.
        'solid-js': 'VM.solid',
        'solid-js/web': 'VM.solid.web',
        '@violentmonkey/dom': 'VM',
        '@violentmonkey/ui': 'VM',
      },
      indent: false,
    },
  }))
);
