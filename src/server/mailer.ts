import { WorkerMailer } from 'worker-mailer';
import { env } from 'cloudflare:workers';
import { createDb } from '../db';
import { notificationDeliveries, smtpSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string; referenceId?: string }) {
  const db = createDb(env.DB);
  const [settings] = await db.select().from(smtpSettings).where(eq(smtpSettings.id, 1)).limit(1);
  if (!settings?.enabled || !settings.host || !settings.fromAddress || !settings.password) throw new Error('Email delivery is not configured.');
  const mailer = await WorkerMailer.connect({ host: settings.host, port: settings.port, secure: settings.secure, credentials: { username: settings.username, password: settings.password }, authType: ['plain', 'login'], socketTimeoutMs: 10000, responseTimeoutMs: 10000 });
  try {
    await mailer.send({ from: { name: 'FreeCoffee.bio', email: settings.fromAddress }, to: input.to, reply: settings.replyTo || undefined, subject: input.subject, text: input.text, html: input.html });
  } finally {
    await mailer.close();
  }
  return { sent: true, referenceId: input.referenceId };
}

export async function sendTestEmail(to: string) {
  const db = createDb(env.DB);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(notificationDeliveries).values({ id, recipient: to, template: 'smtp-test', referenceId: null, status: 'pending', attempts: 0, createdAt: now, updatedAt: now });
  try {
    const result = await sendEmail({ to, subject: 'FreeCoffee.bio SMTP test', text: 'Your FreeCoffee.bio email delivery configuration is working.', html: '<p>Your FreeCoffee.bio email delivery configuration is working.</p>' });
    await db.update(notificationDeliveries).set({ status: 'sent', attempts: 1, updatedAt: new Date() }).where(eq(notificationDeliveries.id, id));
    return result;
  } catch (error) {
    await db.update(notificationDeliveries).set({ status: 'failed', attempts: 1, lastError: error instanceof Error ? error.message : String(error), updatedAt: new Date() }).where(eq(notificationDeliveries.id, id));
    throw error;
  }
}
