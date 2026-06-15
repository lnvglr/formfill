# Deployment

Formfill is a standard Next.js app. Build with `npm run build`, start with `npm run start`. The server listens on `PORT` (default 3000).

## Environment Variables

Set all variables from [`.env.local.example`](../.env.local.example) in your hosting provider. **Never** commit real values.

Required for a minimal deployment (preview + guest mode):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY`
- AI provider keys (`ANTHROPIC_API_KEY` or `HF_TOKEN`)

For full features add Stripe vars and `NEXT_PUBLIC_APP_URL`.

## Post-Deploy Checklist

After your first deploy, update external services with your production URL:

### Supabase

1. **Redirect URLs:** `https://your-domain.com/auth/callback`
2. **Passkeys:** RP ID = your domain; origin = `https://your-domain.com`
3. Confirm Anonymous sign-ins enabled (if using guest mode)

### Stripe

1. Webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
2. Update `STRIPE_WEBHOOK_SECRET` with the production signing secret
3. Set `NEXT_PUBLIC_APP_URL=https://your-domain.com`

## Railway

[Railway](https://railway.app/) works well for Node.js hosting.

1. Connect your GitHub repo or deploy via CLI
2. Railway auto-detects Next.js — build command: `npm run build`, start: `npm run start`
3. Add all environment variables in **Variables**
4. Railway sets `PORT` automatically — Next.js respects it
5. Optionally add a custom domain under **Settings → Networking**

No `Dockerfile` required unless you want one.

## Vercel

```bash
npx vercel
```

Add environment variables in the Vercel dashboard. Vercel is the native host for Next.js and handles edge/middleware automatically.

## Docker (optional)

If you prefer containers:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

Note: standalone output requires `output: "standalone"` in `next.config.ts`. The default config works with `npm start` on Railway/Vercel without Docker.

## Build Verification

Before deploying:

```bash
npm run lint
npm run build
npm run start
```

Visit the production URL and test:

1. Landing page loads
2. Guest upload + AI analysis
3. Login (OTP or passkey)
4. Stripe checkout (test mode)

## Scaling Notes

- AI API calls are the main latency bottleneck — consider Anthropic for production
- PDF processing runs in the browser; server load is mostly API + Supabase
- Supabase connection pooling is handled by Supabase; no extra config needed for typical traffic
- `serverActions.bodySizeLimit` is set to 15mb in `next.config.ts` for encrypted PDF uploads
