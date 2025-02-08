import {pipe, switchMap} from 'rxjs';

export function asyncTap<T>(fn: (_: T) => Promise<void>) {
  return pipe(
    switchMap(async (arg: T) => {
      await fn(arg);
      return arg;
    })
  );
}
