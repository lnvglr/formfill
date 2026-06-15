#!/usr/bin/env bash
# Deploy formfill to Railway from the linked GitHub repo (lnvglr/formfill).
# Prerequisites: railway login, .env.local with your secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v railway >/dev/null 2>&1; then
  echo "Install Railway CLI: https://docs.railway.com/guides/cli"
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: railway login"
  exit 1
fi

echo "==> Railway account: $(railway whoami)"

# Create/link project
if ! railway status >/dev/null 2>&1; then
  echo "==> Creating Railway project 'formfill'..."
  railway init -n formfill
fi

echo "==> Project status:"
railway status

# Connect GitHub repo (idempotent — may error if service already exists)
if ! railway status 2>/dev/null | grep -q "formfill"; then
  echo "==> Connecting GitHub repo lnvglr/formfill..."
  railway add --repo lnvglr/formfill --service formfill || true
fi

# Push env vars from .env.local (skip comments / blanks)
if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — copy from .env.local.example"
  exit 1
fi

echo "==> Setting environment variables..."
SET_ARGS=()
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"          # strip trailing comments
  line="$(echo "$line" | xargs)" # trim whitespace
  [[ -z "$line" ]] && continue
  [[ "$line" != *"="* ]] && continue
  key="${line%%=*}"
  # Skip client-only Stripe publishable key (not used server-side)
  [[ "$key" == "STRIPE_PUBLISHABLE_KEY" ]] && continue
  SET_ARGS+=(--set "$line")
done < .env.local

railway variables "${SET_ARGS[@]}" --skip-deploys

# Public Railway domain
echo "==> Generating Railway domain..."
DOMAIN_JSON="$(railway domain --json 2>/dev/null || true)"
if [[ -n "$DOMAIN_JSON" ]]; then
  DOMAIN="$(echo "$DOMAIN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('domain', d.get('url','').replace('https://','')))" 2>/dev/null || true)"
else
  DOMAIN="$(railway domain 2>/dev/null | tail -1 | tr -d '[:space:]' || true)"
fi

if [[ -n "$DOMAIN" && "$DOMAIN" != *"railway.app"* ]]; then
  DOMAIN="${DOMAIN#https://}"
fi

if [[ -n "$DOMAIN" ]]; then
  APP_URL="https://${DOMAIN#https://}"
  echo "==> Setting NEXT_PUBLIC_APP_URL=$APP_URL"
  railway variables --set "NEXT_PUBLIC_APP_URL=$APP_URL"
else
  echo "WARN: Could not detect domain — set NEXT_PUBLIC_APP_URL manually in Railway dashboard"
fi

echo "==> Triggering deploy from GitHub..."
railway redeploy -y 2>/dev/null || railway up --detach 2>/dev/null || true

echo ""
echo "Done. Open dashboard:"
railway open 2>/dev/null || true
echo ""
echo "Post-deploy checklist:"
echo "  1. Supabase → Auth → add redirect URL: \${NEXT_PUBLIC_APP_URL}/auth/callback"
echo "  2. Supabase → Passkeys → set RP ID + origin to your Railway domain"
echo "  3. Stripe → webhook: \${NEXT_PUBLIC_APP_URL}/api/webhooks/stripe"
