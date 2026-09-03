import type { APIRoute } from 'astro';
import { isRoot } from '../../../server/admin';
import { createAuth } from '../../../server/auth';
import { updatePaymentAccount } from '../../../server/creator';

export const POST: APIRoute = async ({ request }) => {
  const session = await createAuth().api.getSession({ headers: request.headers });
  if (!session?.user || !(await isRoot(session.user.id))) return new Response('Unauthorized', { status: 401 });
  try {
    const body = await request.json() as { provider?: unknown; status?: unknown };
    if (!['stripe', 'paypal'].includes(String(body.provider)) || !['connected', 'not_connected'].includes(String(body.status))) return Response.json({ error: 'Invalid payment account.' }, { status: 400 });
    await updatePaymentAccount(session.user, String(body.provider), String(body.status));
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Payment account update failed', error);
    return Response.json({ error: 'Unable to update payment account.' }, { status: 400 });
  }
};
