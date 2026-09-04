import Big from 'big.js';
import { and, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../db';
import { exchangeRates } from '../db/schema';
import { amountToMinor, CURRENCY_DECIMALS, isCurrency, type Currency } from './money';

export type RateSnapshot = {
  baseCurrency: 'USD';
  quoteCurrency: Currency;
  rate: string;
  source: string;
  effectiveAt: Date;
};

export async function getUsdRate(quoteCurrency: Currency): Promise<RateSnapshot> {
  if (quoteCurrency === 'USD') return { baseCurrency: 'USD', quoteCurrency, rate: '1', source: 'base', effectiveAt: new Date() };
  const [row] = await createDb(env.DB).select().from(exchangeRates).where(and(eq(exchangeRates.baseCurrency, 'USD'), eq(exchangeRates.quoteCurrency, quoteCurrency))).limit(1);
  try {
    if (!row || new Big(row.rate).lte(0)) throw new Error(`Exchange rate for ${quoteCurrency} is not configured.`);
  } catch {
    throw new Error(`Exchange rate for ${quoteCurrency} is not configured.`);
  }
  const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
  if (row.effectiveAt.getTime() < Date.now() - maxAgeMs) throw new Error(`Exchange rate for ${quoteCurrency} has expired.`);
  return { baseCurrency: 'USD', quoteCurrency, rate: row.rate, source: row.source, effectiveAt: row.effectiveAt };
}

export async function convertCurrency(minor: number, from: Currency, to: Currency): Promise<{ amount: number; rate: RateSnapshot | null; conversionRate: string | null }> {
  if (from === to) return { amount: minor, rate: null, conversionRate: null };
  const sourceMajor = new Big(minor).div(new Big(10).pow(CURRENCY_DECIMALS[from]));
  let targetMajor: Big;
  let rate: RateSnapshot;
  let conversionRate: string;
  if (from === 'USD') {
    rate = await getUsdRate(to);
    targetMajor = sourceMajor.times(rate.rate);
    conversionRate = rate.rate;
  } else {
    const fromRate = await getUsdRate(from);
    const usdMajor = sourceMajor.div(fromRate.rate);
    if (to === 'USD') {
      rate = fromRate;
      targetMajor = usdMajor;
      conversionRate = new Big(1).div(fromRate.rate).toFixed();
    } else {
      rate = await getUsdRate(to);
      targetMajor = usdMajor.times(rate.rate);
      conversionRate = rate.rate;
    }
  }
  return { amount: amountToMinor(targetMajor.toFixed(), to), rate, conversionRate };
}

export async function saveUsdRate(quoteCurrency: Currency, rate: string, source = 'manual'): Promise<void> {
  try {
    if (!isCurrency(quoteCurrency) || quoteCurrency === 'USD' || !/^\d+(?:\.\d+)?$/.test(rate) || new Big(rate).lte(0)) throw new Error('Invalid exchange rate.');
  } catch {
    throw new Error('Invalid exchange rate.');
  }
  const now = new Date();
  await createDb(env.DB).insert(exchangeRates).values({ baseCurrency: 'USD', quoteCurrency, rate, source, effectiveAt: now, updatedAt: now }).onConflictDoUpdate({ target: [exchangeRates.baseCurrency, exchangeRates.quoteCurrency], set: { rate, source, effectiveAt: now, updatedAt: now } });
}
