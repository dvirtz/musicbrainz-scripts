import {defineConfig} from 'vite';
import checker from 'vite-plugin-checker';
import {MonkeyUserScript, default as monkey} from 'vite-plugin-monkey';
import solidPlugin from 'vite-plugin-solid';
import rootPackage from './package.json';

export default function userscriptConfig(fileBaseName: string, userScript: MonkeyUserScript) {
  return defineConfig({
    plugins: [
      checker({
        typescript: true,
        eslint: {
          lintCommand: 'eslint "**/*.{ts,tsx}"',
          useFlatConfig: true,
        },
      }),
      solidPlugin(),
      monkey({
        entry: 'src/index.ts',
        server: {
          mountGmApi: true,
        },
        userscript: {
          namespace: rootPackage.homepage,
          author: `${rootPackage.author.name} <${rootPackage.author.email}>`,
          supportURL: rootPackage.bugs.url,
          downloadURL: `${rootPackage.homepage}/releases/latest/download/${fileBaseName}.user.js`,
          license: rootPackage.license,
          ...userScript,
        },
        build: {
          fileName: `${fileBaseName}.user.js`,
        },
      }),
    ],
  });
}
