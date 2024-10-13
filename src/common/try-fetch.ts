import fetchBuilder from 'fetch-retry';

const fetchRetry = fetchBuilder(fetch);

type Method = 'GET' | 'POST';

export async function tryFetch(url: string): Promise<object | string>;
export async function tryFetch(url: string, method: 'POST', body: BodyInit): Promise<object | string>;

export async function tryFetch(url: string, method?: Method, body?: BodyInit) {
  try {
    const result = await fetchRetry(url, {
      method: method,
      headers: {Accept: 'application/json'},
      retryOn: [503],
      retryDelay: attempt => Math.pow(2, attempt) * 1000,
      body: body,
    });
    if (!result.ok) {
      throw new Error(`HTTP error: ${result.status}`);
    }
    const contentType = result.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await result.json();
    } else {
      return await result.text();
    }
  } catch (e) {
    console.error(`Failed to fetch ${url}: ${e}`);
    return null;
  }
}
