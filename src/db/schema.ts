import { integer, index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const creators = sqliteTable('creators', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  handle: text('handle').notNull().unique(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  issuer: text('issuer'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verifications = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const adminBootstrap = sqliteTable('admin_bootstrap', {
  id: integer('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const siteSettings = sqliteTable('site_settings', {
  id: integer('id').primaryKey(),
  siteUrl: text('site_url').notNull().default(''),
  siteName: text('site_name').notNull().default('FreeCoffee.bio'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const creatorProfiles = sqliteTable('creator_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  handle: text('handle').notNull().unique(),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  website: text('website'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const supportTransactions = sqliteTable('support_transactions', {
  id: text('id').primaryKey(),
  creatorId: integer('creator_id').notNull().references(() => creatorProfiles.id, { onDelete: 'cascade' }),
  supporterUserId: text('supporter_user_id').references(() => users.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('pending'),
  message: text('message'),
  displayName: text('display_name'),
  anonymous: integer('anonymous', { mode: 'boolean' }).notNull().default(false),
  provider: text('provider'),
  providerPaymentId: text('provider_payment_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
}, (table) => ({
  creatorIdIdx: index('support_transactions_creator_id_idx').on(table.creatorId),
  supporterUserIdIdx: index('support_transactions_supporter_user_id_idx').on(table.supporterUserId),
  statusIdx: index('support_transactions_status_idx').on(table.status),
}));

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  creatorId: integer('creator_id').notNull().references(() => creatorProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  productType: text('product_type').notNull().default('digital'),
  price: integer('price').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('draft'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  creatorId: integer('creator_id').notNull().references(() => creatorProfiles.id, { onDelete: 'cascade' }),
  buyerUserId: text('buyer_user_id').references(() => users.id, { onDelete: 'set null' }),
  buyerEmail: text('buyer_email').notNull(),
  totalAmount: integer('total_amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('pending'),
  provider: text('provider'),
  providerPaymentId: text('provider_payment_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
}, (table) => ({
  creatorIdIdx: index('orders_creator_id_idx').on(table.creatorId),
  buyerUserIdIdx: index('orders_buyer_user_id_idx').on(table.buyerUserId),
  statusIdx: index('orders_status_idx').on(table.status),
}));

export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitAmount: integer('unit_amount').notNull(),
});

export const paymentRecords = sqliteTable('payment_records', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  kind: text('kind').notNull(),
  referenceId: text('reference_id').notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  provider: text('provider').notNull(),
  providerPaymentId: text('provider_payment_id'),
  status: text('status').notNull().default('pending'),
  rawReference: text('raw_reference'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  referenceIdIdx: index('payment_records_reference_id_idx').on(table.referenceId),
  userIdIdx: index('payment_records_user_id_idx').on(table.userId),
}));

export type Creator = typeof creators.$inferSelect;
export type NewCreator = typeof creators.$inferInsert;
export type User = typeof users.$inferSelect;
