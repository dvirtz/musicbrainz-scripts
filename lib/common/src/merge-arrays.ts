export function mergeArrays<T>(array1: T[], array2: T[]): T[] {
  return [...new Set([...array1, ...array2])];
}
