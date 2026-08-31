import type { APIRoute } from 'astro';
import { createAuth } from '../../../server/auth';
import { isRoot } from '../../../server/admin';
import { updateSiteUrl } from '../../../server/site-settings';

export const POST: APIRoute = async ({ request }) => {
  const session = await createAuth().api.getSession({ headers: request.headers });
  if (!session?.user || !(await isRoot(session.user.id))) return new Response('Unauthorized', { status: 401 });

  let body: { siteUrl?: unknown };
  try {
    body = await request.json() as { siteUrl?: unknown };
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (typeof body.siteUrl !== 'string' || !/^https?:\/\/[^\s]+$/i.test(body.siteUrl) || body.siteUrl.length > 500) {
    return Response.json({ error: 'Enter a valid site URL.' }, { status: 400 });
  }

  try {
    const siteUrl = await updateSiteUrl(body.siteUrl);
    return Response.json({ siteUrl });
  } catch {
    return Response.json({ error: 'Enter a valid site origin, for example https://example.com.' }, { status: 400 });
  }
};
