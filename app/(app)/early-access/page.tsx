"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ConnectPrompt } from "@/components/features";
import { backendFetchJson, getBackendJwt } from "@/lib/backend";

interface PlatformConnection {
  isConnected: boolean;
  keyId?: string;
  maskedKey?: string;
  walletAddr?: string;
}

type AgentKeysResponse = {
  ok: boolean;
  keys: {
    kalshi_key_id: string | null;
    kalshi_keys_configured: boolean;
    kalshi_wallet_addr?: string | null;
    kalshi_wallet_addr_full?: string | null;
    kalshi_wallet_configured?: boolean;
    pm_wallet_addr: string | null;
    pm_wallet_configured: boolean;
  };
};

type C9AccessResponse = {
  ok: boolean;
  access: boolean;
};

const EarlyAccessPage = () => {
  const [kalshiConnection, setKalshiConnection] = useState<PlatformConnection>({
    isConnected: false,
  });
  const { ready, authenticated } = usePrivy();
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [accessLoading, setAccessLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");

  const canShowC9Ui = useMemo(() => {
    return ready && authenticated && hasAccess === true;
  }, [ready, authenticated, hasAccess]);

  const loadAccess = useCallback(async () => {
    // AppLayout performs the backend JWT handshake. Don't call /c9/* until we have it.
    if (!getBackendJwt()) return;
    setErrMsg(null);
    setAccessLoading(true);
    try {
      const j = await backendFetchJson<C9AccessResponse>("/c9/access");
      setHasAccess(!!j?.access);
    } catch (e) {
      setErrMsg((e as any)?.message || String(e));
      setHasAccess(null);
    } finally {
      setAccessLoading(false);
    }
  }, []);

  const loadKeys = useCallback(async () => {
    setErrMsg(null);
    setLoading(true);
    try {
      const j = await backendFetchJson<AgentKeysResponse>("/c9/sports/agent/keys");
      const kid = j?.keys?.kalshi_key_id || "";
      const kalshiWalletFull = j?.keys?.kalshi_wallet_addr_full || null;
      const isConnected = !!j?.keys?.kalshi_wallet_configured || !!j?.keys?.kalshi_keys_configured;
      setKalshiConnection({
        isConnected,
        keyId: kid || undefined,
        maskedKey: kid
          ? `${kid.slice(0, 8)}…${kid.slice(-4)}`
          : (kalshiWalletFull ? `${kalshiWalletFull.slice(0, 6)}…${kalshiWalletFull.slice(-4)}` : undefined),
        walletAddr: kalshiWalletFull || undefined,
      });
    } catch (e) {
      setErrMsg((e as any)?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    // Wait until backend auth handshake stores the JWT.
    if (!getBackendJwt()) {
      const t = window.setTimeout(() => {
        loadAccess();
      }, 250);
      return () => window.clearTimeout(t);
    }
    loadAccess();
  }, [ready, authenticated, loadAccess]);

  useEffect(() => {
    if (!canShowC9Ui) return;
    loadKeys();
  }, [canShowC9Ui, loadKeys]);

  const handleConnectKalshi = useCallback(
    async (keyId: string, privateKey: string) => {
      setErrMsg(null);
      setLoading(true);
      try {
        await backendFetchJson<{ ok: boolean }>("/c9/sports/agent/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kalshi_key_id: keyId,
            kalshi_private_key: privateKey,
          }),
        });
        await loadKeys();
      } catch (e) {
        setErrMsg((e as any)?.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [loadKeys]
  );

  const handleGrantAccess = useCallback(async () => {
    const code = passcode.trim();
    if (!code) return;
    setErrMsg(null);
    setLoading(true);
    try {
      await backendFetchJson<{ ok: boolean }>("/c9/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-c9-passcode": code,
        },
        body: JSON.stringify({ code }),
      });
      setPasscode("");
      await loadAccess();
    } catch (e) {
      setErrMsg((e as any)?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [passcode, loadAccess]);

  return (
    <div
      className="flex w-full min-w-0 flex-1 rounded-[12px] p-3 sm:rounded-[16px] sm:p-4"
      style={{
        background:
          "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
      }}
    >
      {!ready || !authenticated ? (
        <div className="flex w-full items-center justify-center">
          <div className="max-w-sm text-center">
            <h1 className="text-lg font-semibold text-white">Connect your wallet</h1>
            <p className="mt-2 text-sm text-[#757575]">
              Use the top-right button to connect a Solana wallet to access C9.
            </p>
          </div>
        </div>
      ) : accessLoading ? (
        <div className="flex w-full items-center justify-center">
          <p className="text-sm text-[#757575]">Checking access…</p>
        </div>
      ) : hasAccess === false ? (
        <div className="flex w-full items-center justify-center">
          <div
            className="w-full max-w-sm rounded-2xl p-4"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
            }}
          >
            <h1 className="text-lg font-semibold text-white">Get early access</h1>
            <p className="mt-2 text-sm text-[#757575]">
              Enter your access code to unlock C9.
            </p>

            {errMsg && (
              <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                {errMsg}
              </div>
            )}

            <input
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Access code"
              className="mt-4 h-11 w-full rounded-xl px-4 text-sm text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-emerald-500/40"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
              }}
            />

            <button
              onClick={handleGrantAccess}
              disabled={!passcode.trim() || loading}
              className="mt-4 h-11 w-full rounded-[124px] text-sm font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "#0EE957",
                boxShadow: "0 8px 30px rgba(14, 233, 87, 0.20)",
              }}
            >
              Unlock
            </button>

            <p className="mt-3 text-center text-xs text-[#757575]">
              Already unlocked?{" "}
              <button
                onClick={loadAccess}
                className="text-white underline decoration-white/20 underline-offset-4 hover:decoration-white/60"
              >
                Refresh
              </button>
            </p>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-xs text-white/70 underline decoration-white/15 underline-offset-4 hover:text-white"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full">
          {errMsg && (
            <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {errMsg}
            </div>
          )}
          <ConnectPrompt
            kalshiConnection={kalshiConnection}
            onConnectKalshi={handleConnectKalshi}
          />
          {loading && (
            <p className="mt-3 text-center text-xs text-[#757575]">Saving…</p>
          )}

          <div className="mt-6 flex items-center justify-center">
            <Link
              href="/c9"
              className="text-sm text-white/80 underline decoration-white/15 underline-offset-4 hover:text-white hover:decoration-white/35"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarlyAccessPage;


