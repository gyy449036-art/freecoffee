# FreeCoffee.bio

A creator support platform built with Astro and Cloudflare Workers. It supports creator pages, content publishing, digital products, and payment-based support.

## One-click deployment

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/freecoffee-bio/freecoffee.bio)

## Manual deployment

```sh
npm install
npm run build
npm run deploy
```

Configure your Cloudflare resources in `wrangler.jsonc` before deploying. Cloudflare will provision the D1 database and KV namespace when using the one-click deployment button.

## Local development

```sh
npm install
npm run db:migrate:local
npm run dev
```

The development server runs at `http://localhost:4321`.
