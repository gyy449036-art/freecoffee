import Big from 'big.js';
import { eq } from 'drizzle-orm';
import { isCurrency, type Currency, SUPPORTED_CURRENCIES } from './money';
import { env } from 'cloudflare:workers';
import { createDb } from '../db';
import { creatorPageSettings, products, siteSettings } from '../db/schema';
import { convertCurrency, saveUsdRate } from './exchange-rate';
const defaultSettings = {
  id: 1,
  siteUrl: '',
  siteName: 'FreeCoffee.bio',
  currency: 'USD' as Currency,
  taxRate: 0,
  stripeSecretKey: '',
  stripeWebhookSecret: '',
  paypalClientId: '',
  paypalClientSecret: '',
  paypalWebhookId: '',
  updatedAt: new Date(),
};

export function normalizeSiteUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Site URL must use HTTP or HTTPS.');
  return url.origin;
}

export async function getSiteSettings() {
  const db = createDb(env.DB);
  const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  const value = settings ?? defaultSettings;
  return { ...value, currency: isCurrency(value.currency) ? value.currency : 'USD' as Currency };
}

export async function ensureSiteSettings(siteUrl?: string) {
  const db = createDb(env.DB);
  const existing = await getSiteSettings();
  const normalizedSiteUrl = siteUrl ? normalizeSiteUrl(siteUrl) : existing.siteUrl;
  if (existing.siteUrl !== normalizedSiteUrl) {
    await db.update(siteSettings).set({ siteUrl: normalizedSiteUrl, updatedAt: new Date() }).where(eq(siteSettings.id, 1));
  }
  return getSiteSettings();
}

export async function updateSiteSettings(input: { siteUrl?: string; currency?: unknown; taxRate?: unknown; exchangeRates?: unknown; confirmCurrencyChange?: boolean }) {
  const db = createDb(env.DB);
  const existing = await getSiteSettings();
  const currency = input.currency === undefined ? existing.currency : input.currency;
  if (!isCurrency(currency)) throw new Error('Unsupported currency.');
  const taxRateValue = input.taxRate === undefined ? String(existing.taxRate) : String(input.taxRate);
  let taxRate: number;
  try {
    const basisPoints = new Big(taxRateValue).times(100).round(0, Big.roundHalfUp).toFixed(0);
    taxRate = Number.parseInt(basisPoints, 10);
  } catch {
    throw new Error('Tax rate must be between 0% and 100%.');
  }
  if (!Number.isSafeInteger(taxRate) || taxRate < 0 || taxRate > 10000) throw new Error('Tax rate must be between 0% and 100%.');
  if (currency !== existing.currency && input.confirmCurrencyChange !== true) throw new Error('Confirm currency change to migrate editable prices.');
  if (input.exchangeRates !== undefined) {
    if (!input.exchangeRates || typeof input.exchangeRates !== 'object') throw new Error('Invalid exchange rates.');
    for (const quote of SUPPORTED_CURRENCIES) {
      if (quote === 'USD') continue;
      const value = (input.exchangeRates as Record<string, unknown>)[quote];
      if (typeof value !== 'string' || value.trim() === '') continue;
      await saveUsdRate(quote, value.trim());
    }
  }
  const siteUrl = input.siteUrl === undefined ? existing.siteUrl : normalizeSiteUrl(input.siteUrl);
  if (currency !== existing.currency) {
    const productRows = await db.select().from(products);
    const productMigrations = [];
    for (const product of productRows) {
      if (!isCurrency(product.currency)) throw new Error('Cannot migrate a product with an unsupported currency.');
      productMigrations.push({ product, converted: await convertCurrency(product.price, product.currency, currency) });
    }
    const pageRows = await db.select().from(creatorPageSettings);
    const pageMigrations = [];
    for (const page of pageRows) {
      const defaultAmount = await convertCurrency(page.defaultSupportAmount, existing.currency, currency);
      const goalAmount = page.supportGoalAmount ? await convertCurrency(page.supportGoalAmount, existing.currency, currency) : null;
      pageMigrations.push({ page, defaultAmount, goalAmount });
    }
    const migrationStatements = [
      ...productMigrations.map(({ product, converted }) => db.update(products).set({ price: converted.amount, currency, updatedAt: new Date() }).where(eq(products.id, product.id))),
      ...pageMigrations.map(({ page, defaultAmount, goalAmount }) => db.update(creatorPageSettings).set({ defaultSupportAmount: defaultAmount.amount, supportGoalAmount: goalAmount?.amount ?? page.supportGoalAmount, updatedAt: new Date() }).where(eq(creatorPageSettings.creatorId, page.creatorId))),
      db.update(siteSettings).set({ siteUrl, currency, taxRate, updatedAt: new Date() }).where(eq(siteSettings.id, 1)),
    ];
    await db.batch(migrationStatements as [typeof migrationStatements[0], ...typeof migrationStatements]);
  } else {
    await db.update(siteSettings).set({ siteUrl, currency, taxRate, updatedAt: new Date() }).where(eq(siteSettings.id, 1));
  }
  return getSiteSettings();
}

export async function updateSiteUrl(value: string) {
  const siteUrl = normalizeSiteUrl(value);
  await createDb(env.DB).update(siteSettings).set({ siteUrl, updatedAt: new Date() }).where(eq(siteSettings.id, 1));
  return siteUrl;
}

export async function updatePaymentSettings(input: { stripeSecretKey?: string; stripeWebhookSecret?: string; paypalClientId?: string; paypalClientSecret?: string; paypalWebhookId?: string }) {
  const db = createDb(env.DB);
  const existing = await getSiteSettings();
  const values = {
    id: 1,
    siteUrl: existing.siteUrl,
    siteName: existing.siteName,
    currency: existing.currency,
    taxRate: existing.taxRate,
    stripeSecretKey: input.stripeSecretKey || existing.stripeSecretKey,
    stripeWebhookSecret: input.stripeWebhookSecret || existing.stripeWebhookSecret,
    paypalClientId: input.paypalClientId || existing.paypalClientId,
    paypalClientSecret: input.paypalClientSecret || existing.paypalClientSecret,
    paypalWebhookId: input.paypalWebhookId || existing.paypalWebhookId,
    updatedAt: new Date(),
  };
  await db.insert(siteSettings).values(values).onConflictDoUpdate({ target: siteSettings.id, set: { siteUrl: values.siteUrl, siteName: values.siteName, currency: values.currency, taxRate: values.taxRate, stripeSecretKey: values.stripeSecretKey, stripeWebhookSecret: values.stripeWebhookSecret, paypalClientId: values.paypalClientId, paypalClientSecret: values.paypalClientSecret, paypalWebhookId: values.paypalWebhookId, updatedAt: values.updatedAt } });
}

export async function disconnectPaymentProvider(provider: 'stripe' | 'paypal') {
  const db = createDb(env.DB);
  const values = provider === 'stripe'
    ? { stripeSecretKey: '', stripeWebhookSecret: '', updatedAt: new Date() }
    : { paypalClientId: '', paypalClientSecret: '', paypalWebhookId: '', updatedAt: new Date() };
  await db.update(siteSettings).set(values).where(eq(siteSettings.id, 1));
}

export async function getSiteCallbackUrl(path: string): Promise<string> {
  const settings = await getSiteSettings();
  if (!settings.siteUrl) throw new Error('Site URL is not configured.');
  return new URL(path, `${settings.siteUrl}/`).toString();
}
