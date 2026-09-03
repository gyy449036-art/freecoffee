import type { APIRoute } from 'astro';
import { createAuth } from '../../../server/auth';
import { isRoot } from '../../../server/admin';
import { updatePaymentSettings } from '../../../server/site-settings';

export const POST: APIRoute = async ({ request }) => {
  const session = await createAuth().api.getSession({ headers: request.headers });
  if (!session?.user || !(await isRoot(session.user.id))) return new Response('Unauthorized', { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const value = (name: string) => typeof body[name] === 'string' ? body[name] as string : undefined;
    await updatePaymentSettings({
      stripeSecretKey: value('stripeSecretKey'),
      stripeWebhookSecret: value('stripeWebhookSecret'),
      paypalClientId: value('paypalClientId'),
      paypalClientSecret: value('paypalClientSecret'),
      paypalWebhookId: value('paypalWebhookId'),
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Payment settings update failed', error);
    return Response.json({ error: 'Unable to save payment settings.' }, { status: 400 });
  }
};
