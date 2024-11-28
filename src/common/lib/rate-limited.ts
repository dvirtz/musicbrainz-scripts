import PQueue from 'p-queue';

const intervalQueues = new Map<number, PQueue>();

export async function rateLimited<T>(interval: number, fn: () => Promise<T>): Promise<T> {
  if (!intervalQueues.has(interval)) {
    intervalQueues.set(interval, new PQueue({interval, intervalCap: 1}));
  }
  return await intervalQueues.get(interval)!.add(fn, {throwOnTimeout: true});
}
