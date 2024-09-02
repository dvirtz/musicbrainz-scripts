export async function tryFetch(url: string) {
  try {
    const result = await fetch(url, {
      headers: {Accept: 'application/json'},
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
