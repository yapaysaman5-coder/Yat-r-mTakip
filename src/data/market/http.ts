import { MarketError, type Http } from './types';

/**
 * The app's HTTP client for market data: fetch with a timeout and typed errors. Requests go
 * straight from the phone to each source; no server of ours sits in between.
 */
export function createHttp(fetchImpl: typeof fetch = fetch, defaultTimeoutMs = 12_000): Http {
  return async (url, init = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? defaultTimeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(url, { signal: controller.signal });
    } catch {
      const aborted = controller.signal.aborted;
      throw new MarketError(
        aborted ? 'timeout' : 'network',
        aborted ? `Zaman aşımı: ${hostOf(url)}` : `Bağlantı yok: ${hostOf(url)}`,
      );
    } finally {
      clearTimeout(timer);
    }
    const body = await response.text().catch(() => '');
    if (!response.ok) {
      throw new MarketError(
        response.status === 404 ? 'not_found' : 'http',
        `${hostOf(url)} ${response.status}`,
        response.status,
      );
    }
    return body;
  };
}

export function hostOf(url: string): string {
  const m = /^https?:\/\/([^/]+)/.exec(url);
  return m ? m[1] : url;
}

/** JSON.parse that reports a format error instead of a SyntaxError. */
export function parseJson<T>(text: string, what: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new MarketError('format', `${what}: beklenmeyen yanıt`);
  }
}
