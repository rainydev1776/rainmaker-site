"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, RefreshCw, ChevronDown, CreditCard } from "lucide-react";
import Image from "next/image";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  backendFetch,
  backendLoginWithPhantomSig,
  clearBackendJwt,
  createSolanaAuthProofBestEffort,
  getBackendJwt,
  setBackendJwt,
} from "@/lib/backend";
import { NeoCommandInput, type NeoCommand } from "./neo-command-input";
import { SwapPanel, DepositPanel, WithdrawPanel, FundCardPanel, StatusPanel } from "./neo-command-panels";

type StarpayCreateCard = {
  orderId: string;
  status: "pending" | "processing" | "completed" | "failed" | "expired" | string;
  payment?: { address?: string; amountSol?: number; solPrice?: number };
  pricing?: {
    cardValue?: number;
    starpayFeePercent?: number;
    starpayFee?: number;
    resellerMarkup?: number;
    total?: number;
  };
  feeTier?: string;
  expiresAt?: string;
  checkStatusUrl?: string;
};

type StarpayCardStatus = {
  orderId: string;
  status: "pending" | "processing" | "completed" | "failed" | "expired" | string;
  payment?: { address?: string; amountSol?: number; solPrice?: number };
  pricing?: {
    cardValue?: number;
    starpayFeePercent?: number;
    starpayFee?: number;
    resellerMarkup?: number;
    total?: number;
  };
  feeTier?: string;
  expiresAt?: string;
  checkStatusUrl?: string;
};

type StarpayOkResponse<T> = { ok: true; order: T };
type StarpayErrResponse = { ok: false; message: string; error?: any };
type StarpayCreateCardApiResponse =
  | StarpayOkResponse<StarpayCreateCard>
  | StarpayErrResponse;
type StarpayStatusApiResponse = StarpayOkResponse<StarpayCardStatus> | StarpayErrResponse;

type StarpayAccount = {
  walletAddress?: string;
  projectName?: string;
  balance: number;
  markup?: number;
  totalCardsIssued?: number;
  totalVolume?: number;
  status?: string;
};

type StarpayMeApiResponse =
  | { ok: true; account: StarpayAccount }
  | StarpayErrResponse;

type NeoIssueCardResponse =
  | {
      ok: true;
      needsStepUp: true;
      order: StarpayCreateCard;
      orderId: string;
      stepUpMessage: string;
      message?: string;
    }
  | {
      ok: true;
      needsStepUp: false;
      order: StarpayCreateCard;
      orderId: string;
      withdrawTxSig: string;
    }
  | { ok: false; message: string; orderId?: string };


type NeoAccessStatus = {
  ok: true;
  enabled: boolean;
  unlocked: boolean;
};

function fmtUsd(n: number): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(v);
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

export const NeoPanel = () => {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const walletsArr = useMemo(() => (Array.isArray(wallets) ? wallets : []), [wallets]);

  const walletAddress =
    user?.wallet?.address ||
    walletsArr?.[0]?.address ||
    (
      user?.linkedAccounts?.find((account) => account.type === "wallet") as
        | { address?: string }
        | undefined
    )?.address;

  const defaultEmail = useMemo(() => {
    const e1 = (user as any)?.email?.address;
    const e2 = (user as any)?.email;
    const e3 = (user as any)?.google?.email;
    const e4 = (user as any)?.discord?.email;
    const e5 = (user as any)?.twitter?.email;
    const e = String(e1 || e2 || e3 || e4 || e5 || "").trim();
    return e || "";
  }, [user]);

  const [amount, setAmount] = useState("");
  const [cardType, setCardType] = useState<"visa" | "mastercard">("visa");
  const [email, setEmail] = useState("");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [created, setCreated] = useState<StarpayCreateCard | null>(null);
  const [status, setStatus] = useState<StarpayCardStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [account, setAccount] = useState<StarpayAccount | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [neoEnabled, setNeoEnabled] = useState<boolean | null>(null);
  const [neoUnlocked, setNeoUnlocked] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [activeCommand, setActiveCommand] = useState<NeoCommand | null>(null);

  useEffect(() => {
    if (!email && defaultEmail) setEmail(defaultEmail);
  }, [defaultEmail, email]);

  const ensureBackendJwt = useCallback(async () => {
    const existing = getBackendJwt();
    if (existing) {
      try {
        const r = await backendFetch("/api/me");
        if (r.ok) {
          const j = await r.json().catch(() => null);
          const serverPk = String(j?.phantom_pubkey || "").trim();
          const localPk = String(walletAddress || "").trim();
          if (serverPk && localPk && serverPk !== localPk) {
            clearBackendJwt();
          } else {
            return;
          }
        }
      } catch {}
      clearBackendJwt();
    }

    if (!ready || !authenticated || !walletAddress) {
      throw new Error("connect_wallet_first");
    }

    const msg = `Rainmaker Login ${Date.now()}`;
    const proof = await withTimeout(
      createSolanaAuthProofBestEffort({
        wallets: walletsArr,
        address: String(walletAddress),
        message: msg,
      }),
      30_000,
      "signature_timeout"
    );

    const { token } =
      proof.kind === "message"
        ? await backendLoginWithPhantomSig({
            pubkey: String(walletAddress),
            msg,
            sig: proof.sig,
          })
        : await backendLoginWithPhantomSig({
            pubkey: String(walletAddress),
            msg,
            signedTxBase64: proof.signedTxBase64,
          });
    setBackendJwt(token);
  }, [ready, authenticated, walletAddress, walletsArr]);

  const apiFetchJson = useCallback(async <T,>(path: string, init: RequestInit): Promise<T> => {
    const res = await backendFetch(path, init);
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = String(j?.message || "").trim() || `Request failed (${res.status}).`;
      throw new Error(msg);
    }
    return j as T;
  }, []);

  const loadNeoAccess = useCallback(async () => {
    try {
      const r = await fetch("/api/neo/access", { method: "GET", cache: "no-store" });
      const j = (await r.json().catch(() => null)) as NeoAccessStatus | null;
      if (!j?.ok) return;
      setNeoEnabled(j.enabled);
      setNeoUnlocked(j.unlocked);
    } catch {}
  }, []);

  useEffect(() => {
    loadNeoAccess();
  }, [loadNeoAccess]);

  const loadStarpayAccountIfAuthed = useCallback(async () => {
    if (!ready || !authenticated) return;
    if (!getBackendJwt()) return;
    try {
      const out = await apiFetchJson<StarpayMeApiResponse>("/api/starpay/me", {
        method: "GET",
      });
      if (!out.ok) return;
      setAccount(out.account);
    } catch {}
  }, [ready, authenticated, apiFetchJson]);

  const unlockNeo = useCallback(async () => {
    setErrMsg(null);
    setUnlocking(true);
    try {
      const r = await fetch("/api/neo/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: String(passcode || "").trim() }),
      });
      const j = (await r.json().catch(() => null)) as NeoAccessStatus | { ok: false; message?: string } | null;
      if (!r.ok || !j?.ok) {
        throw new Error(String((j as any)?.message || "Wrong passcode."));
      }
      setNeoEnabled(j.enabled);
      setNeoUnlocked(true);
      setPasscode("");
      loadStarpayAccountIfAuthed().catch(() => {});
    } catch (e) {
      setErrMsg((e as any)?.message || String(e));
    } finally {
      setUnlocking(false);
    }
  }, [passcode, loadStarpayAccountIfAuthed]);

  useEffect(() => {
    if (neoEnabled === false || neoUnlocked === true) {
      loadStarpayAccountIfAuthed().catch(() => {});
    }
  }, [neoEnabled, neoUnlocked, loadStarpayAccountIfAuthed]);

  const refreshBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      await ensureBackendJwt();
      const out = await apiFetchJson<StarpayMeApiResponse>("/api/starpay/me", {
        method: "GET",
      });
      if (!out.ok) throw new Error(out.message || "Failed to fetch balance");
      setAccount(out.account);
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      if (msg.includes("Neo is locked") || msg.includes("Passcode required")) {
        setNeoEnabled(true);
        setNeoUnlocked(false);
      }
    } finally {
      setBalanceLoading(false);
    }
  }, [apiFetchJson, ensureBackendJwt]);

  const refreshStatus = useCallback(
    async (orderId: string) => {
      await ensureBackendJwt();
      const out = await apiFetchJson<StarpayStatusApiResponse>(
        `/api/starpay/cards?orderId=${encodeURIComponent(orderId)}`,
        { method: "GET" }
      );
      if (!out.ok) throw new Error(out.message || "Status fetch failed");
      setStatus(out.order);
    },
    [apiFetchJson, ensureBackendJwt]
  );

  const handleIssue = useCallback(async () => {
    setErrMsg(null);
    setIssuing(true);
    setCreated(null);
    setStatus(null);

    try {
      await ensureBackendJwt();

      const amt = Number(String(amount || "").replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount.");
      if (amt < 5 || amt > 10_000) throw new Error("Amount must be between $5 and $10,000.");

      const emailTrim = String(email || "").trim();
      if (!emailTrim) throw new Error("Enter an email for delivery.");

      // Step 1: create order + receive a step-up message to sign (anti-theft)
      const prep = await apiFetchJson<NeoIssueCardResponse>("/api/neo/issue-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, cardType, email: emailTrim }),
      });

      if (!prep.ok) throw new Error((prep as any)?.message || "Card issuance failed");

      if (!(prep as any)?.needsStepUp) {
        // Shouldn't happen, but handle gracefully.
        setCreated((prep as any).order);
        setStatus((prep as any).order);
        loadStarpayAccountIfAuthed().catch(() => {});
        return;
      }

      const orderId = String((prep as any).orderId || "").trim();
      const msg = String((prep as any).stepUpMessage || "").trim();
      if (!orderId || !msg) throw new Error("Missing payment authorization message.");

      // Show the created order immediately while waiting for signature/payment.
      setCreated((prep as any).order);
      setStatus((prep as any).order);

      if (!walletAddress) throw new Error("connect_wallet_first");
      const proof = await withTimeout(
        createSolanaAuthProofBestEffort({
          wallets: walletsArr,
          address: String(walletAddress),
          message: msg,
        }),
        30_000,
        "signature_timeout"
      );
      const stepUp =
        proof.kind === "message"
          ? {
              msg,
              sig:
                typeof proof.sig === "string"
                  ? proof.sig
                  : proof.sig instanceof Uint8Array
                    ? Array.from(proof.sig)
                    : Array.isArray(proof.sig)
                      ? proof.sig
                      : proof.sig,
            }
          : { msg, signedTxBase64: proof.signedTxBase64 };

      // Step 2: confirm + pay order with signed step-up proof
      const out = await apiFetchJson<NeoIssueCardResponse>("/api/neo/issue-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, stepUp }),
      });

      if (!out.ok) throw new Error((out as any)?.message || "Card payment failed");
      if ((out as any)?.needsStepUp) throw new Error("Signature required.");

      setCreated((out as any).order);
      setStatus((out as any).order);
      loadStarpayAccountIfAuthed().catch(() => {});
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      if (msg.includes("Neo is locked") || msg.includes("Passcode required")) {
        setNeoEnabled(true);
        setNeoUnlocked(false);
        setErrMsg("Neo is locked. Enter the passcode to continue.");
        return;
      }
      if (msg === "signature_timeout") {
        setErrMsg("Timed out waiting for wallet signature. Open/unlock Phantom and try again.");
        return;
      }
      if (msg === "connect_wallet_first" || msg.includes("connect_wallet_first")) {
        setErrMsg("Connect your wallet and approve the Rainmaker login signature, then try again.");
      } else {
        setErrMsg(msg);
      }
    } finally {
      setIssuing(false);
    }
  }, [amount, cardType, email, apiFetchJson, ensureBackendJwt, loadStarpayAccountIfAuthed, walletAddress, walletsArr]);

  const cardId = status?.orderId || created?.orderId || null;
  const currentStatus = status?.status || created?.status || null;

  const handleCommand = useCallback((cmd: NeoCommand) => {
    // For fund_card with amount, auto-fill the form
    if (cmd.type === "fund_card" && cmd.amount) {
      setAmount(cmd.amount.toString());
      setFormOpen(true);
      setActiveCommand(null);
      return;
    }
    setActiveCommand(cmd);
  }, []);

  const handleCloseCommand = useCallback(() => {
    setActiveCommand(null);
  }, []);

  const handleIssueFromPanel = useCallback(async (amt: number, cType: string, em: string) => {
    setAmount(amt.toString());
    setCardType(cType as "visa" | "mastercard");
    setEmail(em);
    await handleIssue();
  }, [handleIssue]);

  useEffect(() => {
    if (!cardId) return;
    if (!currentStatus) return;
    if (currentStatus === "completed" || currentStatus === "failed" || currentStatus === "expired") return;

    let cancelled = false;
    setPolling(true);

    const id = window.setInterval(() => {
      if (cancelled) return;
      refreshStatus(cardId).catch(() => {});
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      setPolling(false);
    };
  }, [cardId, currentStatus, refreshStatus]);

  const handleCopyCardId = useCallback(async () => {
    if (!cardId) return;
    await navigator.clipboard.writeText(cardId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [cardId]);

  // Loading state
  if (neoEnabled === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-[#757575]">Loading…</div>
      </div>
    );
  }

  // Passcode lock screen
  if (neoEnabled === true && neoUnlocked !== true) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="w-full max-w-[260px] space-y-3">
          {errMsg && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-200">
              {errMsg}
            </div>
          )}

          <Input
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            type="password"
            className="h-11 bg-white/[0.03] text-center"
            onKeyDown={(e) => {
              if (e.key === "Enter") unlockNeo().catch(() => {});
            }}
          />

          <button
            type="button"
            onClick={() => unlockNeo().catch(() => {})}
            disabled={unlocking || !String(passcode || "").trim()}
            className="flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium text-cyan-400 transition-all hover:brightness-125 disabled:opacity-50"
            style={{
              background: "rgba(14, 165, 233, 0.10)",
            }}
          >
            {unlocking ? "…" : "Unlock"}
          </button>
        </div>
      </div>
    );
  }

  // Main unlocked view
  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col items-center px-4 pt-4 pb-12">
      {/* Command Input */}
      <div className="w-full max-w-[400px] mb-6">
        <NeoCommandInput
          onCommand={handleCommand}
          disabled={!ready || !authenticated}
        />
      </div>

      {/* Active Command Panel */}
      {activeCommand && (
        <div className="w-full max-w-[400px] mb-6">
          {activeCommand.type === "swap" && (
            <SwapPanel
              onClose={handleCloseCommand}
              initialFrom={activeCommand.from}
              initialTo={activeCommand.to}
              initialAmount={activeCommand.amount}
            />
          )}
          {activeCommand.type === "deposit" && (
            <DepositPanel
              onClose={handleCloseCommand}
              initialAmount={activeCommand.amount}
              initialToken={activeCommand.token}
              depositAddress={process.env.NEXT_PUBLIC_STARPAY_DEPOSIT_ADDRESS}
            />
          )}
          {activeCommand.type === "withdraw" && (
            <WithdrawPanel
              onClose={handleCloseCommand}
              initialAmount={activeCommand.amount}
              initialToken={activeCommand.token}
              balance={account?.balance}
            />
          )}
          {activeCommand.type === "fund_card" && (
            <FundCardPanel
              onClose={handleCloseCommand}
              initialAmount={activeCommand.amount}
              defaultEmail={defaultEmail}
              onIssueCard={handleIssueFromPanel}
            />
          )}
          {activeCommand.type === "status" && (
            <StatusPanel
              onClose={handleCloseCommand}
              orderId={cardId || undefined}
              orderStatus={currentStatus || undefined}
              balance={account?.balance}
              onRefresh={refreshBalance}
            />
          )}
          {activeCommand.type === "unknown" && (
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <p className="text-sm text-[#757575]">
                Try: &quot;swap usdc to sol&quot;, &quot;deposit&quot;, &quot;withdraw&quot;, &quot;fund card $50&quot;, or &quot;status&quot;
              </p>
              <button
                onClick={handleCloseCommand}
                className="mt-3 text-xs text-[#0EA5E9] hover:brightness-125"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hero card */}
      <Image
        src="/rainmaker-neo-card.png"
        alt="Rainmaker Neo Card"
        width={440}
        height={299}
        className="drop-shadow-2xl"
        priority
        unoptimized
      />

      {/* Tagline */}
      <p className="mt-6 text-sm text-[#606060]">
        Instant delivery • Pay with SOL
      </p>

      {/* Issue Card CTA */}
      <button
        type="button"
        onClick={() => setFormOpen(!formOpen)}
        className="mt-8 flex h-12 w-full max-w-[320px] items-center justify-center gap-2 rounded-full text-[14px] font-medium text-cyan-400 transition-all hover:brightness-125"
        style={{
          background: "rgba(14, 165, 233, 0.12)",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
        }}
      >
        <CreditCard className="h-4 w-4" />
        Issue a Neo Card
        <ChevronDown
          className={`h-4 w-4 transition-transform ${formOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Collapsible form */}
      {formOpen && (
        <div
          className="mt-4 w-full max-w-[400px] rounded-xl p-5"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          {(!ready || !authenticated) && (
            <div className="mb-4 text-center text-sm text-[#606060]">
              Connect wallet to continue
            </div>
          )}

          {errMsg && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {errMsg}
            </div>
          )}


          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#9a9a9a]">Amount (USD)</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50"
                  inputMode="decimal"
                  className="mt-1 h-10 bg-white/[0.02]"
                />
              </div>
              <div>
                <Label className="text-xs text-[#9a9a9a]">Card Type</Label>
                <Select value={cardType} onValueChange={(v) => setCardType(v as any)}>
                  <SelectTrigger className="mt-1 h-10 w-full bg-white/[0.02]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-[#9a9a9a]">Delivery Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                className="mt-1 h-10 bg-white/[0.02]"
              />
            </div>

            <button
              type="button"
              onClick={handleIssue}
              disabled={issuing || !ready || !authenticated}
              className="flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium text-cyan-400 transition-all hover:brightness-125 disabled:opacity-50"
              style={{
                background: "rgba(14, 165, 233, 0.15)",
              }}
            >
              {issuing ? "Issuing…" : "Issue Card"}
            </button>
          </div>
        </div>
      )}

      {/* Status card (when issued) */}
      {cardId && (
        <div
          className="mt-4 w-full max-w-[400px] rounded-xl p-5"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#757575]">Order ID</div>
            <button
              onClick={() => refreshStatus(cardId).catch((e) => setErrMsg((e as any)?.message || String(e)))}
              disabled={polling}
              className="flex items-center gap-1 text-xs text-[#9a9a9a] hover:text-white"
            >
              <RefreshCw className={`h-3 w-3 ${polling ? "animate-spin" : ""}`} />
              {polling ? "Checking…" : "Refresh"}
            </button>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-[12px] text-white">{cardId}</span>
            <button
              onClick={handleCopyCardId}
              className="text-[#757575] hover:text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="mt-4 flex gap-4 text-sm">
            <div>
              <div className="text-[10px] uppercase text-[#606060]">Status</div>
              <div className={`font-medium ${currentStatus === "completed" ? "text-emerald-400" : (currentStatus === "failed" || currentStatus === "expired") ? "text-red-400" : "text-white"}`}>
                {currentStatus || "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[#606060]">Charged</div>
              <div className="font-medium text-white">
                {(() => {
                  const total =
                    (status as any)?.pricing?.total ??
                    (created as any)?.pricing?.total ??
                    null;
                  return typeof total === "number" && Number.isFinite(total) ? fmtUsd(total) : "—";
                })()}
              </div>
            </div>
          </div>

          {currentStatus === "completed" && (
            <p className="mt-3 text-xs text-emerald-400/80">
              ✓ Card delivered to your email
            </p>
          )}
        </div>
      )}
    </div>
  );
};
