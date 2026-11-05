import type {Warning} from '#warning.ts';
// cspell: ignore parition
import {partition} from '@repo/common/parition';
import {createSignal} from 'solid-js';

type WarningResolution<Match extends Warning> = (
  matching: Match[]
) => readonly Warning[] | void | Promise<readonly Warning[] | void>;

export function createWarningStore() {
  const [warnings, setWarnings] = createSignal<readonly Warning[]>([]);
  return {
    warnings,
    add: (...entries: Warning[]) => {
      setWarnings(current => [...current, ...entries]);
    },
    remove: (predicate: (warning: Warning) => boolean) => {
      setWarnings(current => current.filter(warning => !predicate(warning)));
    },
    clear: () => {
      setWarnings([]);
    },
    resolve: async <Match extends Warning>(
      predicate: (warning: Warning) => warning is Match,
      resolve: WarningResolution<Match>
    ) => {
      const [matching, remaining] = partition(warnings(), predicate);
      if (matching.length === 0) return;
      setWarnings(remaining);
      const replacements = await resolve(matching);
      if (replacements?.length) {
        setWarnings(current => [...current, ...replacements]);
      }
    },
  };
}

export type WarningStore = ReturnType<typeof createWarningStore>;
