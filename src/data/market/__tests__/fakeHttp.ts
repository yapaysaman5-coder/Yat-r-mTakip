import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MarketError, type Http } from '../types';

export const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

type Route = [match: RegExp, answer: string | MarketError | ((url: string) => string)];

/** An Http that answers from fixtures by URL pattern and records every call. */
export function fakeHttp(routes: Route[]): Http & { calls: string[] } {
  const calls: string[] = [];
  const http = (async (url: string) => {
    calls.push(url);
    const route = routes.find(([re]) => re.test(url));
    if (!route) throw new MarketError('network', `no route for ${url}`);
    const answer = route[1];
    if (answer instanceof MarketError) throw answer;
    return typeof answer === 'function' ? answer(url) : answer;
  }) as Http & { calls: string[] };
  http.calls = calls;
  return http;
}
