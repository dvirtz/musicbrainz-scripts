import {RATE_LIMIT_INTERVAL} from '#constants.ts';
import * as fetch from '@repo/fetch/fetch';
import {rateLimited} from '@repo/fetch/rate-limited';

export async function tryFetchJSON<T>(url: string, options?: RequestInit) {
  return await rateLimited(RATE_LIMIT_INTERVAL, () => fetch.tryFetchJSON<T>(url, options));
}

export async function tryFetchText(url: string, options?: RequestInit) {
  return await rateLimited(RATE_LIMIT_INTERVAL, () => fetch.tryFetchText(url, options));
}

export async function fetchJSON<T>(url: string, options?: RequestInit) {
  return await rateLimited(RATE_LIMIT_INTERVAL, () => fetch.fetchJSON<T>(url, options));
}

export async function fetchResponse(url: string, options?: RequestInit) {
  return await rateLimited(RATE_LIMIT_INTERVAL, () => fetch.fetchResponse(url, options));
}
