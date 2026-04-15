# Deploy Notes (Vercel) — `rainmaker-new`

## Vercel project

- **Root directory**: `rainmaker-new/`
- **Build command**: `npm run build`
- **Output**: Next.js (App Router)

## Required env vars (Vercel)

- **`NEXT_PUBLIC_PRIVY_APP_ID`**: Privy App ID (Solana auth in UI).
- **`NEXT_PUBLIC_APP_URL`** (recommended): Set to your production URL (e.g. `https://rainmaker.fun`) for metadata base.
- **`STARPAY_API_KEY`**: Starpay secret API key (server-side). Required for Rainmaker Neo card issuance via `/api/starpay/cards`.
- **`STARPAY_DEPOSIT_ADDRESS`**: Solana address for Starpay deposits. Users' USDC is sent here before card issuance. Get this from your Starpay dashboard.
- **`NEO_PASSCODE`** (temporary): If set, the `/neo` tab + `/api/starpay/*` routes are locked behind a passcode. Remove it to disable the lock.

## Backend proxy (no CORS)

This UI relies on Vercel rewrites in `rainmaker-new/vercel.json` to proxy to your existing DigitalOcean backend:

- `/api/auth/*` → DO `/api/auth/*`
- `/api/me` → DO `/api/me`
- `/api/withdraw` → DO `/api/withdraw`
- `/c9/*` → DO `/c9/*`

If your DO backend URL changes, update the `destination` host in `rainmaker-new/vercel.json`.

## Domain cutover

- Point `rainmaker.fun` to this Vercel project.
- Keep the DO backend running (the UI proxies all `/api/*` and `/c9/*` calls to it).


