import { addDays } from '@/domain';

import type { Instrument, SourceRef } from './instruments';
import { instrumentFor } from './instruments';
import {
  MarketError,
  type DailyClose,
  type Http,
  type MarketSource,
  type SourceHistory,
  type SourceId,
  type SourceQuote,
} from './types';

/**
 * Picks a source for each instrument and falls back down its list (docs/03-TEKNIK-MIMARI.md
 * §6.1). A source that fails is rested for a while (30 s, doubling up to 15 min) so a broken
 * or rate-limited source is not hammered; it is tried again after the rest.
 */
export interface Quote extends SourceQuote {
  source: SourceId;
}

export interface QuoteResult {
  quotes: Map<string, Quote>;
  /** Instruments no source could price this time, with the last reason. */
  failed: Map<string, string>;
  /** Every request failed for lack of a connection. */
  offline: boolean;
}

interface Health {
  failures: number;
  restUntil: number;
  lastError?: string;
}

const REST_MS = 30_000;
const MAX_REST_MS = 15 * 60_000;

export class MarketRouter {
  private health = new Map<SourceId, Health>();

  constructor(
    private readonly sources: Partial<Record<SourceId, MarketSource>>,
    private readonly http: Http,
    private readonly now: () => number = Date.now,
  ) {}

  /** Sources currently resting after errors (for the settings screen). */
  status(): { source: SourceId; failures: number; restingFor: number; lastError?: string }[] {
    const t = this.now();
    return [...this.health.entries()].map(([source, h]) => ({
      source,
      failures: h.failures,
      restingFor: Math.max(0, h.restUntil - t),
      lastError: h.lastError,
    }));
  }

  private available(id: SourceId): boolean {
    if (!this.sources[id]) return false;
    const h = this.health.get(id);
    return !h || h.restUntil <= this.now();
  }

  private ok(id: SourceId) {
    this.health.delete(id);
  }

  private fail(id: SourceId, error: unknown) {
    const h = this.health.get(id) ?? { failures: 0, restUntil: 0 };
    h.failures += 1;
    h.restUntil = this.now() + Math.min(MAX_REST_MS, REST_MS * 2 ** (h.failures - 1));
    h.lastError = error instanceof Error ? error.message : String(error);
    this.health.set(id, h);
  }

  async quotes(instruments: readonly Instrument[]): Promise<QuoteResult> {
    const quotes = new Map<string, Quote>();
    const failed = new Map<string, string>();
    let attempts = 0;
    let networkFailures = 0;

    // Multipliers (USD/TRY for an index in USD) are priced first.
    const deps = new Map<string, Instrument>();
    for (const i of instruments) {
      for (const s of i.sources) {
        if (!s.times) continue;
        const dep = instruments.find((x) => x.id === s.times) ?? instrumentFor(s.times);
        if (dep) deps.set(dep.id, dep);
      }
    }

    const run = async (list: readonly Instrument[]) => {
      let pending = [...list];
      const depth = Math.max(0, ...list.map((i) => i.sources.length));
      for (let k = 0; k < depth && pending.length; k++) {
        const groups = new Map<SourceId, { inst: Instrument; ref: SourceRef }[]>();
        const waiting: Instrument[] = [];
        for (const inst of pending) {
          const ref = inst.sources[k];
          if (!ref || !this.available(ref.source)) {
            waiting.push(inst);
            continue;
          }
          if (ref.times && !quotes.has(ref.times)) {
            waiting.push(inst);
            continue;
          }
          groups.set(ref.source, [...(groups.get(ref.source) ?? []), { inst, ref }]);
        }
        pending = waiting;
        for (const [sourceId, items] of groups) {
          attempts++;
          try {
            const got = await this.sources[sourceId]!.quotes(
              items.map((x) => x.ref.ref),
              this.http,
            );
            this.ok(sourceId);
            for (const { inst, ref } of items) {
              const q = got.get(ref.ref);
              if (q) quotes.set(inst.id, { ...derive(q, ref, quotes), source: sourceId });
              else pending.push(inst);
            }
          } catch (e) {
            if (e instanceof MarketError && e.kind === 'network') networkFailures++;
            this.fail(sourceId, e);
            for (const { inst } of items) {
              pending.push(inst);
              failed.set(inst.id, e instanceof Error ? e.message : String(e));
            }
          }
        }
      }
      for (const inst of pending) if (!failed.has(inst.id)) failed.set(inst.id, 'Fiyat bulunamadı');
    };

    await run([...deps.values()]);
    await run(instruments.filter((i) => !deps.has(i.id)));
    for (const id of quotes.keys()) failed.delete(id);
    for (const id of deps.keys()) if (!instruments.some((i) => i.id === id)) quotes.delete(id);
    return { quotes, failed, offline: attempts > 0 && networkFailures === attempts };
  }

  /** Daily closes from the first source that has any, with that source's splits. */
  async history(
    inst: Instrument,
    from: string,
    to: string,
  ): Promise<SourceHistory & { source: SourceId }> {
    let last: unknown = new MarketError('not_found', `${inst.name}: kaynak yok`);
    for (const ref of inst.sources) {
      if (!this.available(ref.source)) {
        const resting = this.health.get(ref.source);
        if (resting?.lastError) last = new MarketError('http', resting.lastError);
        continue;
      }
      try {
        const h = await this.sources[ref.source]!.history(ref.ref, from, to, this.http);
        this.ok(ref.source);
        if (h.closes.length === 0) continue;
        let closes = h.closes.map((c) => ({ date: c.date, close: c.close * (ref.scale ?? 1) }));
        if (ref.times) {
          const dep = instrumentFor(ref.times);
          if (!dep) continue;
          // The multiplier needs its own history, from a week earlier to carry a close in.
          const m = await this.history(dep, addDays(from, -7), to);
          closes = multiply(closes, m.closes);
        }
        return { ...h, closes, source: ref.source };
      } catch (e) {
        last = e;
        if (!(e instanceof MarketError && e.kind === 'not_found')) this.fail(ref.source, e);
      }
    }
    throw last;
  }
}

function derive(q: SourceQuote, ref: SourceRef, known: Map<string, Quote>): SourceQuote {
  const scale = ref.scale ?? 1;
  const m = ref.times ? known.get(ref.times) : undefined;
  const f = m?.price ?? 1;
  const fPrev = m ? (m.prevClose ?? m.price) : 1;
  return {
    price: q.price * scale * f,
    prevClose: q.prevClose === null ? null : q.prevClose * scale * fPrev,
    time: m ? Math.min(q.time, m.time) : q.time,
    delayMinutes: Math.max(q.delayMinutes, m?.delayMinutes ?? 0),
    endOfDay: q.endOfDay || m?.endOfDay,
  };
}

/** Multiplies each close by the other series' close on that day (or the last one before). */
export function multiply(closes: DailyClose[], by: DailyClose[]): DailyClose[] {
  const sorted = [...by].sort((a, b) => (a.date < b.date ? -1 : 1));
  let j = 0;
  let last: number | null = null;
  const out: DailyClose[] = [];
  for (const c of [...closes].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    while (j < sorted.length && sorted[j].date <= c.date) last = sorted[j++].close;
    if (last !== null) out.push({ date: c.date, close: c.close * last });
  }
  return out;
}
