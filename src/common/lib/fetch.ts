import fetchBuilder from 'fetch-retry';

const fetchRetryBuilder = fetchBuilder(unsafeWindow.fetch);

export type FetchRetryOptions = Parameters<typeof fetchRetryBuilder>[1];

function tryFetch<T>(fetcher: (url: string, options?: FetchRetryOptions) => Promise<T>) {
  return async (url: string, options?: FetchRetryOptions) => {
    try {
      return await fetcher(url, options);
    } catch (e) {
      console.error(`Failed to fetch ${url}: ${e}`);
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

export async function fetchText(url: string, options?: FetchRetryOptions): Promise<string> {
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
    throw new Error(`HTTP error: ${response.status}`);
  }
  return response;
}