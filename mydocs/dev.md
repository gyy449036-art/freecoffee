# Development notes

## Configuration boundaries

- `ADMIN_PATH` is a deployment-level environment variable. It controls only the hidden administrator route segment, for example `/admin`.
- `site_url` is stored in D1 `site_settings` and contains only the site origin, such as `https://freecoffee.demo.workers.dev`. It must not contain `/admin` or a callback path.
- Business callback URLs are built from the D1 site origin and the relevant business path.
- `BETTER_AUTH_URL` is not used for Cloudflare Workers. Better Auth derives the request origin dynamically; `BETTER_AUTH_SECRET` remains deployment configuration.

## Authentication and authorization

- Better Auth's `user` and `session` tables are shared by normal front-end users and the root administrator.
- Authentication and authorization are separate concerns.
- `/install` is the only root-admin bootstrap flow. `admin_bootstrap` binds the root administrator to a Better Auth user ID.
- A valid front-end user session does not grant administrator access. Admin routes must verify the root binding.
- Front-end users can register, sign in, sign out, support creators, and purchase products. Admin authentication uses a separate route and authorization check even though the underlying Better Auth provider is shared.

## Data model

- Supporters and buyers are ordinary users; their optional IDs are retained on support transactions, orders, and payment records.
- Creator-owned data references `creator_profiles`.
- Money is stored as integer minor units (for example, cents), with an explicit currency on each monetary record.
- Support transactions, products, orders, order items, and payment records retain the relationships needed for future payment-provider integration. Do not trust a client-provided final amount.

## UI components

- Use official shadcn components for UI primitives.
- Add components through the shadcn CLI, for example `npx shadcn@latest add select --overwrite --yes`, rather than hand-writing replacements for Radix/shadcn primitives.
- Use shadcn `Select` for dropdowns such as shop and payment filters.
