import { and, desc, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../db';
import { notificationDeliveries, notificationTemplates } from '../db/schema';
import { sendEmail } from './mailer';

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;

export const defaultNotificationTemplates = [
  { eventKey: 'support-receipt', displayName: 'Support payment receipt', description: 'Sent to a supporter after a payment is completed.', subject: 'Your {{siteName}} support receipt', bodyText: 'Thank you for supporting {{siteName}}. Your payment of {{amount}} {{currency}} was confirmed.', bodyHtml: '<p>Thank you for supporting {{siteName}}.</p><p>Your payment of <strong>{{amount}} {{currency}}</strong> was confirmed.</p>' },
  { eventKey: 'creator-support-notification', displayName: 'New support notification', description: 'Sent to the creator when someone sends support.', subject: 'You received support on {{siteName}}', bodyText: '{{supporterName}} sent {{amount}} {{currency}}.', bodyHtml: '<p>{{supporterName}} sent <strong>{{amount}} {{currency}}</strong>.</p>' },
  { eventKey: 'order-receipt', displayName: 'Order payment receipt', description: 'Sent to a buyer after a shop order is paid.', subject: 'Your {{siteName}} purchase', bodyText: 'Your order {{orderId}} was confirmed.\n\nDownload links (valid for 7 days, up to 3 downloads):\n{{downloadLinks}}', bodyHtml: '<p>Your order <strong>{{orderId}}</strong> was confirmed.</p><p>{{downloadLinks}}</p>' },
];

export async function ensureNotificationTemplates() {
  const db = createDb(env.DB);
  const now = new Date();
  for (const template of defaultNotificationTemplates) {
    await db.insert(notificationTemplates).values({ id: template.eventKey, channel: 'email', ...template, enabled: true, createdAt: now, updatedAt: now }).onConflictDoNothing({ target: [notificationTemplates.eventKey, notificationTemplates.channel] });
  }
}

export async function listNotificationTemplates() {
  await ensureNotificationTemplates();
  return createDb(env.DB).select().from(notificationTemplates).where(eq(notificationTemplates.channel, 'email')).orderBy(notificationTemplates.displayName);
}

export async function updateNotificationTemplate(id: string, input: Pick<NotificationTemplate, 'displayName' | 'description' | 'subject' | 'bodyText' | 'bodyHtml' | 'enabled'>) {
  await ensureNotificationTemplates();
  const [row] = await createDb(env.DB).update(notificationTemplates).set({ ...input, updatedAt: new Date() }).where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.channel, 'email'))).returning();
  if (!row) throw new Error('Template not found.');
  return row;
}

function render(value: string, data: Record<string, string>) {
  return value.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => data[key] ?? `{{${key}}}`);
}

export async function dispatchEmailNotification(input: { recipient: string; eventKey: string; referenceId?: string; data: Record<string, string> }) {
  await ensureNotificationTemplates();
  const db = createDb(env.DB);
  const [template] = await db.select().from(notificationTemplates).where(and(eq(notificationTemplates.eventKey, input.eventKey), eq(notificationTemplates.channel, 'email'))).limit(1);
  if (!template || !template.enabled) return;
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(notificationDeliveries).values({ id, channel: 'email', recipient: input.recipient, template: input.eventKey, referenceId: input.referenceId ?? null, status: 'pending', attempts: 0, createdAt: now, updatedAt: now });
  try {
    await sendEmail({ to: input.recipient, subject: render(template.subject, input.data), text: render(template.bodyText, input.data), html: template.bodyHtml ? render(template.bodyHtml, input.data) : undefined, referenceId: input.referenceId });
    await db.update(notificationDeliveries).set({ status: 'sent', attempts: 1, updatedAt: new Date() }).where(eq(notificationDeliveries.id, id));
  } catch (error) {
    await db.update(notificationDeliveries).set({ status: 'failed', attempts: 1, lastError: error instanceof Error ? error.message : String(error), updatedAt: new Date() }).where(eq(notificationDeliveries.id, id));
  }
}

export async function listNotificationDeliveries() {
  return createDb(env.DB).select().from(notificationDeliveries).where(eq(notificationDeliveries.channel, 'email')).orderBy(desc(notificationDeliveries.createdAt)).limit(200);
}
