import type { APIRoute } from 'astro';
import { and, desc, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../../../db';
import { productFiles, products } from '../../../db/schema';
import { isRoot } from '../../../server/admin';
import { createAuth } from '../../../server/auth';
import { getOrCreateCreator } from '../../../server/creator';

async function rootUser(request: Request) {
  const session = await createAuth().api.getSession({ headers: request.headers });
  return session?.user && await isRoot(session.user.id) ? session.user : null;
}

export const GET: APIRoute = async ({ request }) => {
  const user = await rootUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const creator = await getOrCreateCreator(user);
  const rows = await createDb(env.DB).select().from(products).where(eq(products.creatorId, creator.id)).orderBy(desc(products.createdAt));
  return Response.json({ products: rows });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await rootUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const price = Number(body.price);
    const status = body.status === 'published' ? 'published' : 'draft';
    if (!name || name.length > 160 || !Number.isInteger(price) || price < 0 || price > 100000000) return Response.json({ error: 'Enter a valid product name and price in cents.' }, { status: 400 });
    if (status === 'published') return Response.json({ error: 'Create the product as a draft, upload a file, then publish it.' }, { status: 400 });
    const creator = await getOrCreateCreator(user);
    const now = new Date();
    const [product] = await createDb(env.DB).insert(products).values({ id: crypto.randomUUID(), creatorId: creator.id, name, description: description || null, price, currency: 'USD', productType: 'digital', status, createdAt: now, updatedAt: now }).returning();
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Product creation failed', error);
    return Response.json({ error: 'Unable to create product.' }, { status: 400 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const user = await rootUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  try {
    const body = await request.json() as { id?: unknown };
    const id = typeof body.id === 'string' ? body.id : '';
    const creator = await getOrCreateCreator(user);
    const db = createDb(env.DB);
    const [product] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, id), eq(products.creatorId, creator.id))).limit(1);
    if (!product) return Response.json({ error: 'Product not found.' }, { status: 404 });
    const files = await db.select({ id: productFiles.id, r2Key: productFiles.r2Key }).from(productFiles).where(eq(productFiles.productId, id));
    for (const file of files) await env.FILES.delete(file.r2Key);
    await db.delete(productFiles).where(eq(productFiles.productId, id));
    await db.delete(products).where(eq(products.id, id));
    return Response.json({ id });
  } catch (error) {
    console.error('Product deletion failed', error);
    return Response.json({ error: 'Unable to delete product.' }, { status: 400 });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const user = await rootUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : '';
    const creator = await getOrCreateCreator(user);
    const values: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.name === 'string') values.name = body.name.trim();
    if (typeof body.description === 'string') values.description = body.description.trim() || null;
    if (typeof body.price === 'number' && Number.isInteger(body.price)) values.price = body.price;
    if (body.status === 'draft' || body.status === 'archived') values.status = body.status;
    if (body.status === 'published') {
          const [file] = await createDb(env.DB).select({ id: productFiles.id }).from(productFiles).where(eq(productFiles.productId, id)).limit(1);
          if (!file) return Response.json({ error: 'Upload at least one digital file before publishing.' }, { status: 400 });
          values.status = 'published';
        }
    const [product] = await createDb(env.DB).update(products).set(values).where(and(eq(products.id, id), eq(products.creatorId, creator.id))).returning();
    if (!product) return Response.json({ error: 'Product not found.' }, { status: 404 });
    return Response.json({ product });
  } catch (error) {
    console.error('Product update failed', error);
    return Response.json({ error: 'Unable to update product.' }, { status: 400 });
  }
};
