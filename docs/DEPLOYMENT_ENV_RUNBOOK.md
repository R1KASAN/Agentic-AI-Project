# Deployment Environment Runbook

## Vercel baseline

The deployed app depends on these environment variables being present in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Additional server-only variables currently used by deployed routes:

- `N8N_WEBHOOK_SECRET`
- `N8N_APPROVAL_WEBHOOK_URL`

Optional, only if the route is intentionally active on Vercel:

- `ADMIN_WEBHOOK_SECRET`

## Critical redeploy rule

Any change to a `NEXT_PUBLIC_*` variable requires a new deployment.

Reason:

- `NEXT_PUBLIC_*` values are bundled into the client build
- changing them in Vercel does not update the already-built browser bundle
- the fix is: update env, then redeploy

## Current defaults

- `preview` branch `005-closure-tracking`
  - `NEXT_PUBLIC_APP_URL=https://climate-agent-r1kasan-r1kasans-projects.vercel.app`
- `development`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `production`
  - `NEXT_PUBLIC_APP_URL=https://climate-agent.vercel.app`

Update the production value as soon as a real production domain is assigned.

## Recovery steps for stuck login

If preview gets stuck on `Signing in...` or the browser console shows a Supabase config error:

1. Check that `NEXT_PUBLIC_SUPABASE_URL` exists in Vercel for the target environment.
2. Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` exists in Vercel for the target environment.
3. Redeploy the project after any `NEXT_PUBLIC_*` correction.
4. Re-test `/login` in a clean browser session.

## Notes

- Browser-extension console noise like `runtime.lastError` or `completion_list.html?...` is not the app root cause unless it reproduces in a clean browser context.
- `N8N_APPROVAL_WEBHOOK_URL` is currently preview/development-scoped because the current source-of-truth points to an ngrok URL.
- `/api/admin/alerts` is currently deployed but intentionally dormant on Vercel. Until the team provides a real `ADMIN_WEBHOOK_SECRET`, a misconfigured response from that route is expected and should not be treated as a deployment regression.
- Supabase Auth redirect settings are managed outside the repo. The current allowlist should include:
  - `http://localhost:3000/auth/callback`
  - `https://climate-agent-r1kasan-r1kasans-projects.vercel.app/auth/callback`
