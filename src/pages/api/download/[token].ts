import type { APIRoute } from 'astro';
import { and, eq, lt } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../../../db';
import { downloadGrants, productFiles } from '../../../db/schema';
import { publicError, requestId } from '../../../server/http';

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const GET: APIRoute = async ({ params, request }) => {
  const id = requestId(request);
  const token = params.token;
  if (!token) return publicError('Download not found.', 404, id);
  const db = createDb(env.DB);
  const tokenHash = await hashToken(token);
  const [grant] = await db.select().from(downloadGrants).where(eq(downloadGrants.tokenHash, tokenHash)).limit(1);
  if (!grant || grant.expiresAt.getTime() < Date.now()) return publicError('This download link has expired.', 410, id);
  if (grant.downloadCount >= grant.maxDownloads) return publicError('This download link has reached its limit.', 410, id);
  const [file] = await db.select().from(productFiles).where(eq(productFiles.productId, grant.productId)).limit(1);
  if (!file) return publicError('Download file not found.', 404, id);
  const object = await env.FILES.get(file.r2Key);
  if (!object) return publicError('Download file not found.', 404, id);
  const [claimed] = await db.update(downloadGrants).set({ downloadCount: grant.downloadCount + 1 }).where(and(eq(downloadGrants.id, grant.id), lt(downloadGrants.downloadCount, downloadGrants.maxDownloads))).returning({ id: downloadGrants.id });
  if (!claimed) return publicError('This download link has reached its limit.', 410, id);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `attachment; filename="${file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
    headers.set('x-request-id', id);
  return new Response(object.body, { headers });
};