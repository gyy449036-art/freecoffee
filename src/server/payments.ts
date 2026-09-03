import { and, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../db';
import { creatorPageSettings, creatorProfiles, downloadGrants, orderItems, orders, paymentEvents, paymentRecords, products, supportTransactions, productFiles, users, siteSettings } from '../db/schema';
import { dispatchEmailNotification } from './notifications';
import { getSiteSettings } from './site-settings';

export type PaymentProviderName = 'stripe' | 'paypal';

type PaymentInput = { provider: PaymentProviderName; referenceId: string; amount: number; currency: string; description: string; returnUrl: string; cancelUrl: string; anonymous?: boolean };

type PaymentCheckout = { url: string; providerPaymentId: string };

export async function getPaymentSettings() {
  const db = createDb(env.DB);
  const [settings] = await db.select({ stripeSecretKey: siteSettings.stripeSecretKey, stripeWebhookSecret: siteSettings.stripeWebhookSecret, paypalClientId: siteSettings.paypalClientId, paypalClientSecret: siteSettings.paypalClientSecret, paypalWebhookId: siteSettings.paypalWebhookId }).from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  return settings;
}

async function createStripeCheckout(input: PaymentInput): Promise<PaymentCheckout> {
  const settings = await getPaymentSettings();
  const key = settings?.stripeSecretKey; 
  if (!key) throw new Error('Stripe is not configured.');
  const body = new URLSearchParams({
    mode: 'payment',
    success_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    'line_items[0][price_data][currency]': input.currency.toLowerCase(),
    'line_items[0][price_data][product_data][name]': input.description,
    'line_items[0][price_data][unit_amount]': String(input.amount),
    'line_items[0][quantity]': '1',
    'metadata[reference_id]': input.referenceId,
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Basic ${btoa(`${key}:`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error(`Stripe checkout failed with status ${response.status}.`);
  const result = await response.json() as { id?: string; url?: string };
  if (!result.id || !result.url) throw new Error('Stripe returned an invalid checkout session.');
  return { providerPaymentId: result.id, url: result.url };
}

async function getPayPalAccessToken() {
  const settings = await getPaymentSettings();
  const clientId = settings?.paypalClientId;
  const clientSecret = settings?.paypalClientSecret;
  if (!clientId || !clientSecret) throw new Error('PayPal is not configured.');
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', { method: 'POST', headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!response.ok) throw new Error(`PayPal authentication failed with status ${response.status}.`);
  const result = await response.json() as { access_token?: string };
  if (!result.access_token) throw new Error('PayPal did not return an access token.');
  return result.access_token;
}

async function createPayPalCheckout(input: PaymentInput): Promise<PaymentCheckout> {
  const token = await getPayPalAccessToken();
  const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ reference_id: input.referenceId, custom_id: input.referenceId, description: input.description, amount: { currency_code: input.currency.toUpperCase(), value: (input.amount / 100).toFixed(2) } }], application_context: { return_url: input.returnUrl, cancel_url: input.cancelUrl, user_action: 'PAY_NOW' } }) });
  if (!response.ok) throw new Error(`PayPal order creation failed with status ${response.status}.`);
  const result = await response.json() as { id?: string; links?: Array<{ rel?: string; href?: string }> };
  const approve = result.links?.find((link) => link.rel === 'approve')?.href;
  if (!result.id || !approve) throw new Error('PayPal returned an invalid checkout order.');
  return { providerPaymentId: result.id, url: approve };
}

export async function createSupportCheckout(input: { handle: string; amount: number; currency: string; provider: PaymentProviderName; email: string; displayName?: string; message?: string; anonymous?: boolean; returnUrl: string; cancelUrl: string }) {
  const db = createDb(env.DB);
  const [creator] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.handle, input.handle.toLowerCase())).limit(1);
  if (!creator) throw new Error('Creator page not found.');
  const [page] = await db.select().from(creatorPageSettings).where(eq(creatorPageSettings.creatorId, creator.id)).limit(1);
  if (page?.showSupport === false) throw new Error('Support is currently unavailable.');
  if (input.anonymous && page?.allowAnonymous === false) throw new Error('Anonymous support is not enabled.');
  const settings = await getPaymentSettings();
  if (input.provider === 'stripe' && !settings?.stripeSecretKey) throw new Error('Stripe is not configured.');
  if (input.provider === 'paypal' && (!settings?.paypalClientId || !settings.paypalClientSecret)) throw new Error('PayPal is not configured.');
  if (!Number.isInteger(input.amount) || input.amount < 100 || input.amount > 100000000) throw new Error('Support amount must be between 1.00 and 1,000,000.00.');
  if (!/^\S+@\S+\.\S+$/.test(input.email) || input.email.length > 320) throw new Error('Enter a valid receipt email.');
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(supportTransactions).values({ id, creatorId: creator.id, supporterEmail: input.email.toLowerCase(), amount: input.amount, currency: input.currency.toUpperCase(), status: 'pending', message: input.message?.slice(0, 240) || null, displayName: input.displayName?.slice(0, 100) || null, anonymous: input.anonymous === true, provider: input.provider, createdAt: now });
  await db.insert(paymentRecords).values({ id: crypto.randomUUID(), kind: 'support', referenceId: id, amount: input.amount, currency: input.currency.toUpperCase(), provider: input.provider, status: 'pending', createdAt: now, updatedAt: now });
  try {
    const checkout = input.provider === 'stripe' ? await createStripeCheckout({ provider: input.provider, referenceId: id, amount: input.amount, currency: input.currency, description: `Support ${creator.displayName}`, returnUrl: input.returnUrl.replace('{REFERENCE_ID}', id), cancelUrl: input.cancelUrl }) : await createPayPalCheckout({ provider: input.provider, referenceId: id, amount: input.amount, currency: input.currency, description: `Support ${creator.displayName}`, returnUrl: input.returnUrl.replace('{REFERENCE_ID}', id), cancelUrl: input.cancelUrl });
    await db.update(supportTransactions).set({ providerPaymentId: checkout.providerPaymentId }).where(eq(supportTransactions.id, id));
    await db.update(paymentRecords).set({ providerPaymentId: checkout.providerPaymentId, updatedAt: new Date() }).where(and(eq(paymentRecords.referenceId, id), eq(paymentRecords.provider, input.provider)));
    return { id, ...checkout };
  } catch (error) {
    await db.update(supportTransactions).set({ status: 'failed' }).where(eq(supportTransactions.id, id));
    await db.update(paymentRecords).set({ status: 'failed', updatedAt: new Date() }).where(eq(paymentRecords.referenceId, id));
    throw error;
  }
}

export async function createOrderCheckout(input: { handle: string; productId: string; email: string; provider: PaymentProviderName; returnUrl: string; cancelUrl: string }) {
  const db = createDb(env.DB);
  const [creator] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.handle, input.handle.toLowerCase())).limit(1);
  if (!creator) throw new Error('Creator page not found.');
  const settings = await getPaymentSettings();
  if (input.provider === 'stripe' && !settings?.stripeSecretKey) throw new Error('Stripe is not configured.');
  if (input.provider === 'paypal' && (!settings?.paypalClientId || !settings.paypalClientSecret)) throw new Error('PayPal is not configured.');
  const [product] = await db.select().from(products).where(and(eq(products.id, input.productId), eq(products.creatorId, creator.id), eq(products.status, 'published'))).limit(1);
  if (!product) throw new Error('Product not found.');
  if (!/^\S+@\S+\.\S+$/.test(input.email)) throw new Error('Enter a valid buyer email.');
  const orderId = crypto.randomUUID();
  const now = new Date();
  await db.insert(orders).values({ id: orderId, creatorId: creator.id, buyerEmail: input.email.toLowerCase(), totalAmount: product.price, currency: product.currency, status: 'pending', provider: input.provider, createdAt: now });
  await db.insert(orderItems).values({ orderId, productId: product.id, productName: product.name, quantity: 1, unitAmount: product.price });
  await db.insert(paymentRecords).values({ id: crypto.randomUUID(), kind: 'order', referenceId: orderId, amount: product.price, currency: product.currency, provider: input.provider, status: 'pending', createdAt: now, updatedAt: now });
  try {
    const checkout = input.provider === 'stripe' ? await createStripeCheckout({ provider: input.provider, referenceId: orderId, amount: product.price, currency: product.currency, description: product.name, returnUrl: input.returnUrl.replace('{REFERENCE_ID}', orderId), cancelUrl: input.cancelUrl }) : await createPayPalCheckout({ provider: input.provider, referenceId: orderId, amount: product.price, currency: product.currency, description: product.name, returnUrl: input.returnUrl.replace('{REFERENCE_ID}', orderId), cancelUrl: input.cancelUrl });
    await db.update(orders).set({ providerPaymentId: checkout.providerPaymentId }).where(eq(orders.id, orderId));
    await db.update(paymentRecords).set({ providerPaymentId: checkout.providerPaymentId, updatedAt: new Date() }).where(eq(paymentRecords.referenceId, orderId));
    return { id: orderId, ...checkout };
  } catch (error) {
    await db.update(orders).set({ status: 'failed' }).where(eq(orders.id, orderId));
    await db.update(paymentRecords).set({ status: 'failed', updatedAt: new Date() }).where(eq(paymentRecords.referenceId, orderId));
    throw error;
  }
}

async function sendNotification(recipient: string, template: string, referenceId: string, data: Record<string, string>) {
  await dispatchEmailNotification({ recipient, eventKey: template, referenceId, data });
}

export async function markPaymentComplete(referenceId: string, provider: string, providerPaymentId: string) {
  const db = createDb(env.DB);
  const now = new Date();
  const [payment] = await db.select().from(paymentRecords).where(and(eq(paymentRecords.referenceId, referenceId), eq(paymentRecords.provider, provider))).limit(1);
  if (!payment || payment.status === 'paid') return;
  const [claimed] = await db.update(paymentRecords).set({ status: 'paid', providerPaymentId, updatedAt: now }).where(and(eq(paymentRecords.id, payment.id), eq(paymentRecords.status, 'pending'))).returning({ id: paymentRecords.id });
  if (!claimed) return;
  if (payment.kind === 'support') {
    await db.update(supportTransactions).set({ status: 'paid', paidAt: now, providerPaymentId }).where(eq(supportTransactions.id, referenceId));
    const [support] = await db.select().from(supportTransactions).where(eq(supportTransactions.id, referenceId)).limit(1);
    if (support) {
      await sendNotification(support.supporterEmail, 'support-receipt', referenceId, { siteName: 'FreeCoffee.bio', amount: (support.amount / 100).toFixed(2), currency: support.currency });
      const [creator] = await db.select({ userEmail: users.email, displayName: creatorProfiles.displayName }).from(creatorProfiles).innerJoin(users, eq(creatorProfiles.userId, users.id)).where(eq(creatorProfiles.id, support.creatorId)).limit(1);
      if (creator) await sendNotification(creator.userEmail, 'creator-support-notification', referenceId, { siteName: 'FreeCoffee.bio', supporterName: support.displayName || 'A supporter', amount: (support.amount / 100).toFixed(2), currency: support.currency });
    }
  } else if (payment.kind === 'order') {
    await db.update(orders).set({ status: 'paid', paidAt: now, providerPaymentId }).where(eq(orders.id, referenceId));
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, referenceId));
    const downloadLinks: string[] = [];
    const siteSettings = await getSiteSettings();
    for (const item of items) {
      const [file] = await db.select().from(productFiles).where(eq(productFiles.productId, item.productId)).limit(1);
      if (!file) continue;
      const token = crypto.randomUUID();
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const tokenHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      await db.insert(downloadGrants).values({ id: crypto.randomUUID(), orderId: referenceId, productId: item.productId, tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000), maxDownloads: 3, createdAt: now });
      if (siteSettings.siteUrl) downloadLinks.push(new URL(`/api/download/${token}`, `${siteSettings.siteUrl}/`).toString());
    }
    const [order] = await db.select().from(orders).where(eq(orders.id, referenceId)).limit(1);
    if (order) await sendNotification(order.buyerEmail, 'order-receipt', referenceId, { siteName: 'FreeCoffee.bio', orderId: order.id, downloadLinks: downloadLinks.join('\n') });
  }
}

export async function recordPaymentEvent(provider: string, providerEventId: string, payload: string) {
  const db = createDb(env.DB);
  const [existing] = await db.select({ id: paymentEvents.id }).from(paymentEvents).where(eq(paymentEvents.providerEventId, providerEventId)).limit(1);
  if (existing) return false;
  const inserted = await db.insert(paymentEvents).values({ id: crypto.randomUUID(), provider, providerEventId, payload, status: 'received', receivedAt: new Date() }).onConflictDoNothing({ target: [paymentEvents.provider, paymentEvents.providerEventId] }).returning({ id: paymentEvents.id });
  return inserted.length > 0;
}
