import {mergeMap, pipe} from 'rxjs';

export function asyncTap<T>(fn: (_: T) => Promise<void>) {
  return pipe(
    mergeMap(async (arg: T) => {
      await fn(arg);
      return arg;
    })
  );
}
