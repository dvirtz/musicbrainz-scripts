import {RATE_LIMIT_INTERVAL} from '#constants.ts';
import * as fetch from '@repo/fetch/fetch';

export async function tryFetchJSON<T>(url: string, options?: RequestInit) {
  return await fetch.tryFetchJSON<T>(url, {...options, rateLimitInterval: RATE_LIMIT_INTERVAL});
}

export async function tryFetchText(url: string, options?: RequestInit) {
  return await fetch.tryFetchText(url, {...options, rateLimitInterval: RATE_LIMIT_INTERVAL});
}

export async function fetchJSON<T>(url: string, options?: RequestInit) {
  return await fetch.fetchJSON<T>(url, {...options, rateLimitInterval: RATE_LIMIT_INTERVAL});
}

export async function fetchResponse(url: string, options?: RequestInit) {
  return await fetch.fetchResponse(url, {...options, rateLimitInterval: RATE_LIMIT_INTERVAL});
}
