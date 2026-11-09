// Builds the embedded symbol catalogs (offline search) from downloaded source files:
//
//   curl -o list.html "https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/Temel-Degerler-Ve-Oranlar.aspx"
//   curl -o markets.json "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1"
//   curl -o binance.json "https://data-api.binance.vision/api/v3/ticker/price"
//   node scripts/build-catalogs.mjs list.html markets.json binance.json
//
// Output: src/data/market/catalog/bist.json and crypto.json (checked in).
import { readFileSync, writeFileSync } from 'node:fs';

const [listHtml, marketsJson, binanceJson] = process.argv.slice(2);
if (!listHtml || !marketsJson || !binanceJson) {
  console.error('usage: node scripts/build-catalogs.mjs list.html markets.json binance.json');
  process.exit(1);
}

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const trNumber = (s) => Number(s.replace(/\./g, '').replace(',', '.'));

// BIST: code, name, sector, market value (million TL) from İş Yatırım's company table.
const html = readFileSync(listHtml, 'utf8');
const row =
  /<tr><td><a href="\/tr-tr\/analiz\/hisse\/Sayfalar\/sirket-karti\.aspx\?hisse=([A-Z0-9]+)">[A-Z0-9]+<\/a><\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td class="text-right">([^<]*)<\/td><td class="text-right">([^<]*)<\/td>/g;
const bist = new Map();
for (let m = row.exec(html); m; m = row.exec(html)) {
  if (!bist.has(m[1]))
    bist.set(m[1], [m[1], decode(m[2]), decode(m[3]), Math.round(trNumber(m[5]) || 0)]);
}
const bistList = [...bist.values()].sort((a, b) => b[3] - a[3]);
writeFileSync('src/data/market/catalog/bist.json', JSON.stringify(bistList) + '\n');

// Crypto: CoinGecko's top coins by market value, with the Binance USDT pair when it exists.
const markets = JSON.parse(readFileSync(marketsJson, 'utf8'));
const pairs = new Set(JSON.parse(readFileSync(binanceJson, 'utf8')).map((p) => p.symbol));
const seen = new Set();
const crypto = [];
for (const c of markets) {
  const symbol = c.symbol.toUpperCase();
  if (seen.has(symbol)) continue; // the biggest coin keeps a ticker shared by smaller ones
  seen.add(symbol);
  const pair = `${symbol}USDT`;
  crypto.push([symbol, c.name, c.id, pairs.has(pair) ? pair : null]);
}
writeFileSync('src/data/market/catalog/crypto.json', JSON.stringify(crypto) + '\n');

console.log(`BIST: ${bistList.length} şirket, kripto: ${crypto.length} para`);
