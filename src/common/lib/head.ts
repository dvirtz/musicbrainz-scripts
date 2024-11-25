export function head<T>(it: Iterator<T>): T | undefined {
  return it.next().value;
}
