import { describe, expect, it } from '@jest/globals';

import { FIXED_INSTRUMENTS, instrumentFor } from '../instruments';
import {
  parseMiniTickers,
  PriceStream,
  streamablePairs,
  streamUrl,
  type SocketLike,
  type StreamPrice,
  type StreamStatus,
} from '../stream';

/** Recorded from `wss://data-stream.binance.vision/stream?streams=btcusdt@miniTicker/…` (2026-11-09). */
const COMBINED =
  '{"stream":"btcusdt@miniTicker","data":{"e":"24hrMiniTicker","E":1794252200016,"s":"BTCUSDT","c":"74696.59000000","o":"75861.99000000","h":"75943.13000000","l":"73510.00000000","v":"19278.27126000","q":"1439137673.30427460"}}';

describe('parseMiniTickers', () => {
  it('reads the last price and event time of a combined-stream message', () => {
    expect(parseMiniTickers(COMBINED)).toEqual([
      { pair: 'BTCUSDT', price: 74696.59, time: 1794252200016 },
    ]);
  });

  it('reads bare tickers and arrays, and skips anything else', () => {
    const bare = '{"e":"24hrMiniTicker","E":5,"s":"ETHUSDT","c":"3500.1"}';
    expect(parseMiniTickers(bare)).toEqual([{ pair: 'ETHUSDT', price: 3500.1, time: 5 }]);
    expect(parseMiniTickers(`[${bare},{"e":"24hrMiniTicker","s":"X","c":"0"}]`)).toHaveLength(1);
    expect(parseMiniTickers('{"result":null,"id":1}')).toEqual([]);
    expect(parseMiniTickers('{"e":"trade","s":"BTCUSDT","p":"1"}')).toEqual([]);
    expect(parseMiniTickers('not json')).toEqual([]);
    expect(parseMiniTickers('{"e":"24hrMiniTicker","s":"BTCUSDT","c":"abc"}')).toEqual([]);
  });
});

describe('streamablePairs', () => {
  it('takes coins priced straight from a Binance pair only', () => {
    const pairs = streamablePairs([
      instrumentFor('CRYPTO:BTC')!,
      instrumentFor('CRYPTO:ETH')!,
      instrumentFor('BIST:THYAO')!,
      instrumentFor('US:AAPL')!,
      ...FIXED_INSTRUMENTS, // USD/TRY (Yahoo first), gram gold (scaled), indices
    ]);
    expect([...pairs]).toEqual([
      ['BTCUSDT', 'CRYPTO:BTC'],
      ['ETHUSDT', 'CRYPTO:ETH'],
    ]);
  });

  it('builds the combined-stream address', () => {
    expect(streamUrl('wss://h', ['BTCUSDT', 'ETHUSDT'])).toBe(
      'wss://h/stream?streams=btcusdt@miniTicker/ethusdt@miniTicker',
    );
  });
});

/** Sockets and timers under the test's control. */
function harness() {
  const sockets: (SocketLike & { url: string; closed: boolean })[] = [];
  const timers: { id: number; fn: () => void; ms: number }[] = [];
  let next = 1;
  const prices: StreamPrice[][] = [];
  const statuses: StreamStatus[] = [];
  const stream = new PriceStream({
    connect: (url) => {
      const s = {
        url,
        closed: false,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        close() {
          s.closed = true;
        },
      } as SocketLike & { url: string; closed: boolean };
      sockets.push(s);
      return s;
    },
    onPrices: (p) => prices.push(p),
    onStatus: (s) => statuses.push(s),
    timers: {
      set: (fn, ms) => {
        const id = next++;
        timers.push({ id, fn, ms });
        return id;
      },
      clear: (id) => {
        const i = timers.findIndex((t) => t.id === id);
        if (i >= 0) timers.splice(i, 1);
      },
    },
  });
  /** Runs the earliest pending timer. */
  const fire = () => {
    timers.sort((a, b) => a.ms - b.ms);
    const t = timers.shift()!;
    t.fn();
    return t.ms;
  };
  return { stream, sockets, timers, prices, statuses, fire };
}

describe('PriceStream', () => {
  it('opens one socket for the pairs and passes prices on', () => {
    const h = harness();
    h.stream.watch(['ETHUSDT', 'BTCUSDT']);
    expect(h.sockets).toHaveLength(1);
    expect(h.sockets[0].url).toBe(
      'wss://data-stream.binance.vision/stream?streams=btcusdt@miniTicker/ethusdt@miniTicker',
    );
    h.sockets[0].onopen!();
    expect(h.stream.state).toBe('open');
    h.sockets[0].onmessage!({ data: COMBINED });
    h.sockets[0].onmessage!({ data: '{"result":null,"id":1}' });
    expect(h.prices).toEqual([[{ pair: 'BTCUSDT', price: 74696.59, time: 1794252200016 }]]);

    // The same pairs again: the socket stays.
    h.stream.watch(['BTCUSDT', 'ETHUSDT']);
    expect(h.sockets).toHaveLength(1);
    // A new set: the old socket closes, a new one opens.
    h.stream.watch(['BTCUSDT']);
    expect(h.sockets[0].closed).toBe(true);
    expect(h.sockets).toHaveLength(2);
  });

  it('reconnects with growing waits, alternating hosts, and resets after a success', () => {
    const h = harness();
    h.stream.watch(['BTCUSDT']);
    h.sockets[0].onclose!({});
    expect(h.stream.state).toBe('retrying');
    expect(h.fire()).toBe(1_000);
    expect(h.sockets[1].url.startsWith('wss://stream.binance.com:9443/')).toBe(true);
    h.sockets[1].onclose!({});
    expect(h.fire()).toBe(2_000);
    h.sockets[2].onclose!({});
    expect(h.fire()).toBe(4_000);
    h.sockets[3].onopen!();
    expect(h.statuses).toEqual(['connecting', 'retrying', 'open']);
    h.sockets[3].onclose!({});
    expect(h.fire()).toBe(1_000);
  });

  it('caps the wait at a minute', () => {
    const h = harness();
    h.stream.watch(['BTCUSDT']);
    const waits: number[] = [];
    for (let i = 0; i < 9; i++) {
      h.sockets[h.sockets.length - 1].onclose!({});
      waits.push(h.fire());
    }
    expect(waits.slice(-3)).toEqual([60_000, 60_000, 60_000]);
  });

  it('reopens a connection that went silent', () => {
    const h = harness();
    h.stream.watch(['BTCUSDT']);
    h.sockets[0].onopen!();
    expect(h.timers.map((t) => t.ms)).toEqual([30_000]);
    h.sockets[0].onmessage!({ data: COMBINED }); // a message restarts the watch
    expect(h.timers.map((t) => t.ms)).toEqual([30_000]);
    h.fire(); // 30 s of silence
    expect(h.sockets[0].closed).toBe(true);
    h.fire(); // the retry wait
    expect(h.sockets).toHaveLength(2);
  });

  it('a closed socket from before a change does not trigger a reconnect', () => {
    const h = harness();
    h.stream.watch(['BTCUSDT']);
    const old = h.sockets[0];
    const onclose = old.onclose!;
    h.stream.watch(['ETHUSDT']);
    onclose({}); // late close event of the replaced socket
    expect(h.timers).toHaveLength(0);
    expect(h.sockets).toHaveLength(2);
  });

  it('stops: closes the socket, cancels timers, and stays down', () => {
    const h = harness();
    h.stream.watch(['BTCUSDT']);
    h.sockets[0].onclose!({});
    expect(h.timers).toHaveLength(1);
    h.stream.stop();
    expect(h.timers).toHaveLength(0);
    expect(h.stream.state).toBe('idle');
    h.stream.watch([]);
    expect(h.sockets).toHaveLength(1);
  });
});
