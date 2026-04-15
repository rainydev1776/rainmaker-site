export const SOLANA_TRACKER_RPC_UPSTREAM_URL =
  "https://hyper-centaur.fleet.hellomoon.io/hmrX9U3JHEQ9NJ3UX43";

// Browser reads must go through a same-origin proxy because dedicated Fleet RPCs
// do not reliably answer CORS preflights. The proxy still forwards to the same
// dedicated Hello Moon node, so we keep the dedicated upstream while avoiding
// browser-side CORS failures.
export const SOLANA_TRACKER_RPC_PROXY_PATH = "/api/solana/rpc";

export function getSolanaRpcHttpUrl(): string {
  if (typeof window === "undefined") return SOLANA_TRACKER_RPC_UPSTREAM_URL;
  try {
    return new URL(SOLANA_TRACKER_RPC_PROXY_PATH, window.location.origin).toString();
  } catch {
    return SOLANA_TRACKER_RPC_PROXY_PATH;
  }
}

// Preserve the old export name for any server-side callers.
export const SOLANA_TRACKER_RPC_URL = SOLANA_TRACKER_RPC_UPSTREAM_URL;

// Most Solana RPC providers accept WS connections at the same host/path.
// Keep this explicit so wallet connectors + subscriptions don't depend on derived URLs.
export const SOLANA_TRACKER_WS_URL =
  "wss://hyper-centaur.fleet.hellomoon.io/hmrX9U3JHEQ9NJ3UX43";



