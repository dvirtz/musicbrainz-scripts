import fetchBuilder, {type RequestInitWithRetry} from 'fetch-retry';
import {rateLimited} from '@repo/fetch/rate-limited';

export type FetchRetryOptions = RequestInitWithRetry<typeof fetch> & {
  rateLimitInterval?: number;
};

const fetchRetryBuilder = fetchBuilder(
  (input: Parameters<typeof fetch>[0], {rateLimitInterval, ...options}: FetchRetryOptions = {}) =>
    rateLimitInterval === undefined
      ? fetch(input, options)
      : rateLimited(rateLimitInterval, () => fetch(input, options))
);

class FetchError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function tryFetch<T>(fetcher: (url: string, options?: FetchRetryOptions) => Promise<T>) {
  return async (url: string, options?: FetchRetryOptions) => {
    try {
      return await fetcher(url, options);
    } catch (e) {
      if (e instanceof FetchError && e.status === 404) {
        console.warn(`Not found: ${url}`);
      } else {
        console.error(`Failed to fetch ${url}: ${(e as Error).message}`);
      }
      return null;
    }
  };
}

export const tryFetchText = tryFetch(fetchText);
export const tryFetchJSON = <T = object>(url: string, options?: FetchRetryOptions) =>
  tryFetch(fetchJSON<T>)(url, options);

export async function fetchJSON<T = object>(url: string, options?: FetchRetryOptions): Promise<T> {
  const response = await fetchResponse(
    url,
    Object.assign(
      Object.assign(
        {
          headers: {
            Accept: 'application/json',
          },
        },
        options?.headers
      ),
      options
    )
  );
  return (await response.json()) as T;
}

async function fetchText(url: string, options?: FetchRetryOptions): Promise<string> {
  const response = await fetchResponse(url, options);
  return await response.text();
}

export async function fetchResponse(url: string, options?: FetchRetryOptions): Promise<Response> {
  const response = await fetchRetryBuilder(
    url,
    Object.assign(
      {
        retryOn: [503],
        retryDelay: (attempt: number) => Math.pow(2, attempt) * 1000,
        headers: Object.assign({Accept: 'application/json'}, options?.headers),
      },
      options
    )
  );
  if (!response.ok) {
    throw new FetchError(response.status, `HTTP error ${response.status} ${await response.text()}`);
  }
  return response;
}
