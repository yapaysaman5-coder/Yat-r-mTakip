import type { Instrument } from './instruments';

/**
 * Live crypto prices over Binance's public WebSocket (docs/03-TEKNIK-MIMARI.md §7.3).
 *
 * Only the last price ("c") of the 1-second mini ticker is used. Its open price is a rolling
 * 24-hour one, not the Istanbul-midnight price the app compares against, so the day's change
 * still comes from the polled quote. When the socket is down, polling carries on as before.
 */

/** Market-data-only host; `stream.binance.com` is refused in some regions. */
export const STREAM_HOSTS = [
  'wss://data-stream.binance.vision',
  'wss://stream.binance.com:9443',
] as const;

/** Binance allows up to 1024 streams per connection. */
const MAX_STREAMS = 1024;

export interface StreamPrice {
  /** Binance pair, e.g. "BTCUSDT". */
  pair: string;
  price: number;
  /** Event time at the source (epoch ms). */
  time: number;
}

/** Instruments priced straight from a Binance pair (first source, no scaling or multiplier). */
export function streamablePairs(instruments: Iterable<Instrument>): Map<string, string> {
  const out = new Map<string, string>(); // pair → instrument id
  for (const i of instruments) {
    const s = i.sources[0];
    if (i.market !== 'CRYPTO' || !s || s.source !== 'binance' || s.scale || s.times) continue;
    if (/^[A-Z0-9]+$/.test(s.ref) && out.size < MAX_STREAMS) out.set(s.ref, i.id);
  }
  return out;
}

export function streamUrl(host: string, pairs: Iterable<string>): string {
  const streams = [...pairs].map((p) => `${p.toLowerCase()}@miniTicker`).join('/');
  return `${host}/stream?streams=${streams}`;
}

interface MiniTicker {
  e?: string;
  E?: number;
  s?: string;
  c?: string;
}

/** Reads one socket message (combined `{stream, data}` form, a bare ticker or an array). */
export function parseMiniTickers(text: string): StreamPrice[] {
  let msg: unknown;
  try {
    msg = JSON.parse(text);
  } catch {
    return [];
  }
  if (msg && typeof msg === 'object' && 'data' in msg) msg = (msg as { data: unknown }).data;
  const list = Array.isArray(msg) ? msg : [msg];
  const out: StreamPrice[] = [];
  for (const t of list as MiniTicker[]) {
    if (!t || typeof t !== 'object' || t.e !== '24hrMiniTicker' || !t.s) continue;
    const price = Number(t.c);
    if (!(price > 0) || !Number.isFinite(price)) continue;
    out.push({ pair: t.s, price, time: typeof t.E === 'number' ? t.E : 0 });
  }
  return out;
}

/** The parts of the WebSocket API used here (so tests can pass a fake). */
export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onclose: ((e: unknown) => void) | null;
  close: () => void;
}
export type SocketFactory = (url: string) => SocketLike;

export type StreamStatus = 'idle' | 'connecting' | 'open' | 'retrying';

export interface PriceStreamOptions {
  connect: SocketFactory;
  onPrices: (prices: StreamPrice[]) => void;
  onStatus?: (status: StreamStatus) => void;
  hosts?: readonly string[];
  /** First wait before reconnecting; doubles up to `maxRetryMs`. */
  retryMs?: number;
  maxRetryMs?: number;
  /** No message for this long: the connection is treated as dead and reopened. */
  silenceMs?: number;
  timers?: {
    set: (fn: () => void, ms: number) => unknown;
    clear: (id: unknown) => void;
  };
}

/**
 * One socket for a set of pairs. Reconnects with backoff (alternating hosts), reopens a
 * silent connection, and can be pointed at a new set of pairs without a new object.
 */
export class PriceStream {
  private socket: SocketLike | null = null;
  private pairs: string[] = [];
  private attempt = 0;
  private retryTimer: unknown = null;
  private silenceTimer: unknown = null;
  private status: StreamStatus = 'idle';
  private readonly o: Required<Omit<PriceStreamOptions, 'onStatus'>> &
    Pick<PriceStreamOptions, 'onStatus'>;

  constructor(options: PriceStreamOptions) {
    this.o = {
      hosts: STREAM_HOSTS,
      retryMs: 1_000,
      maxRetryMs: 60_000,
      silenceMs: 30_000,
      timers: {
        set: (fn, ms) => setTimeout(fn, ms),
        clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
      },
      ...options,
    };
  }

  get state(): StreamStatus {
    return this.status;
  }

  /** Follows these pairs (empty: closes). Same set as now: nothing happens. */
  watch(pairs: Iterable<string>) {
    const next = [...new Set(pairs)].sort();
    if (next.join(',') === this.pairs.join(',') && (this.socket || this.retryTimer)) return;
    this.pairs = next;
    this.attempt = 0;
    this.open();
  }

  stop() {
    this.pairs = [];
    this.teardown();
    this.setStatus('idle');
  }

  private setStatus(s: StreamStatus) {
    if (s === this.status) return;
    this.status = s;
    this.o.onStatus?.(s);
  }

  private teardown() {
    if (this.retryTimer) this.o.timers.clear(this.retryTimer);
    if (this.silenceTimer) this.o.timers.clear(this.silenceTimer);
    this.retryTimer = null;
    this.silenceTimer = null;
    const s = this.socket;
    this.socket = null;
    if (s) {
      s.onopen = s.onmessage = s.onerror = s.onclose = null;
      try {
        s.close();
      } catch {
        // already closed
      }
    }
  }

  private open() {
    this.teardown();
    if (this.pairs.length === 0) {
      this.setStatus('idle');
      return;
    }
    const host = this.o.hosts[this.attempt % this.o.hosts.length];
    let socket: SocketLike;
    try {
      socket = this.o.connect(streamUrl(host, this.pairs));
    } catch {
      this.retry();
      return;
    }
    this.socket = socket;
    this.setStatus(this.attempt === 0 ? 'connecting' : 'retrying');
    socket.onopen = () => {
      this.attempt = 0;
      this.setStatus('open');
      this.watchSilence();
    };
    socket.onmessage = (e) => {
      this.watchSilence();
      if (typeof e.data !== 'string') return;
      const prices = parseMiniTickers(e.data);
      if (prices.length) this.o.onPrices(prices);
    };
    socket.onerror = () => undefined; // onclose follows
    socket.onclose = () => {
      if (this.socket === socket) this.retry();
    };
  }

  private watchSilence() {
    if (this.silenceTimer) this.o.timers.clear(this.silenceTimer);
    this.silenceTimer = this.o.timers.set(() => {
      this.silenceTimer = null;
      this.retry();
    }, this.o.silenceMs);
  }

  private retry() {
    this.teardown();
    if (this.pairs.length === 0) return;
    const wait = Math.min(this.o.maxRetryMs, this.o.retryMs * 2 ** this.attempt);
    this.attempt++;
    this.setStatus('retrying');
    this.retryTimer = this.o.timers.set(() => {
      this.retryTimer = null;
      this.open();
    }, wait);
  }
}
