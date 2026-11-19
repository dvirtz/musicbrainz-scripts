import type {Warning} from '#warning.ts';
// cspell: ignore parition
import {partition} from '@repo/common/parition';
import {createSignal} from 'solid-js';

type WarningResolution<Match extends Warning> = (
  matching: Match[]
) => readonly Warning[] | void | Promise<readonly Warning[] | void>;

type WarningResolver = <Match extends Warning>(
  predicate: (warning: Warning) => warning is Match,
  resolve: WarningResolution<Match>
) => Promise<void>;

type WarningGroup = {
  createStore: () => WarningStore;
  resolveAll: WarningResolver;
};

export function createWarningGroup(): WarningGroup {
  const stores: WarningStore[] = [];
  const group: WarningGroup = {
    createStore: () => {
      const store = createWarningStore(group);
      stores.push(store);
      return store;
    },
    resolveAll: async (predicate, resolve) => {
      await Promise.all(stores.map(store => store.resolve(predicate, resolve)));
    },
  };
  return group;
}

export function createWarningStore(group?: WarningGroup) {
  const [warnings, setWarnings] = createSignal<readonly Warning[]>([]);
  const resolve: WarningResolver = async (predicate, resolve) => {
    const [matching, remaining] = partition(warnings(), predicate);
    if (matching.length === 0) return;
    setWarnings(remaining);
    const replacements = await resolve(matching);
    if (replacements?.length) {
      setWarnings(current => [...current, ...replacements]);
    }
  };
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
    resolve,
    resolveAll: group?.resolveAll ?? resolve,
  };
}

export type WarningStore = ReturnType<typeof createWarningStore>;
