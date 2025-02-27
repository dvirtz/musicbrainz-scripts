export function head<T, TReturn, TNext>(it: Iterator<T, TReturn, TNext>): T | TReturn | undefined {
  return it.next().value;
}
