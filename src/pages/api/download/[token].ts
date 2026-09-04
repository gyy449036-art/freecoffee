import type { APIRoute } from 'astro';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../../../db';
import { downloadGrants, productFiles } from '../../../db/schema';
import { publicError, requestId } from '../../../server/http';
import { enforceRateLimit } from '../../../server/rate-limit';
import { createS3Client, objectUrl } from '../../../server/s3';
import { getS3Settings } from '../../../server/media';

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const GET: APIRoute = async ({ params, request }) => {
  const id = requestId(request);
  const rate = await enforceRateLimit(request, 'download');
  if (!rate.allowed) return publicError('Too many download attempts. Please try again shortly.', 429, id, rate.retryAfter);
  const token = params.token;
  if (!token) return publicError('Download not found.', 404, id);
  const db = createDb(env.DB);
  const tokenHash = await hashToken(token);
  const [grant] = await db.select().from(downloadGrants).where(eq(downloadGrants.tokenHash, tokenHash)).limit(1);
  if (!grant || grant.expiresAt.getTime() < Date.now()) return publicError('This download link has expired.', 410, id);
  const [claimed] = await db.update(downloadGrants).set({ downloadCount: sql`${downloadGrants.downloadCount} + 1` }).where(and(eq(downloadGrants.id, grant.id), gt(downloadGrants.expiresAt, new Date()), lt(downloadGrants.downloadCount, grant.maxDownloads))).returning({ id: downloadGrants.id });
  if (!claimed) return publicError('This download link has reached its limit.', 410, id);
  const [file] = await db.select().from(productFiles).where(eq(productFiles.productId, grant.productId)).limit(1);
  if (!file) return publicError('Download file not found.', 404, id);
  const settings = await getS3Settings(env.DB);
  if (!settings) return publicError('Download storage is not configured.', 503, id);
  const object = await createS3Client(settings).fetch(objectUrl(settings, file.r2Key), { method: 'GET' });
  if (object.status === 404) return publicError('Download file not found.', 404, id);
  if (!object.ok) return publicError('Unable to retrieve download file.', 502, id);
  const headers = new Headers(object.headers);
  headers.set('Content-Disposition', `attachment; filename="${file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
  headers.set('x-request-id', id);
  return new Response(object.body, { headers });
};