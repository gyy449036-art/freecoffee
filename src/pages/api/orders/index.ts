import type { APIRoute } from 'astro';
import { and, desc, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../../../db';
import { downloadGrants, orderItems, orders, products } from '../../../db/schema';
import { getCurrentUser } from '../../../server/session';

export const GET: APIRoute = async ({ request }) => {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: 'Sign in to view your orders.' }, { status: 401 });
  const db = createDb(env.DB);
  const rows = await db.select({ order: orders, item: orderItems, productName: products.name, grant: downloadGrants }).from(orders).leftJoin(orderItems, eq(orderItems.orderId, orders.id)).leftJoin(products, eq(products.id, orderItems.productId)).leftJoin(downloadGrants, and(eq(downloadGrants.orderId, orders.id), eq(downloadGrants.productId, orderItems.productId))).where(eq(orders.buyerUserId, user.id)).orderBy(desc(orders.createdAt));
  const result = new Map<string, { order: typeof rows[number]['order']; items: Array<{ name: string; quantity: number; amount: number }>; downloads: Array<{ productId: string; url: string; count: number; max: number; expiresAt: Date }> }>();
  for (const row of rows) {
    let entry = result.get(row.order.id);
    if (!entry) { entry = { order: row.order, items: [], downloads: [] }; result.set(row.order.id, entry); }
    if (row.item && !entry.items.some((item) => item.name === row.item?.productName)) entry.items.push({ name: row.item.productName, quantity: row.item.quantity, amount: row.item.unitAmount });
    if (row.grant) entry.downloads.push({ productId: row.grant.productId, url: `/api/download/grant/${row.grant.id}`, count: row.grant.downloadCount, max: row.grant.maxDownloads, expiresAt: row.grant.expiresAt });
  }
  return Response.json({ orders: [...result.values()] });
};
