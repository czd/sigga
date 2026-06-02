# Preview deployments (per-branch Convex backends)

**Goal:** every PR branch gets its **own isolated Convex backend**, auto-created
and deployed with that branch's code, so preview testing never touches Sigga's
production data — and the preview backend always matches the branch (its
reactions/comments/etc. functions exist).

## How it works (already wired in the repo)

The `build` script:

```jsonc
"build": "if [ -n \"$CONVEX_DEPLOY_KEY\" ]; then convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd 'next build' --preview-run seed:seedPreview; else next build; fi"
```

When `CONVEX_DEPLOY_KEY` is a **Preview Deploy Key**, `convex deploy`:
1. creates (or reuses) a preview deployment named after the Git branch
   (`--preview-create` defaults to the branch on Vercel),
2. pushes the branch's Convex code to it,
3. injects that backend's URL into `NEXT_PUBLIC_CONVEX_URL` for the Next build, and
4. runs **`seed:seedPreview`** on it (`--preview-run` is **ignored on production
   deploys**, so prod is unaffected).

`seedPreview` (in `convex/seed.ts`) bootstraps a fresh preview so it's instantly
testable — a known login code, two sample family members, a few journal entries
+ an appointment, and read-receipt state for the "seen by" avatars. It **only
seeds an empty backend** (refuses if any user exists), so production is a no-op
and preview re-deploys don't duplicate data.

## One-time dashboard setup

1. **Convex:** create a **Preview Deploy Key** (done ✓).
2. **Vercel → Project → Settings → Environment Variables:** set
   `CONVEX_DEPLOY_KEY` for the **Preview** environment to that preview key. Keep
   the **production** deploy key scoped to the **Production** environment only.
3. **Convex → Project Settings → Preview deployments → default environment
   variables:** set the Convex Auth vars that preview backends need at runtime:
   - `JWT_PRIVATE_KEY` and `JWKS` — required to mint session tokens. **Family-code
     login needs these too**, not just Google. Easiest: copy them from your dev
     deployment, or run `npx @convex-dev/auth` once and reuse the generated pair.
   - `SITE_URL` — used by Google OAuth redirects; not required for family-code
     login (credentials don't redirect). Set it to the preview URL if you care.
   - `ALLOWED_EMAILS` / `ADMIN_EMAILS` — only relevant for Google / admin views.

   Without `JWT_PRIVATE_KEY` + `JWKS`, login fails on previews even though the
   deploy succeeds (auth env is read at runtime, not deploy time).

## Using a preview

1. Push the PR branch → Vercel builds the preview → a per-branch Convex backend
   is created, deployed, and seeded automatically.
2. Open the preview URL → **log in with family code `demo-2468`**.
3. You'll land on a seeded feed (Helga & Anna entries + an appointment) and can
   exercise ❤️ reactions, comment threads, and the "seen by" avatars.

## Notes / trade-offs

- **Isolation:** each branch's backend is separate; production data is never
  touched, and throwaway test reactions/comments stay on the preview.
- **Google OAuth on previews** still needs each preview backend's
  `*.convex.site/api/auth/callback/google` registered in Google Cloud (no
  wildcards) — skip it; the family code is the preview login path.
- **`seedPreview` is preview-only by construction** (`--preview-run` + the
  empty-backend guard); it will not run on, or seed, production.
