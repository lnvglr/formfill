# Setup Guide

Complete setup for running Formfill locally or in a new environment.

## 1. Supabase Project

Create a project at [supabase.com](https://supabase.com/dashboard).

### API keys

From **Project Settings → API**:

| Variable | Where |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
| `SUPABASE_SECRET_KEY` | Secret keys (`sb_secret_…`) — server only |

### Run migrations

Apply all files in `supabase/migrations/` in chronological order. See [supabase/README.md](../supabase/README.md).

This creates tables, RLS policies, storage buckets (`form-templates`, `user-documents`), billing RPCs, and seeds a sample form family.

### Authentication

Enable in the Supabase Dashboard:

#### Anonymous sign-ins (guest mode)

**Authentication → Providers → Anonymous sign-ins → Enable**

Guests get a full preview and one free download without creating an account.

#### Email OTP

**Authentication → Providers → Email** — enabled by default. Magic links and OTP codes work out of the box.

#### Passkeys (optional)

**Authentication → Passkeys → Enable**

For local development:

- **RP ID:** `localhost`
- **Origins:** `http://localhost:3000`

For production, set RP ID to your domain (without protocol) and add `https://your-domain.com` as an origin.

#### Redirect URLs

**Authentication → URL Configuration → Redirect URLs**

Add:

```
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

## 2. AI Provider

Copy `.env.local.example` to `.env.local` and configure one provider.

### Option A: Hugging Face (good for testing)

1. Create a token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) with **Inference Providers** permission
2. Enable providers at [huggingface.co/settings/inference-providers](https://huggingface.co/settings/inference-providers)
3. Set:

```env
AI_PROVIDER=huggingface
HF_TOKEN=hf_...
HF_MODEL=meta-llama/Llama-3.3-70B-Instruct
HF_BASE_URL=https://router.huggingface.co/v1
```

### Option B: Anthropic (recommended for production)

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-sonnet-4-6
```

If `AI_PROVIDER` is unset, the app auto-selects Hugging Face when `HF_TOKEN` is set, otherwise Anthropic.

### Local inference (optional)

Point `HF_BASE_URL` at a local OpenAI-compatible server (TGI, vLLM, llama.cpp):

```env
HF_BASE_URL=http://localhost:8080/v1
HF_TOKEN=
```

## 3. Stripe (optional — billing)

Skip this section if you only need preview/guest mode without download credits.

### API keys

From [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys):

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Products and prices

Create in Stripe Dashboard:

1. **Credit pack** — one-time payment, 10 credits → `STRIPE_PRICE_CREDITS_10`
2. **Pro subscription** — recurring monthly → `STRIPE_PRICE_PRO_MONTHLY`

### Webhooks (local development)

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Webhooks (production)

Add endpoint: `https://your-domain.com/api/webhooks/stripe`

Events to listen for:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## 4. Admin access (optional)

Comma-separated emails promoted to `super_admin` on login:

```env
SUPER_ADMIN_EMAILS=you@example.com
```

Requires `SUPABASE_SECRET_KEY` for role promotion via the Admin API.

Access the dashboard at `/admin`.

## 5. Verify

```bash
npm install
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000) — landing page loads
2. Click **Jetzt ausprobieren** → guest session starts, upload view appears
3. Upload a PDF with AcroForm fields → AI analysis runs
4. Sign in via `/login` → vault sync and settings work

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Passkey verification failed | Add your origin to Supabase Passkeys settings |
| AI returns 401/403 | Check API key; for HF, verify Inference Providers are enabled |
| Stripe webhook 400 | `STRIPE_WEBHOOK_SECRET` must match the endpoint secret |
| Guest mode fails | Enable Anonymous sign-ins in Supabase |
| Super admin not working | Set `SUPER_ADMIN_EMAILS` and `SUPABASE_SECRET_KEY`; sign out and back in |
