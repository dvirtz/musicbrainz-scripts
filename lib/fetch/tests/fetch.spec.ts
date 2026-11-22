import {expect, test} from '@playwright/test';
import {fetchResponse} from '@repo/fetch/fetch';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

for (const failure of ['HTTP 503', 'network error']) {
  test(`queues retries after ${failure} alongside other requests`, async () => {
    const attempts: {url: string; time: number}[] = [];
    const interval = failure === 'HTTP 503' ? 100 : 101;
    globalThis.fetch = (url, options) => {
      expect(options).not.toHaveProperty('rateLimitInterval');
      attempts.push({url: String(url), time: Date.now()});
      if (attempts.length === 1) {
        return failure === 'HTTP 503'
          ? Promise.resolve(new Response('Unavailable', {status: 503}))
          : Promise.reject(new Error('Connection failed'));
      }
      return Promise.resolve(new Response('OK'));
    };

    const options = {rateLimitInterval: interval, retryDelay: 0, retries: 1};
    await Promise.all([
      fetchResponse('https://example.com/first', options),
      fetchResponse('https://example.com/second', options),
    ]);

    expect(attempts.map(attempt => attempt.url)).toEqual([
      'https://example.com/first',
      'https://example.com/second',
      'https://example.com/first',
    ]);
    for (let i = 1; i < attempts.length; i++) {
      // Node timers can fire up to one millisecond early.
      expect(attempts[i]!.time - attempts[i - 1]!.time).toBeGreaterThanOrEqual(interval - 1);
    }
  });
}

for (const rateLimitInterval of [undefined, 200]) {
  test(`preserves retry delays with rate limit ${rateLimitInterval}`, async () => {
    const attempts: number[] = [];
    globalThis.fetch = () => {
      attempts.push(Date.now());
      return Promise.resolve(new Response('', {status: attempts.length === 1 ? 503 : 200}));
    };

    const response = await fetchResponse('https://example.com/', {rateLimitInterval, retryDelay: 500, retries: 1});

    expect(response.status).toBe(200);
    expect(attempts).toHaveLength(2);
    expect(attempts[1]! - attempts[0]!).toBeGreaterThanOrEqual(499);
  });
}
