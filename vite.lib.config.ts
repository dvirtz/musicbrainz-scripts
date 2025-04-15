import {defineConfig, LibraryOptions, PluginOption} from 'vite';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';

export default function libConfig(
  libraryOptions?: Omit<LibraryOptions, 'entry'> & {entry?: string | string[]},
  plugins: PluginOption[] = []
) {
  return defineConfig({
    build: {
      lib: {
        entry: libraryOptions?.entry || 'src/index.ts',
        formats: libraryOptions?.formats || ['es'],
        name: libraryOptions?.name,
        fileName: libraryOptions?.fileName,
      },
      sourcemap: true,
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
      ...plugins,
    ],
  });
}
