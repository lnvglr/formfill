# Security Policy

## Reporting a Vulnerability

If you discover a security issue, please **do not** open a public GitHub issue.

Email the maintainer privately with:

- A description of the vulnerability
- Steps to reproduce
- Impact assessment (if known)

We will acknowledge receipt within a few days and work on a fix before any public disclosure.

## Security Model

Formfill is designed around **client-side encryption** for personal data:

| Data | Where it lives | Server visibility |
|------|----------------|-------------------|
| Profile fields (name, address, etc.) | Encrypted vault blob in `user_vaults` | Opaque ciphertext only |
| Filled PDFs | Encrypted in Supabase Storage | Opaque ciphertext only |
| Application metadata | Postgres (`applications`, `application_fields`) | Labels and field counts only — **no field values** |
| PDF text sent to AI | Transient in API handlers | Used for analysis/mapping only; user profile is never sent |

### What the AI sees

The `/api/analyze` and `/api/map-fields` endpoints receive **PDF text and field names only**. User profile data is never included in AI prompts.

### Authentication

- Supabase Auth with Row Level Security (RLS) on all user tables
- Passkeys (WebAuthn) and email OTP supported
- Anonymous (guest) sessions for try-before-sign-up
- Super-admin role promoted via `SUPER_ADMIN_EMAILS` env var (server-side only)

### Secrets

Never commit or expose:

- `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`, `HF_TOKEN`

`NEXT_PUBLIC_*` variables are embedded in the browser bundle — only use publishable keys there.

### Stripe webhooks

Webhook signatures are verified with `STRIPE_WEBHOOK_SECRET` before processing events.

### Admin endpoints

`/api/admin/*` and `/admin` require `app_metadata.role === "super_admin"`. Promotion happens server-side when a configured email signs in.

## Self-Hosting Checklist

- [ ] Use a dedicated Supabase project (do not share production credentials)
- [ ] Enable RLS on all tables (migrations handle this)
- [ ] Configure Supabase Auth redirect URLs for your domain only
- [ ] Set passkey RP ID and origins to your production domain
- [ ] Use Stripe webhook signing secrets per environment
- [ ] Restrict `SUPER_ADMIN_EMAILS` to trusted addresses
- [ ] Keep server secrets out of client env vars (`NEXT_PUBLIC_` prefix)
