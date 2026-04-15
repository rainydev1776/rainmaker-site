"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
  useRef,
} from "react";

// Context to control activation video from C9 page
export const ActivationVideoContext = createContext<{
  showVideo: boolean;
  setShowVideo: (show: boolean) => void;
}>({
  showVideo: false,
  setShowVideo: () => {},
});

export const UserProfileContext = createContext<{
  displayName: string;
  profileImage: string | null;
}>({
  displayName: "",
  profileImage: null,
});
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { BackendAuthProvider } from "@/components/providers";
import {
  backendFetch,
  clearBackendJwt,
  createSolanaAuthProofBestEffort,
  backendLoginWithPhantomSig,
  getBackendJwt,
  setBackendJwt,
} from "@/lib/backend";
import { getSolanaRpcHttpUrl } from "@/lib/solanaRpc";

interface AppLayoutProps {
  children: React.ReactNode;
}

function withTimeout<T>(p: Promise<T>, ms: number, errCode: string): Promise<T> {
  const timeoutMs = Math.max(0, Math.floor(Number(ms)));
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return p;
  let t: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(errCode)), timeoutMs);
  });
  return (Promise.race([p, timeout]) as Promise<T>).finally(() => {
    if (t) clearTimeout(t);
  });
}

async function fetchSolBalance(address: string): Promise<number> {
  // No SDK dependency: Solana JSON-RPC balance
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: [address],
  };
  const urls = [
    getSolanaRpcHttpUrl(),
  ];

  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`rpc_failed:${r.status}`);
      const j = (await r.json()) as any;
      const lamports = Number(j?.result?.value ?? 0);
      return Number.isFinite(lamports) ? lamports / 1_000_000_000 : 0;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("rpc_failed");
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { login, authenticated, user, logout, ready } = usePrivy();
  const { wallets } = useWallets();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendAuthed, setBackendAuthed] = useState(false);
  const [bootstrappingBackendAuth, setBootstrappingBackendAuth] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [turnkeyAddress, setTurnkeyAddress] = useState<string | null>(null);
  const [showActivationVideo, setShowActivationVideo] = useState(false);
  const [showTradingWalletCta, setShowTradingWalletCta] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const autoBootstrapAttemptRef = useRef(0);
  const MAX_BOOTSTRAP_RETRIES = 4;

  const walletsArr = useMemo(() => (Array.isArray(wallets) ? wallets : []), [wallets]);

  // Prefer the active wallet from Privy wallet list (matches what can sign),
  // then fall back to user.wallet / linked accounts.
  const walletAddress =
    (walletsArr?.[0] as any)?.address ||
    (user?.wallet as any)?.address ||
    (
      user?.linkedAccounts?.find((account) => account.type === "wallet") as
        | { address?: string }
        | undefined
    )?.address;

  const profileImage =
    (user?.twitter as { profilePictureUrl?: string } | undefined)
      ?.profilePictureUrl ||
    (user?.discord as { profilePictureUrl?: string } | undefined)
      ?.profilePictureUrl ||
    (user?.google as { profilePictureUrl?: string } | undefined)
      ?.profilePictureUrl;

  const walletsForAuth = useMemo(() => {
    const addr = String(walletAddress || "").trim();
    if (!addr) return walletsArr;
    const filtered = walletsArr.filter((w: any) => String(w?.address || "").trim() === addr);
    return filtered.length ? filtered : walletsArr;
  }, [walletsArr, walletAddress]);

  const bootstrapBackendAuth = useCallback(async () => {
    if (!ready || !authenticated || !walletAddress) return;
    setBootstrappingBackendAuth(true);
    try {
      const msg = `Rainmaker Login ${Date.now()}`;
      // Some wallet/extension combos can hang indefinitely if a signature prompt
      // doesn't surface. Never let the app get stuck in "Enabling…" forever.
      const proof = await withTimeout(
        createSolanaAuthProofBestEffort({
          wallets: walletsForAuth,
          address: String(walletAddress),
          message: msg,
        }),
        30_000,
        "wallet_signature_timeout"
      );
      const { token, user: beUser } =
        proof.kind === "message"
          ? await withTimeout(
              backendLoginWithPhantomSig({
                pubkey: String(walletAddress),
                msg,
                sig: proof.sig,
              }),
              60_000,
              "backend_login_timeout"
            )
          : await withTimeout(
              backendLoginWithPhantomSig({
                pubkey: String(walletAddress),
                msg,
                signedTxBase64: proof.signedTxBase64,
              }),
              60_000,
              "backend_login_timeout"
            );

      setBackendJwt(token);

      const tk = String((beUser as any)?.turnkey_address || "");
      if (tk) {
        setTurnkeyAddress(tk);
      } else {
        // Fallback to /api/me (source of truth)
        const r = await withTimeout(backendFetch("/api/me"), 20_000, "backend_me_timeout");
        if (r.ok) {
          const me = (await r.json().catch(() => null)) as
            | { phantom_pubkey?: string; address?: string; walletId?: string; display_name?: string | null }
            | null;
          const tkAddr = String(me?.address || "");
          setTurnkeyAddress(tkAddr || null);
          const dn = String(me?.display_name || "").trim();
          setDisplayName(dn);
        }
      }

      setBackendAuthed(true);
    } catch (e) {
      setBackendAuthed(false);
      setTurnkeyAddress(null);
      try {
        console.warn("[backend-auth] bootstrap failed", (e as any)?.message || String(e));
      } catch {}
    } finally {
      setBootstrappingBackendAuth(false);
    }
  }, [ready, authenticated, walletAddress, walletsForAuth]);

  // Auto-bootstrap backend auth when possible so users don't have to click
  // "Enable trading wallet" on every login. On mobile (embedded wallets),
  // the wallet signer may not be ready immediately, so retry a few times
  // with exponential backoff before showing the manual CTA.
  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !walletAddress) {
      autoBootstrapAttemptRef.current = 0;
      setShowTradingWalletCta(false);
      return;
    }
    if (backendAuthed) {
      setShowTradingWalletCta(false);
      return;
    }
    if (bootstrappingBackendAuth) {
      setShowTradingWalletCta(false);
      return;
    }

    // If we already have a backend JWT, let the existing validator effect run.
    const existingJwt = getBackendJwt();
    if (existingJwt) {
      setShowTradingWalletCta(false);
      return;
    }

    const attempt = autoBootstrapAttemptRef.current;
    if (attempt < MAX_BOOTSTRAP_RETRIES) {
      autoBootstrapAttemptRef.current = attempt + 1;
      setShowTradingWalletCta(false);
      // Delay retries: 0s, 2s, 4s, 8s — gives embedded wallet time to init.
      const delay = attempt === 0 ? 0 : 1000 * Math.pow(2, attempt);
      const t = setTimeout(() => {
        bootstrapBackendAuth().catch(() => {});
      }, delay);
      return () => clearTimeout(t);
    }

    // All retries exhausted — show manual CTA.
    setShowTradingWalletCta(true);
  }, [ready, authenticated, walletAddress, backendAuthed, bootstrappingBackendAuth, bootstrapBackendAuth]);

  useEffect(() => {
    // Clear state on disconnect
    if (!ready) return;
    const addr = turnkeyAddress || walletAddress;
    if (!authenticated || !addr) {
      setSolBalance(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Prefer showing balance for the execution wallet (Turnkey) once available.
        const bal = await fetchSolBalance(String(addr));
        if (!cancelled) setSolBalance(bal);
      } catch {
        if (!cancelled) setSolBalance(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, walletAddress, turnkeyAddress]);

  useEffect(() => {
    // Keep backend JWT in sync with Privy auth state.
    if (!ready) return;

    if (!authenticated) {
      clearBackendJwt();
      setBackendAuthed(false);
      setTurnkeyAddress(null);
      return;
    }

    if (!walletAddress) {
      // Logged into Privy, but no Solana wallet linked yet.
      setBackendAuthed(false);
      setTurnkeyAddress(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // If we already have a JWT, validate it quickly.
        const existing = getBackendJwt();
        if (!existing) {
          if (!cancelled) setBackendAuthed(false);
          if (!cancelled) setTurnkeyAddress(null);
          return;
        }
        if (existing) {
          const r = await backendFetch("/api/me");
          if (r.ok) {
            // Ensure the backend JWT matches the currently connected wallet.
            // Also ensure Turnkey wallet provisioning completed (required for dFlow execution).
            const me = (await r.json().catch(() => null)) as
              | { phantom_pubkey?: string; address?: string; walletId?: string; display_name?: string | null }
              | null;
            const pk = String(me?.phantom_pubkey || "");
            const tkAddr = String(me?.address || "");
            const dn = String(me?.display_name || "").trim();
            setDisplayName(dn);
            // Privy can surface multiple wallets (external + embedded), and the "primary" address
            // can change ordering. Treat the backend JWT as valid if its phantom_pubkey matches ANY
            // currently-linked wallet address for this Privy session.
            const linked = new Set<string>();
            try {
              const wa = String(walletAddress || "").trim();
              if (wa) linked.add(wa);
            } catch {}
            try {
              const uw = String((user as any)?.wallet?.address || "").trim();
              if (uw) linked.add(uw);
            } catch {}
            try {
              for (const w of walletsArr || []) {
                const a = String((w as any)?.address || "").trim();
                if (a) linked.add(a);
              }
            } catch {}
            try {
              const la = Array.isArray((user as any)?.linkedAccounts) ? (user as any).linkedAccounts : [];
              for (const a of la) {
                if (String(a?.type || "") !== "wallet") continue;
                const addr = String(a?.address || "").trim();
                if (addr) linked.add(addr);
              }
            } catch {}

            if (pk && linked.has(pk) && tkAddr) {
              if (!cancelled) setTurnkeyAddress(tkAddr);
              if (!cancelled) setBackendAuthed(true);
              return;
            }
            clearBackendJwt();
          }
          if (!cancelled) setTurnkeyAddress(null);
        }
      } catch (e) {
        if (!cancelled) setBackendAuthed(false);
        if (!cancelled) setTurnkeyAddress(null);
        try {
          console.warn("[backend-auth] failed", (e as any)?.message || String(e));
        } catch {}
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, walletAddress, walletsArr, user]);

  const handleConnectWallet = () => {
    if (authenticated) {
      clearBackendJwt();
      logout();
    } else {
      login();
    }
  };

  return (
    <BackendAuthProvider backendAuthed={backendAuthed}>
      <UserProfileContext.Provider value={{ displayName, profileImage: profileImage || null }}>
        <ActivationVideoContext.Provider
          value={{ showVideo: showActivationVideo, setShowVideo: setShowActivationVideo }}
        >
          <SidebarProvider defaultOpen>
            <div className="relative flex h-dvh w-full overflow-hidden bg-transparent">
              {showActivationVideo && (
                <div className="fixed inset-0 z-10 pointer-events-none mix-blend-lighten">
                  <video
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover grayscale"
                    onEnded={() => setShowActivationVideo(false)}
                  >
                    <source src="/activate-bg.mp4" type="video/mp4" />
                  </video>
                </div>
              )}

              <AppSidebar
                mobileOpen={mobileMenuOpen}
                onMobileOpenChange={setMobileMenuOpen}
                displayName={displayName}
              />
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <AppHeader
                  onConnectWallet={handleConnectWallet}
                  onDisconnect={logout}
                  isConnected={ready && authenticated}
                  walletAddress={turnkeyAddress || walletAddress}
                  profileImage={profileImage}
                  solBalance={solBalance}
                  needsTradingWallet={showTradingWalletCta}
                  isEnablingTradingWallet={bootstrappingBackendAuth}
                  onEnableTradingWallet={bootstrapBackendAuth}
                  onMenuClick={() => setMobileMenuOpen(true)}
                  displayName={displayName}
                  onDisplayNameChange={setDisplayName}
                />
                <main className="mx-2 mb-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-auto lg:mx-4 lg:mb-4">
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
        </ActivationVideoContext.Provider>
      </UserProfileContext.Provider>
    </BackendAuthProvider>
  );
};
