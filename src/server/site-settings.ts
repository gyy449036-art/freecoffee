import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../db';
import { siteSettings } from '../db/schema';
const defaultSettings = {
  id: 1,
  siteUrl: '',
  siteName: 'FreeCoffee.bio',
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
  return settings ?? defaultSettings;
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

export async function updateSiteUrl(value: string) {
  const siteUrl = normalizeSiteUrl(value);
  await createDb(env.DB).update(siteSettings).set({ siteUrl, updatedAt: new Date() }).where(eq(siteSettings.id, 1));
  return siteUrl;
}

export async function updatePaymentSettings(input: { stripeSecretKey?: string; stripeWebhookSecret?: string; paypalClientId?: string; paypalClientSecret?: string; paypalWebhookId?: string }) {
  const db = createDb(env.DB);
  const existing = await getSiteSettings();
  const values = {
    stripeSecretKey: input.stripeSecretKey || existing.stripeSecretKey,
    stripeWebhookSecret: input.stripeWebhookSecret || existing.stripeWebhookSecret,
    paypalClientId: input.paypalClientId || existing.paypalClientId,
    paypalClientSecret: input.paypalClientSecret || existing.paypalClientSecret,
    paypalWebhookId: input.paypalWebhookId || existing.paypalWebhookId,
    updatedAt: new Date(),
  };
  await db.update(siteSettings).set(values).where(eq(siteSettings.id, 1));
}

export async function getSiteCallbackUrl(path: string): Promise<string> {
  const settings = await getSiteSettings();
  if (!settings.siteUrl) throw new Error('Site URL is not configured.');
  return new URL(path, `${settings.siteUrl}/`).toString();
}
