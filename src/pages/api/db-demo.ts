import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';

import { createDb } from '../../db';
import { creators } from '../../db/schema';

export const GET: APIRoute = async () => {
  const database = env.DB;

  if (!database) {
    return new Response(JSON.stringify({ error: 'D1 binding DB is not available' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  const db = createDb(database);
  const demoHandle = 'demo';
  const existing = await db.select().from(creators).where(eq(creators.handle, demoHandle)).limit(1);

  if (existing.length === 0) {
    await db.insert(creators).values({
      handle: demoHandle,
      displayName: 'FreeCoffee Demo',
      createdAt: new Date(),
    });
  }

  const creator = await db.select().from(creators).where(eq(creators.handle, demoHandle)).limit(1);

  return new Response(JSON.stringify({ ok: true, creator: creator[0] }), {
    headers: { 'content-type': 'application/json' },
  });
};
