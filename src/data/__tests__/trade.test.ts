import { describe, expect, it } from '@jest/globals';

import { daysBetween, type Transaction } from '@/domain';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { DEFAULT_ENGINE } from '../engine';
import { MarketRouter } from '../market/router';
import type { MarketSource } from '../market/types';
import { fakeHttp } from '../market/__tests__/fakeHttp';
import { getAssets } from '../repo/assets';
import { insertPortfolio } from '../repo/portfolios';
import { upsertCloses } from '../repo/prices';
import { closeOnDay, ensureAsset, recentAssetIds } from '../service/trade';
import { saveTransaction } from '../service/transactions';
import { defaultDividendTax, defaultFee, feeRule, previewTrade, tradeTime } from '../trade';

const NOW = new Date('2026-11-09T12:00:00Z');
const T = (t: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'ts'>): Transaction => t;

describe('trade form helpers', () => {
  it('suggests commissions and withholding by market', () => {
    expect(defaultFee('BIST', 31_240)).toBe(62.48); // ‰2
    expect(defaultFee('US', 5_000)).toBe(1);
    expect(defaultFee('CRYPTO', 1_000)).toBe(1);
    expect(defaultFee('FX', 1_000)).toBe(0);
    expect(defaultFee('BIST', 0)).toBe(0);
    expect(feeRule('BIST')).toBe('‰2 otomatik');
    expect(feeRule('INDEX')).toBeNull();
    expect(defaultDividendTax('BIST')).toBe(0.15);
    expect(defaultDividendTax('US')).toBe(0.2);
  });

  it('places past trades in the session, today at the current time, or at a given time', () => {
    expect(tradeTime('BIST', '2026-11-05', NOW)).toBe('2026-11-05T08:00:00.000Z'); // 11:00 TR
    expect(tradeTime('US', '2026-11-05', NOW)).toBe('2026-11-05T15:00:00.000Z'); // 18:00 TR
    expect(tradeTime('CRYPTO', '2026-11-09', NOW)).toBe(NOW.toISOString());
    expect(tradeTime('BIST', '2026-11-05', NOW, '14:32')).toBe('2026-11-05T11:32:00.000Z');
    expect(tradeTime('BIST', '2026-11-05', NOW, '25:00')).toBe('2026-11-05T08:00:00.000Z');
  });

  const history = [
    T({ id: 'd', type: 'DEPOSIT', ts: '2026-10-01T07:00:00Z', amount: '20000' }),
    T({
      id: 'b1',
      type: 'BUY',
      ts: '2026-10-02T08:00:00Z',
      assetId: 'X',
      quantity: '100',
      price: '100',
      fee: '20',
    }),
  ];

  it('previews a purchase: new units, new average cost and the automatic deposit', () => {
    const p = previewTrade(
      history,
      T({
        id: 'new',
        type: 'BUY',
        ts: '2026-11-05T08:00:00Z',
        assetId: 'X',
        quantity: '100',
        price: '150',
        fee: '30',
      }),
      DEFAULT_ENGINE,
    );
    expect(p.quantityBefore.toString()).toBe('100');
    expect(p.quantityAfter.toString()).toBe('200');
    expect(p.averageCostAfter?.toString()).toBe('125.25'); // (10.020 + 15.030) / 200
    expect(p.cashBefore.toString()).toBe('9980');
    expect(p.autoDeposit?.toString()).toBe('5050'); // 15.030 − 9.980
    expect(p.issues).toEqual([]);
  });

  it('previews a sale: realized result, and refuses selling more than held', () => {
    const sale = previewTrade(
      history,
      T({
        id: 's',
        type: 'SELL',
        ts: '2026-11-05T08:00:00Z',
        assetId: 'X',
        quantity: '40',
        price: '130',
        fee: '10',
      }),
      DEFAULT_ENGINE,
    );
    expect(sale.realization?.pnlTRY.toString()).toBe('1182'); // 40×130 − 10 − 40×100,2
    expect(sale.quantityAfter.toString()).toBe('60');
    expect(sale.autoDeposit).toBeNull();
    const tooMany = previewTrade(
      history,
      T({
        id: 's',
        type: 'SELL',
        ts: '2026-11-05T08:00:00Z',
        assetId: 'X',
        quantity: '150',
        price: '130',
      }),
      DEFAULT_ENGINE,
    );
    expect(tooMany.issues.map((i) => i.code)).toEqual(['OVERSELL']);
  });

  it('previews an edit in place of the original record', () => {
    const p = previewTrade(history, { ...history[1], quantity: '50' }, DEFAULT_ENGINE);
    expect(p.quantityBefore.toString()).toBe('0');
    expect(p.quantityAfter.toString()).toBe('50');
  });
});

describe('trade form data', () => {
  function source(prices: Record<string, number>): MarketSource & { asked: string[] } {
    const asked: string[] = [];
    return {
      id: 'yahoo',
      asked,
      async quotes() {
        return new Map();
      },
      async history(ref, from, to) {
        asked.push(`${ref} ${from} ${to}`);
        return {
          closes: daysBetween(from, to)
            .filter((d) => new Date(`${d}T00:00:00Z`).getUTCDay() % 6 !== 0)
            .map((date) => ({ date, close: prices[ref] })),
          splits: [],
          dividends: [],
        };
      },
    };
  }

  it('finds the close of a day, downloading the week once when it is missing', async () => {
    const db = openNodeDriver();
    await migrate(db);
    const yahoo = source({ 'THYAO.IS': 301 });
    const router = new MarketRouter({ yahoo }, fakeHttp([]));
    // Saturday → Friday's close.
    expect(await closeOnDay(db, router, 'BIST:THYAO', '2026-11-07')).toEqual({
      date: '2026-11-06',
      close: 301,
    });
    expect(yahoo.asked).toEqual(['THYAO.IS 2026-10-28 2026-11-07']);
    expect(await closeOnDay(db, router, 'BIST:THYAO', '2026-11-04')).toEqual({
      date: '2026-11-04',
      close: 301,
    });
    expect(yahoo.asked).toHaveLength(1); // stored now
    // Offline: whatever is stored.
    await upsertCloses(db, [['demo:THYAO', '2026-11-02', 290]]);
    expect(await closeOnDay(db, null, 'demo:THYAO', '2026-11-09')).toEqual({
      date: '2026-11-02',
      close: 290,
    });
    expect(await closeOnDay(db, null, 'BIST:NOPE', '2026-11-09')).toBeNull();
  });

  it('creates the asset a record needs and lists recently traded assets', async () => {
    const db = openNodeDriver();
    await migrate(db);
    await insertPortfolio(db, {
      id: 'main',
      name: 'Ana Portföy',
      kind: 'user',
      sortOrder: 0,
      seriesDirtyFrom: null,
      createdAt: NOW.toISOString(),
    });
    await ensureAsset(db, {
      id: 'US:AAPL',
      symbol: 'AAPL',
      name: 'Apple',
      market: 'US',
      currency: 'USD',
    });
    await ensureAsset(db, {
      id: 'BIST:THYAO',
      symbol: 'THYAO',
      name: 'Türk Hava Yolları',
      market: 'BIST',
      currency: 'TRY',
    });
    expect((await getAssets(db, ['US:AAPL'])).get('US:AAPL')?.providerSymbol).toBe('AAPL');
    const opts = { now: NOW };
    await saveTransaction(
      db,
      'main',
      { id: '', type: 'DEPOSIT', ts: '2026-10-01T07:00:00Z', amount: '100000' },
      opts,
    );
    await saveTransaction(
      db,
      'main',
      {
        id: '',
        type: 'BUY',
        ts: '2026-10-02T08:00:00Z',
        assetId: 'BIST:THYAO',
        quantity: '10',
        price: '280',
      },
      opts,
    );
    await saveTransaction(
      db,
      'main',
      {
        id: '',
        type: 'BUY',
        ts: '2026-10-20T16:00:00Z',
        assetId: 'US:AAPL',
        quantity: '1',
        price: '250',
        fxRate: '42',
      },
      opts,
    );
    expect(await recentAssetIds(db)).toEqual(['US:AAPL', 'BIST:THYAO']);
  });
});
