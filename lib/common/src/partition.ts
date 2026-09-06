export function partition<T, S extends T>(arr: readonly T[], pred: (value: T) => value is S): [S[], Exclude<T, S>[]];

export function partition<T>(arr: readonly T[], pred: (value: T) => boolean): [T[], T[]];

export function partition<T>(arr: readonly T[], pred: (value: T) => boolean): [T[], T[]] {
  return arr.reduce<[T[], T[]]>(
    ([matching, remaining], value) =>
      pred(value) ? [[...matching, value], remaining] : [matching, [...remaining, value]],
    [[], []]
  );
}
