#!/usr/bin/env bash
# Sets the Convex *prod* deployment (tame-spaniel-616) env vars required for
# Convex Auth + Google OAuth + the ALLOWED_EMAILS whitelist.
#
# Run this ONCE, locally, after you have:
#   - Created a Convex production deploy key in the Convex dashboard
#     (tame-spaniel-616 → Settings → Deploy Keys → Production)
#   - Added `https://tame-spaniel-616.convex.site/api/auth/callback/google`
#     to your Google OAuth client's Authorized redirect URIs
#
# Usage:
#   CONVEX_DEPLOY_KEY_PROD='<paste>' \
#   ALLOWED_EMAILS='nicolas.cassis@gmail.com,...' \
#   scripts/setup-convex-prod-auth.sh
#
# What it does:
#   1. Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from your dev Convex
#      deployment (since you want to share one OAuth client).
#   2. Writes them + SITE_URL + ALLOWED_EMAILS to the prod deployment.
#   3. Runs `npx @convex-dev/auth` against prod to generate and store
#      JWT_PRIVATE_KEY + JWKS.
#
# Idempotent enough: re-running overwrites the auth env vars with the same
# values, except JWT_PRIVATE_KEY + JWKS which would get rotated on each run
# (forcing all users to re-authenticate). Don't re-run unless you want that.

set -euo pipefail

if [[ -z "${CONVEX_DEPLOY_KEY_PROD:-}" ]]; then
	echo "ERROR: CONVEX_DEPLOY_KEY_PROD env var is required." >&2
	echo "  Get one from the Convex dashboard:" >&2
	echo "  https://dashboard.convex.dev → sigga project → tame-spaniel-616 →" >&2
	echo "  Settings → Deploy Keys → Production → Create new." >&2
	exit 1
fi

if [[ -z "${ALLOWED_EMAILS:-}" ]]; then
	echo "ERROR: ALLOWED_EMAILS env var is required (comma-separated)." >&2
	exit 1
fi

SITE_URL="${SITE_URL:-https://sigga.vercel.app}"

echo "==> Reading AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from dev Convex..."
# Reads from the deployment configured in .env.local (dev).
GOOGLE_ID=$(bunx convex env get AUTH_GOOGLE_ID 2>/dev/null || true)
GOOGLE_SECRET=$(bunx convex env get AUTH_GOOGLE_SECRET 2>/dev/null || true)

if [[ -z "$GOOGLE_ID" || -z "$GOOGLE_SECRET" ]]; then
	echo "ERROR: Could not read AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET from dev." >&2
	echo "  Ensure .env.local points at your dev Convex deployment and that" >&2
	echo "  those vars are set there. Run 'bunx convex env list' to verify." >&2
	exit 1
fi

echo "    Found AUTH_GOOGLE_ID=${GOOGLE_ID:0:12}... (hidden)"
echo ""
echo "==> Writing env vars to Convex *prod* (tame-spaniel-616)..."

# Use the prod deploy key for every subsequent convex command in this subshell.
export CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY_PROD"

bunx convex env set SITE_URL "$SITE_URL"
echo "    ✓ SITE_URL=$SITE_URL"

bunx convex env set AUTH_GOOGLE_ID "$GOOGLE_ID"
echo "    ✓ AUTH_GOOGLE_ID (copied from dev)"

bunx convex env set AUTH_GOOGLE_SECRET "$GOOGLE_SECRET"
echo "    ✓ AUTH_GOOGLE_SECRET (copied from dev)"

bunx convex env set ALLOWED_EMAILS "$ALLOWED_EMAILS"
echo "    ✓ ALLOWED_EMAILS=$ALLOWED_EMAILS"

echo ""
echo "==> Generating JWT_PRIVATE_KEY + JWKS on prod..."
echo "    (If they already exist, this will refuse to overwrite them.)"
bunx @convex-dev/auth

echo ""
echo "==> All prod Convex env vars set."
echo ""
echo "Next steps:"
echo "  1. In Vercel, add CONVEX_DEPLOY_KEY (Production scope) with the same"
echo "     value as CONVEX_DEPLOY_KEY_PROD you just used. This makes the"
echo "     Vercel build deploy Convex functions automatically."
echo "  2. Confirm https://tame-spaniel-616.convex.site/api/auth/callback/google"
echo "     is in your Google OAuth client's Authorized redirect URIs."
echo "  3. Push any commit to main — the next Vercel build will deploy"
echo "     prod Convex functions and inject NEXT_PUBLIC_CONVEX_URL pointing"
echo "     at tame-spaniel-616."
echo "  4. Seed the prod data:"
echo "       bunx convex run seed:runApril2026Additions --prod"
