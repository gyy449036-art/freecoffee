import type { APIRoute } from 'astro';
import { createAuth } from '../../../server/auth';
import { isRoot } from '../../../server/admin';
import { updateSiteSettings } from '../../../server/site-settings';

export const POST: APIRoute = async ({ request }) => {
  const session = await createAuth().api.getSession({ headers: request.headers });
  if (!session?.user || !(await isRoot(session.user.id))) return new Response('Unauthorized', { status: 401 });

  let body: { siteUrl?: unknown; currency?: unknown; taxRate?: unknown; exchangeRates?: unknown; confirmCurrencyChange?: unknown };
  try {
    body = await request.json() as { siteUrl?: unknown; currency?: unknown; taxRate?: unknown; exchangeRates?: unknown };
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (body.siteUrl !== undefined && (typeof body.siteUrl !== 'string' || !/^https?:\/\/[^\s]+$/i.test(body.siteUrl) || body.siteUrl.length > 500)) {
    return Response.json({ error: 'Enter a valid site URL.' }, { status: 400 });
  }

  try {
    const settings = await updateSiteSettings({
      siteUrl: typeof body.siteUrl === 'string' ? body.siteUrl : undefined,
      currency: body.currency,
      taxRate: body.taxRate,
      exchangeRates: body.exchangeRates,
      confirmCurrencyChange: body.confirmCurrencyChange === true,
    });
    return Response.json({ currency: settings.currency, taxRate: settings.taxRate });
  } catch (error) {
    console.error('Site settings update failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to save settings.' }, { status: 400 });
  }
};
