import {defineConfig, UserConfig} from 'vite';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';

export default function libConfig(customConfig?: UserConfig) {
  const {build, plugins, ...restConfig} = customConfig || {};
  const {lib, ...restBuild} = build || {};
  return defineConfig({
    build: {
      lib: {
        entry: 'src/index.ts',
        formats: ['es'],
        ...lib,
      },
      sourcemap: true,
      ...restBuild,
    },
    plugins: [
      checker({
        typescript: true,
        eslint: {
          lintCommand: 'eslint "**/*.{ts,tsx}"',
          useFlatConfig: true,
        },
      }),
      dts({
        outDir: 'dist',
        insertTypesEntry: true,
        compilerOptions: {
          'declaration': true,
          'declarationMap': true,
        },
      }),
      ...(plugins || []),
    ],
    ...restConfig,
  });
}
