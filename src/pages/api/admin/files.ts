import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../../../db';
import { productFiles, products } from '../../../db/schema';
import { createAuth } from '../../../server/auth';
import { isRoot } from '../../../server/admin';
import { getOrCreateCreator } from '../../../server/creator';

export const POST: APIRoute = async ({ request }) => {
  const session = await createAuth().api.getSession({ headers: request.headers });
  if (!session?.user || !(await isRoot(session.user.id))) return new Response('Unauthorized', { status: 401 });
  try {
    const form = await request.formData();
    const productId = String(form.get('productId') || '');
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 1 || file.size > 50 * 1024 * 1024) return Response.json({ error: 'Choose a file up to 50 MB.' }, { status: 400 });
    const creator = await getOrCreateCreator(session.user);
    const [product] = await createDb(env.DB).select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.creatorId, creator.id))).limit(1);
    if (!product) return Response.json({ error: 'Product not found.' }, { status: 404 });
    const id = crypto.randomUUID();
    const key = `products/${creator.id}/${productId}/${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type || 'application/octet-stream', contentDisposition: `attachment; filename="${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}"` } });
    const now = new Date();
    await createDb(env.DB).insert(productFiles).values({ id, productId, r2Key: key, fileName: file.name, fileSize: file.size, createdAt: now });
    return Response.json({ id, fileName: file.name, fileSize: file.size }, { status: 201 });
  } catch (error) {
    console.error('Product file upload failed', error);
    return Response.json({ error: 'Unable to upload product file.' }, { status: 400 });
  }
};
