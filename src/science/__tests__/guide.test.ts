import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { GUIDE, GUIDE_CATEGORIES, guideEntry, shortCite } from '../guide';

const SRC = join(__dirname, '../..');
const SECTIONS = ['whatif', 'performance', 'allocation', 'davranis'];

describe('Bilim Rehberi', () => {
  it('has unique ids, a known category, a source for every entry', () => {
    expect(new Set(GUIDE.map((g) => g.id)).size).toBe(GUIDE.length);
    const categories = GUIDE_CATEGORIES.map((c) => c.key);
    for (const g of GUIDE) {
      expect(categories).toContain(g.category);
      expect(g.sources.length).toBeGreaterThan(0);
      for (const s of g.sources) {
        expect(s.text).toMatch(/\(\d{4}\)|Data Library/); // author (year), or the data set
        if (s.url) expect(s.url).toMatch(/^https:\/\//);
      }
      expect(g.claim.length).toBeGreaterThan(20);
      expect(g.meaning.length).toBeGreaterThan(20);
    }
    expect(GUIDE.length).toBeGreaterThanOrEqual(20);
  });

  it('links only to screens that exist', () => {
    for (const g of GUIDE) {
      if (!g.link) continue;
      const [path, query] = g.link.href.split('?');
      if (path === '/(tabs)/analiz') {
        expect(SECTIONS).toContain(new URLSearchParams(query).get('bolum'));
      } else {
        expect(path).toBe('/plan');
      }
    }
  });

  it('every “Bilim:” link in the app points to an entry', () => {
    const files = readdirSync(SRC, { recursive: true }).filter((f) => f.endsWith('.tsx'));
    const used = new Set<string>();
    for (const f of files) {
      for (const m of readFileSync(join(SRC, f), 'utf8').matchAll(/<ScienceLink id="([^"]+)"/g)) {
        used.add(m[1]);
      }
    }
    expect(used.size).toBeGreaterThan(10);
    for (const id of used) expect(guideEntry(id)).toBeDefined();
  });

  it('gives no personal buy or sell instructions', () => {
    const text = GUIDE.map((g) => `${g.claim} ${g.body} ${g.meaning}`).join(' ');
    expect(text).not.toMatch(/\b(almalısın|satmalısın|al(ın)?\s*!|sat(ın)?\s*!)/i);
  });
});

describe('short citations', () => {
  it('names one, two or many authors and organisations', () => {
    expect(shortCite('Odean, T. (1998). Are investors…')).toBe('Odean 1998');
    expect(shortCite('Barber, B. M. & Odean, T. (2000). Trading…')).toBe('Barber & Odean 2000');
    expect(shortCite('Bailey, D. H. & López de Prado, M. (2012). The Sharpe…')).toBe(
      'Bailey & López de Prado 2012',
    );
    expect(shortCite('Dimson, E., Marsh, P. & Staunton, M. (2025). UBS…')).toBe('Dimson vd. 2025');
    expect(shortCite('Morningstar (2025). Mind the Gap…')).toBe('Morningstar 2025');
    expect(shortCite('Kenneth R. French Data Library (veri kaynağı).')).toBe(
      'Kenneth R. French Data Library',
    );
  });
});
