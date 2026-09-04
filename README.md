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

Configure your Cloudflare resources in `wrangler.jsonc` before manual deployment. Product and media files use the S3-compatible storage configured in the admin panel.

## Local development

```sh
npm install
npm run db:migrate:local
npm run dev
```

The development server runs at `http://localhost:4321`.
