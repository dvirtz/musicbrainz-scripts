import fetchBuilder from 'fetch-retry';

const fetchRetry = fetchBuilder(fetch);

export async function tryFetch(url: string) {
  try {
    const result = await fetchRetry(url, {
      headers: {Accept: 'application/json'},
      retryOn: [503],
      retryDelay: attempt => Math.pow(2, attempt) * 1000,
    });
    if (!result.ok) {
      throw new Error(`HTTP error: ${result.status}`);
    }
    return await result.json();
  } catch (e) {
    console.error(`Failed to fetch ${url}: ${e}`);
    return null;
  }
}
