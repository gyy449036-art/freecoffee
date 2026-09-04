import type { APIRoute } from 'astro';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../../../../db';
import { downloadGrants, orderItems, orders, productFiles } from '../../../../db/schema';
import { getCurrentUser } from '../../../../server/session';
import { createS3Client, objectUrl } from '../../../../server/s3';
import { getS3Settings } from '../../../../server/media';

export const GET: APIRoute = async ({ params, request }) => {
  const user = await getCurrentUser(request);
  if (!user || !params.id) return new Response('Unauthorized', { status: 401 });
  const db = createDb(env.DB);
  const [grant] = await db.select().from(downloadGrants).where(eq(downloadGrants.id, params.id)).limit(1);
  const [order] = grant ? await db.select({ buyerUserId: orders.buyerUserId }).from(orders).where(eq(orders.id, grant.orderId)).limit(1) : [];
  if (!grant || !order || order.buyerUserId !== user.id) return new Response('Download not found.', { status: 404 });
  const [claimed] = await db.update(downloadGrants).set({ downloadCount: sql`${downloadGrants.downloadCount} + 1` }).where(and(eq(downloadGrants.id, grant.id), gt(downloadGrants.expiresAt, new Date()), lt(downloadGrants.downloadCount, grant.maxDownloads))).returning({ id: downloadGrants.id });
  if (!claimed) return new Response('Download link expired or limit reached.', { status: 410 });
  const [file] = await db.select().from(productFiles).where(eq(productFiles.productId, grant.productId)).limit(1);
  const settings = await getS3Settings(env.DB);
  if (!file || !settings) return new Response('Download file not found.', { status: 404 });
  const object = await createS3Client(settings).fetch(objectUrl(settings, file.r2Key));
  if (!object.ok) return new Response('Unable to retrieve download file.', { status: 502 });
  const headers = new Headers(object.headers);
  headers.set('Content-Disposition', `attachment; filename="${file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
  return new Response(object.body, { headers });
};
