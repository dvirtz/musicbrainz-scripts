import * as fetch from 'src/common/lib/fetch';
import {rateLimited} from 'src/common/lib/rate-limited';
import {RATE_LIMIT_INTERVAL} from './constants';

export async function tryFetchJSON<T>(url: string, options?: RequestInit) {
  return await rateLimited(RATE_LIMIT_INTERVAL, () => fetch.fetchJSON<T>(url, options));
}

export async function tryFetchText(url: string, options?: RequestInit) {
  return await rateLimited(RATE_LIMIT_INTERVAL, () => fetch.fetchText(url, options));
}

export async function fetchJSON<T>(url: string, options?: RequestInit) {
  return await rateLimited(RATE_LIMIT_INTERVAL, () => fetch.fetchJSON<T>(url, options));
}

export async function fetchText(url: string, options?: RequestInit) {
  return await rateLimited(RATE_LIMIT_INTERVAL, () => fetch.fetchText(url, options));
}

export async function fetchResponse(url: string, options?: RequestInit) {
  return await rateLimited(RATE_LIMIT_INTERVAL, () => fetch.fetchResponse(url, options));
}