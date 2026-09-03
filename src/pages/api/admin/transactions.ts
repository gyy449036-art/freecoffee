import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '../../../db';
import { orders, paymentRecords, supportTransactions } from '../../../db/schema';
import { createAuth } from '../../../server/auth';
import { isRoot } from '../../../server/admin';
import { getOrCreateCreator } from '../../../server/creator';

export const GET: APIRoute = async ({ request }) => {
  const session = await createAuth().api.getSession({ headers: request.headers });
  if (!session?.user || !(await isRoot(session.user.id))) return new Response('Unauthorized', { status: 401 });
  const creator = await getOrCreateCreator(session.user);
  const db = createDb(env.DB);
  const [supports, creatorOrders] = await Promise.all([
    db.select().from(supportTransactions).where(eq(supportTransactions.creatorId, creator.id)).orderBy(desc(supportTransactions.createdAt)),
    db.select().from(orders).where(eq(orders.creatorId, creator.id)).orderBy(desc(orders.createdAt)),
  ]);
  const referenceIds = [...supports.map((item) => item.id), ...creatorOrders.map((item) => item.id)];
  const payments = referenceIds.length ? await db.select().from(paymentRecords).orderBy(desc(paymentRecords.createdAt)) : [];
  return Response.json({ supports, orders: creatorOrders, payments: payments.filter((payment) => referenceIds.includes(payment.referenceId)) });
};
