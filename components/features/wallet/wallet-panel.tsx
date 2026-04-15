"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ArrowUpDown, ArrowDownToLine, ArrowUpFromLine, X, Loader2, CheckCircle, Sparkles, Send, CreditCard, Lock, ChevronDown } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { useBackendAuth } from "@/components/providers";
import {
  backendFetch,
  backendFetchJson,
  backendLoginWithPhantomSig,
  clearBackendJwt,
  createSolanaAuthProofBestEffort,
  getBackendJwt,
  setBackendJwt,
} from "@/lib/backend";
import { getSolanaRpcHttpUrl } from "@/lib/solanaRpc";
import { ChainType, WidgetEvent, type WidgetConfig, useWidgetEvents } from "@lifi/widget";

const LiFiWidget = dynamic(
  () => import("@lifi/widget").then((mod) => mod.LiFiWidget),
  { ssr: false, loading: () => <div className="h-[320px] w-full animate-pulse rounded-xl bg-white/5" /> }
);

type MoonPayDepositResponse = {
  ok: boolean;
  iframeUrl?: string;
  widgetUrl?: string;
  token?: string;
  walletAddress: string;
  amountUsd: number;
};

type MoonPayBalanceResponse = {
  ok: boolean;
  balance_usdc: number;
  balance_sol: number;
  balance_rain?: number;
  wallet_address: string | null;
};

type PolymarketBalanceResponse = {
  ok: boolean;
  balance_cents: number;
  balance_usd: number;
  balance_usdc_native_cents?: number;
  balance_usdc_native_usd?: number;
  wallet_addr?: string | null;
};

type MeResponse = { phantom_pubkey?: string; address?: string; walletId?: string };
type WithdrawResponse = { txSig: string };

type ActiveTab = "swap" | "deposit" | "withdraw" | "neo";
type DepositTarget = "kalshi" | "polymarket";
type WithdrawCurrency = "sol" | "usdc_solana" | "usdc_e" | "usdc_native" | "rain" | "jupusd";

type WalletCommand =
  | { type: "swap"; from?: string; to?: string; amount?: number }
  | { type: "deposit"; amount?: number; token?: string; target?: DepositTarget }
  | { type: "withdraw"; amount?: number; token?: string }
  | { type: "neo" }
  | { type: "unknown"; query: string };

const SOLANA_CHAIN_ID = 1151111081099710;

const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOLANA_JUPUSD_MINT = "JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD";
const RAIN_MINT = "3iC63FgnB7EhcPaiSaC51UkVweeBDkqu17SaRyy2pump";
const RAIN_DECIMALS = 6;

async function solanaRpcCall<T>(method: string, params: any[]): Promise<T> {
  const body = { jsonrpc: "2.0", id: 1, method, params };
  let lastErr: unknown = null;
  const urls = [getSolanaRpcHttpUrl()];

  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`rpc_failed:${r.status}`);
      const j = (await r.json().catch(() => null)) as any;
      if (j?.error) throw new Error(`rpc_error:${String(j?.error?.message || "").trim() || "unknown"}`);
      return j?.result as T;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("rpc_failed");
}

function sumParsedTokenUiAmount(tokenAccounts: any): number {
  try {
    const list = Array.isArray(tokenAccounts) ? tokenAccounts : [];
    let sum = 0;
    for (const acc of list) {
      const ta = acc?.account?.data?.parsed?.info?.tokenAmount;
      const ui = ta?.uiAmount;
      if (typeof ui === "number" && Number.isFinite(ui)) sum += ui;
    }
    return Number.isFinite(sum) ? sum : 0;
  } catch {
    return 0;
  }
}

async function fetchSvmBalances(owner: string): Promise<{ sol: number; usdc: number; jupusd: number; rain: number }> {
  const addr = String(owner || "").trim();
  if (!addr) return { sol: 0, usdc: 0, jupusd: 0, rain: 0 };

  const [solRes, usdcRes, jupUsdRes, rainRes] = await Promise.all([
    solanaRpcCall<{ value: number }>("getBalance", [addr]),
    solanaRpcCall<{ value: any[] }>("getTokenAccountsByOwner", [
      addr,
      { mint: SOLANA_USDC_MINT },
      { encoding: "jsonParsed" },
    ]),
    solanaRpcCall<{ value: any[] }>("getTokenAccountsByOwner", [
      addr,
      { mint: SOLANA_JUPUSD_MINT },
      { encoding: "jsonParsed" },
    ]),
    solanaRpcCall<{ value: any[] }>("getTokenAccountsByOwner", [
      addr,
      { mint: RAIN_MINT },
      { encoding: "jsonParsed" },
    ]),
  ]);

  const lamports = Number((solRes as any)?.value ?? 0);
  const sol = Number.isFinite(lamports) ? lamports / 1_000_000_000 : 0;
  const usdc = sumParsedTokenUiAmount((usdcRes as any)?.value);
  const jupusd = sumParsedTokenUiAmount((jupUsdRes as any)?.value);
  const rain = sumParsedTokenUiAmount((rainRes as any)?.value);
  return { sol, usdc, jupusd, rain };
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
const POLYGON_CHAIN_ID = 137;

const POLYMARKET_FUNDING_ENABLED = false;

const LiFiEvents = ({ onCompleted }: { onCompleted: (route: any) => void }) => {
  const widgetEvents = useWidgetEvents();

  useEffect(() => {
    const handler = (route: any) => {
      try {
        onCompleted(route);
      } catch {}
    };

    widgetEvents.on(WidgetEvent.RouteExecutionCompleted, handler);
    return () => widgetEvents.all.clear();
  }, [widgetEvents, onCompleted]);

  return null;
};

function parseCommand(input: string): WalletCommand {
  const q = input.toLowerCase().trim();

  if (q.includes("swap") || q.includes("bridge")) {
    const match = q.match(/(?:swap|bridge)\s*(\d+\.?\d*)?\s*(\w+)?\s*(?:to|for|->|→)?\s*(\w+)?/i);
    return { type: "swap", amount: match?.[1] ? parseFloat(match[1]) : undefined, from: match?.[2]?.toUpperCase(), to: match?.[3]?.toUpperCase() };
  }
  if (q.includes("deposit") || q.includes("fund") || q.includes("add funds") || q.includes("top up")) {
    const match = q.match(/(?:deposit|fund|add|top\s*up)\s*\$?(\d+\.?\d*)?\s*(\w+)?/i);
    let target: DepositTarget | undefined;
    if (q.includes("kalshi")) target = "kalshi";
    if (q.includes("poly") || q.includes("pm")) target = "polymarket";
    return { type: "deposit", amount: match?.[1] ? parseFloat(match[1]) : undefined, token: match?.[2]?.toUpperCase(), target };
  }
  if (q.includes("withdraw") || q.includes("cash out")) {
    const match = q.match(/(?:withdraw|cash\s*out)\s*\$?(\d+\.?\d*)?\s*(\w+)?/i);
    return { type: "withdraw", amount: match?.[1] ? parseFloat(match[1]) : undefined, token: match?.[2]?.toUpperCase() };
  }
  if (q.includes("neo") || q.includes("card")) {
    return { type: "neo" };
  }
  return { type: "unknown", query: input };
}

const tabs: { id: ActiveTab; label: string; icon: typeof ArrowUpDown }[] = [
  { id: "deposit", label: "Deposit", icon: ArrowDownToLine },
  { id: "neo", label: "Neo", icon: CreditCard },
  { id: "swap", label: "Swap", icon: ArrowUpDown },
  { id: "withdraw", label: "Withdraw", icon: ArrowUpFromLine },
];

export const WalletPanel = () => {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { backendAuthed } = useBackendAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab | null>(null);
  const [depositTarget, setDepositTarget] = useState<DepositTarget>("kalshi");
  const [withdrawCurrency, setWithdrawCurrency] = useState<WithdrawCurrency>("usdc_e");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [balanceExpanded, setBalanceExpanded] = useState(false);
  const [panelInputFocused, setPanelInputFocused] = useState(false);

  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [balanceUsdc, setBalanceUsdc] = useState<number | null>(null);
  const [balanceJupUsd, setBalanceJupUsd] = useState<number | null>(null);
  const [balanceRain, setBalanceRain] = useState<number | null>(null);
  const [balanceUsdcPolygon, setBalanceUsdcPolygon] = useState<number | null>(null);
  const [balanceUsdcPolygonNative, setBalanceUsdcPolygonNative] = useState<number | null>(null);
  const [solPrice, setSolPrice] = useState<number>(150);

  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [polygonDepositAddress, setPolygonDepositAddress] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [rainBuyAmount, setRainBuyAmount] = useState("");
  const [rainSide, setRainSide] = useState<"buy" | "sell">("buy");
  const [rainInputToken, setRainInputToken] = useState<"sol" | "usdc" | "jupusd">("usdc");
  const [rainSwapping, setRainSwapping] = useState(false);
  const [rainSwapResult, setRainSwapResult] = useState<{ txSig: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositWidgetUrl, setDepositWidgetUrl] = useState<string | null>(null);
  const [depositWidgetHeight, setDepositWidgetHeight] = useState(480);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [lastWithdrawSig, setLastWithdrawSig] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const walletsArr = useMemo(() => (Array.isArray(wallets) ? wallets : []), [wallets]);
  const walletAddress = user?.wallet?.address || walletsArr?.[0]?.address ||
    (user?.linkedAccounts?.find((a) => a.type === "wallet") as { address?: string } | undefined)?.address;

  // Fetch live SOL price from CoinGecko (refreshes every 60s)
  useEffect(() => {
    let active = true;
    const fetchPrice = async () => {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
        if (!res.ok) return;
        const data = await res.json();
        if (active && data?.solana?.usd) setSolPrice(data.solana.usd);
      } catch { /* keep last known price */ }
    };
    fetchPrice();
    const iv = setInterval(fetchPrice, 60_000);
    return () => { active = false; clearInterval(iv); };
  }, []);

  // Total balance in USD
  const totalBalance = useMemo(() => {
    const usdc = balanceUsdc ?? 0;
    const jupusd = balanceJupUsd ?? 0;
    const usdcPoly = balanceUsdcPolygon ?? 0;
    const usdcNative = balanceUsdcPolygonNative ?? 0;
    const sol = balanceSol ?? 0;
    return usdc + jupusd + usdcPoly + usdcNative + (sol * solPrice);
  }, [balanceUsdc, balanceJupUsd, balanceUsdcPolygon, balanceUsdcPolygonNative, balanceSol, solPrice]);

  const ensureBackendJwt = useCallback(async () => {
    const existing = getBackendJwt();
    if (existing) {
      try {
        const r = await backendFetch("/api/me");
        if (r.ok) {
          // If the backend session is tied to a different wallet than the one currently connected,
          // force a re-login so step-up signatures verify against the correct pubkey.
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
    if (!ready || !authenticated || !walletAddress) throw new Error("connect_wallet_first");
    const msg = `Rainmaker Login ${Date.now()}`;
    const proof = await withTimeout(
      createSolanaAuthProofBestEffort({ wallets: walletsArr, address: String(walletAddress), message: msg }),
      30_000,
      "signature_timeout"
    );
    const { token } = proof.kind === "message"
      ? await backendLoginWithPhantomSig({ pubkey: String(walletAddress), msg, sig: proof.sig })
      : await backendLoginWithPhantomSig({ pubkey: String(walletAddress), msg, signedTxBase64: proof.signedTxBase64 });
    setBackendJwt(token);
  }, [ready, authenticated, walletAddress, walletsArr]);

  const loadBalances = useCallback(async (svmAddress?: string | null) => {
    try {
      const owner = String(svmAddress || depositAddress || "").trim() || null;
      const [svmBal, pmBal] = await Promise.all([
        owner ? fetchSvmBalances(owner).catch(() => null) : Promise.resolve(null),
        backendFetchJson<PolymarketBalanceResponse>("/c9/polymarket/balance").catch(() => null),
      ]);
      if (svmBal) {
        setBalanceUsdc(svmBal.usdc ?? 0);
        setBalanceJupUsd(svmBal.jupusd ?? 0);
        setBalanceSol(svmBal.sol ?? 0);
        setBalanceRain(svmBal.rain ?? 0);
      }
      if (pmBal?.ok) {
        setBalanceUsdcPolygon(pmBal?.balance_usd ?? 0);
        setBalanceUsdcPolygonNative(pmBal?.balance_usdc_native_usd ?? 0);
        if (pmBal?.wallet_addr) setPolygonDepositAddress(pmBal.wallet_addr);
      }
    } catch {}
  }, [depositAddress]);

  const loadMe = useCallback(async () => {
    if (!ready || !authenticated || !getBackendJwt()) return;
    try {
      const me = await backendFetchJson<MeResponse>("/api/me");
      const tkAddr = String(me?.address || "").trim() || null;
      if (tkAddr) setDepositAddress(tkAddr);
      if (me?.phantom_pubkey && !withdrawTo) setWithdrawTo(me.phantom_pubkey);
      await loadBalances(tkAddr);
    } catch {}
  }, [ready, authenticated, loadBalances, withdrawTo]);

  useEffect(() => {
    loadMe();
  }, [loadMe, backendAuthed]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://moonpay.hel.io") return;
      const { type, height } = e.data || {};
      if (type === "onHeightChanged" && typeof height === "number") {
        setDepositWidgetHeight(Math.max(260, Math.min(700, height)));
      } else if (type === "onSuccess") {
        loadBalances();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [loadBalances]);

  const handleCommand = useCallback((cmd: WalletCommand) => {
    setErrMsg(null);
    setWithdrawSuccess(false);
    setLastWithdrawSig(null);
    setDepositWidgetUrl(null);

    if (cmd.type === "swap") setActiveTab("swap");
    else if (cmd.type === "deposit") {
      if (cmd.target) setDepositTarget(cmd.target);
      setActiveTab("deposit");
    } else if (cmd.type === "withdraw") {
      if (cmd.amount) setWithdrawAmount(cmd.amount.toString());
      if (cmd.token) {
        if (cmd.token === "SOL") setWithdrawCurrency("sol");
        else if (cmd.token === "USDC") setWithdrawCurrency("usdc_solana");
        else if (cmd.token === "RAIN") setWithdrawCurrency("rain");
        else if (cmd.token.includes("E")) setWithdrawCurrency("usdc_e");
      }
      setActiveTab("withdraw");
    } else if (cmd.type === "neo") {
      setActiveTab("neo");
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    const cmd = parseCommand(q);
    if (cmd.type !== "unknown") {
      handleCommand(cmd);
      setQuery("");
    }
  }, [query, handleCommand]);

  const openFunding = useCallback(async (target: DepositTarget) => {
    setErrMsg(null);
    if (target === "polymarket" && !POLYMARKET_FUNDING_ENABLED) {
      setErrMsg("Polymarket funding is coming soon");
      return;
    }
    setDepositLoading(true);
    try {
      await ensureBackendJwt();
      const res = await backendFetchJson<MoonPayDepositResponse>("/moonpay/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const url = res?.iframeUrl || res?.widgetUrl || (res?.token ? `https://moonpay.hel.io/embed/deposit/${res.token}` : null);
      if (url) {
        // Force MoonPay (Helio) straight into the card on-ramp flow.
        // This bypasses the "Transfer manually" + "Connect wallet" chooser screen.
        let cardOnlyUrl = url;
        try {
          const u = new URL(url);
          u.searchParams.set("initial-step", "moonpay-onramp");
          cardOnlyUrl = u.toString();
        } catch {}
        setDepositTarget(target);
        setDepositWidgetUrl(cardOnlyUrl);
      } else {
        throw new Error("Failed to create deposit session");
      }
    } catch (e: any) {
      setErrMsg(e?.message?.includes("connect_wallet_first") ? "Connect wallet first" : e?.message || String(e));
    } finally {
      setDepositLoading(false);
    }
  }, [ensureBackendJwt]);

  const isEvmCurrency = withdrawCurrency === "usdc_e" || withdrawCurrency === "usdc_native";
  const withdrawMax = useMemo(() => {
    switch (withdrawCurrency) {
      case "sol": return balanceSol ?? 0;
      case "usdc_solana": return balanceUsdc ?? 0;
      case "rain": return balanceRain ?? 0;
      case "jupusd": return balanceJupUsd ?? 0;
      case "usdc_e": return balanceUsdcPolygon ?? 0;
      case "usdc_native": return balanceUsdcPolygonNative ?? 0;
      default: return 0;
    }
  }, [withdrawCurrency, balanceSol, balanceUsdc, balanceRain, balanceJupUsd, balanceUsdcPolygon, balanceUsdcPolygonNative]);

  const handleWithdraw = useCallback(async () => {
    setErrMsg(null);
    setLoading(true);
    try {
      await ensureBackendJwt();
      const amt = Number(withdrawAmount);
      if (!withdrawTo || !Number.isFinite(amt) || amt <= 0) throw new Error("Invalid amount or address");

      // Step-up auth (anti-theft):
      // For any withdrawal to a non-self destination (or any EVM withdrawal), require a fresh wallet signature
      // binding (toAddress, rawAmount, token, chain) so a stolen backend JWT can't redirect funds.
      const needsStepUp = (() => {
        const to = String(withdrawTo || "").trim();
        if (!to) return true;
        if (
          withdrawCurrency === "sol" ||
          withdrawCurrency === "usdc_solana" ||
          withdrawCurrency === "rain" ||
          withdrawCurrency === "jupusd"
        ) {
          const wa = String(walletAddress || "").trim();
          // If we can't confidently detect "self", require step-up.
          if (!wa) return true;
          return to !== wa;
        }
        // EVM withdrawals are always step-up (dest isn't tied to the Solana wallet address).
        return true;
      })();

      let stepUp: any | null = null;
      if (needsStepUp) {
        if (!walletAddress) throw new Error("connect_wallet_first");
        const nonce =
          (globalThis as any)?.crypto?.randomUUID?.() ||
          Math.random().toString(36).slice(2) + Date.now().toString(36);
        const expMs = Date.now() + 2 * 60_000;
        const to = String(withdrawTo || "").trim();

        const op =
          withdrawCurrency === "sol"
            ? "svm_sol_transfer"
            : withdrawCurrency === "usdc_solana"
              ? "svm_usdc_transfer"
              : withdrawCurrency === "rain"
                ? "svm_rain_transfer"
                : withdrawCurrency === "jupusd"
                  ? "svm_jupusd_transfer"
              : "evm_usdc_withdraw";
        const chain =
          withdrawCurrency === "sol" || withdrawCurrency === "usdc_solana" || withdrawCurrency === "rain" || withdrawCurrency === "jupusd"
            ? "svm"
            : "evm";
        const token =
          withdrawCurrency === "sol"
            ? "SOL"
            : withdrawCurrency === "usdc_solana"
              ? "USDC"
              : withdrawCurrency === "rain"
                ? "RAIN"
                : withdrawCurrency === "jupusd"
                  ? "JupUSD"
              : String(withdrawCurrency);

        const raw =
          withdrawCurrency === "sol"
            ? String(Math.round(amt * 1_000_000_000)) // lamports
            : withdrawCurrency === "rain"
              ? String(Math.round(amt * (10 ** RAIN_DECIMALS)))
            : String(Math.round(amt * 1_000_000)); // USDC/JupUSD micros (both 6 decimals)

        const msg = [
          "RM_STEPUP",
          "v:1",
          `op:${op}`,
          `chain:${chain}`,
          `token:${token}`,
          `to:${to}`,
          `raw:${raw}`,
          `nonce:${nonce}`,
          `exp:${expMs}`,
        ].join("|");

        const proof = await withTimeout(
          createSolanaAuthProofBestEffort({
            wallets: walletsArr,
            address: String(walletAddress),
            message: msg,
          }),
          30_000,
          "signature_timeout"
        );

        stepUp =
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
      }

      let txSig: string | null = null;
      if (withdrawCurrency === "sol") {
        const j = await backendFetchJson<WithdrawResponse>("/api/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toAddress: withdrawTo, amountSol: amt, ...(stepUp ? { stepUp } : {}) }),
        });
        txSig = j?.txSig || null;
      } else if (withdrawCurrency === "usdc_solana" || withdrawCurrency === "rain" || withdrawCurrency === "jupusd") {
        const tokenMap: Record<string, string> = { usdc_solana: "usdc", rain: "rain", jupusd: "jupusd" };
        const tok = tokenMap[withdrawCurrency] || "usdc";
        const j = await backendFetchJson<WithdrawResponse>("/api/withdraw-usdc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toAddress: withdrawTo, amount: amt, token: tok, ...(stepUp ? { stepUp } : {}) }),
        });
        txSig = j?.txSig || null;
      } else {
        const out = await backendFetchJson<{ ok?: boolean; txHash?: string | null; error?: string }>(
          "/c9/sports/agent/pm-withdraw",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toAddress: withdrawTo, amountUsdc: amt, token: withdrawCurrency, ...(stepUp ? { stepUp } : {}) }),
          }
        );
        if (!out?.ok) throw new Error(out?.error || "Withdraw failed");
        txSig = out?.txHash || null;
      }

      setLastWithdrawSig(txSig);
      setWithdrawSuccess(true);
      setWithdrawAmount("");
      await loadBalances();
    } catch (e: any) {
      const msg = e?.message || String(e);
      setErrMsg(
        msg === "signature_timeout"
          ? "Timed out waiting for wallet signature. Open/unlock Phantom and try again."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }, [withdrawAmount, withdrawTo, withdrawCurrency, ensureBackendJwt, loadBalances, walletAddress, walletsArr, backendFetchJson]);

  const handleSwapRain = useCallback(async (overrideAmount?: string) => {
    setErrMsg(null);
    setRainSwapResult(null);
    const amtStr = (overrideAmount ?? rainBuyAmount).trim();
    const amtNum = Number(amtStr);
    if (!amtStr || !Number.isFinite(amtNum) || amtNum <= 0) {
      setErrMsg("Enter a valid amount");
      return;
    }
    setRainSwapping(true);
    try {
      await ensureBackendJwt();
      const isSell = rainSide === "sell";
      const inTok = isSell ? "rain" : rainInputToken;
      const outTok = isSell ? rainInputToken : "rain";
      const res = await backendFetchJson<{ ok: boolean; txSig: string; error?: string }>(
        "/api/swap-rain",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amtStr, inputToken: inTok, outputToken: outTok }),
        }
      );
      if (!res?.ok) throw new Error(res?.error || "Swap failed");
      setRainSwapResult({ txSig: res.txSig });
      setRainBuyAmount("");
      await loadBalances();
    } catch (e: any) {
      setErrMsg(e?.message || String(e));
    } finally {
      setRainSwapping(false);
    }
  }, [rainBuyAmount, rainSide, rainInputToken, ensureBackendJwt, loadBalances]);

  const solFundingAddress = useMemo(() => {
    return depositAddress;
  }, [depositAddress]);

  const swapTargets = useMemo(() => {
    const list: Array<{ name: string; address: string; chainType: ChainType }> = [];
    const solTo = solFundingAddress;
    if (solTo) list.push({ name: "Kalshi (Solana)", address: solTo, chainType: ChainType.SVM });
    if (polygonDepositAddress) list.push({ name: "Polymarket (Polygon)", address: polygonDepositAddress, chainType: ChainType.EVM });
    return list;
  }, [solFundingAddress, polygonDepositAddress]);

  const onLiFiCompleted = useCallback(async (_route: any) => {
    await loadBalances();
  }, [loadBalances]);

  const swapConfig = useMemo<WidgetConfig>(() => ({
    integrator: "Rainmaker",
    apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY,
    variant: "compact",
    subvariant: "split",
    subvariantOptions: { split: "swap" },
    buildUrl: false,
    // Allow a broad set of chains/tokens (cross-chain swaps). We still constrain the destination via `toAddresses`.
    chains: { allow: [SOLANA_CHAIN_ID, POLYGON_CHAIN_ID, 1, 10, 42161, 8453, 56, 43114] },
    toAddresses: swapTargets.length ? swapTargets : undefined,
    toAddress: swapTargets.length ? swapTargets[0] : undefined,
    appearance: "dark",
    hiddenUI: ["poweredBy", "walletMenu"],
    theme: {
      palette: {
        primary: { main: "#0EA5E9" },
        secondary: { main: "#0EA5E9" },
        background: { paper: "#0a0a0a", default: "#000000" },
        text: { primary: "#ffffff", secondary: "#757575" },
        grey: { 300: "#3f3f3f", 700: "#262626", 800: "#1a1a1a" },
      },
      shape: { borderRadius: 12, borderRadiusSecondary: 8 },
      container: {
        background: "transparent",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        boxShadow: "none",
        maxHeight: "400px",
      },
    },
  }), [swapTargets]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 px-3 sm:px-4">
      {/* Command Input */}
      <div
        className={`relative flex items-center rounded-xl transition-all ${focused ? "ring-1 ring-[#0EA5E9]/30" : ""}`}
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
        }}
      >
        <Sparkles className="absolute left-3 h-4 w-4 text-[#0EA5E9]/60" />
        <label htmlFor="wallet-cmd" className="sr-only">Command</label>
        <input
          id="wallet-cmd"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={!ready || !authenticated}
          placeholder="swap, deposit, withdraw, neo..."
          className="h-11 w-full bg-transparent pl-10 pr-10 text-sm text-white placeholder:text-[#606060] focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={!query.trim()}
          aria-label="Submit"
          className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-lg text-[#757575] transition-colors hover:text-white disabled:opacity-30"
          style={{ background: query.trim() ? "rgba(14, 165, 233, 0.15)" : "transparent" }}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(isActive ? null : t.id);
                setDepositWidgetUrl(null);
                setWithdrawSuccess(false);
                setErrMsg(null);
              }}
              disabled={!ready || !authenticated}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all disabled:opacity-50 ${
                isActive ? "text-[#0EA5E9]" : "text-[#757575] hover:text-white"
              }`}
              style={{
                background: isActive ? "rgba(14, 165, 233, 0.12)" : "transparent",
              }}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Total Balance */}
      <button
        onClick={() => setBalanceExpanded(!balanceExpanded)}
        className="w-full rounded-xl p-4 text-left transition-all hover:brightness-105"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Total Balance</p>
            <p className="text-2xl font-semibold text-white mt-0.5">
              ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${balanceExpanded ? "rotate-180" : ""}`} />
        </div>

        <AnimatePresence>
          {balanceExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">USDC (Sol)</span>
                  <span className="text-zinc-300">${balanceUsdc?.toFixed(2) ?? "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">JupUSD (Sol)</span>
                  <span className="text-zinc-300">${balanceJupUsd?.toFixed(2) ?? "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">USDC.e (Poly)</span>
                  <span className="text-zinc-300">${balanceUsdcPolygon?.toFixed(2) ?? "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">USDC (Poly)</span>
                  <span className="text-zinc-400">${balanceUsdcPolygonNative?.toFixed(2) ?? "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">SOL</span>
                  <span className="text-zinc-400">{balanceSol?.toFixed(4) ?? "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">RAIN</span>
                  <span className="text-zinc-400">
                    {(balanceRain ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Error */}
      <AnimatePresence>
        {errMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          >
            {errMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panels */}
      <AnimatePresence mode="wait">
        {activeTab && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl overflow-hidden transition-all duration-300"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: panelInputFocused || withdrawAmount ? "1px solid rgba(14, 165, 233, 0.5)" : "1px solid rgba(255, 255, 255, 0.06)",
              boxShadow: panelInputFocused || withdrawAmount
                ? "0 0 20px rgba(14, 165, 233, 0.15), 0 0 40px rgba(14, 165, 233, 0.1), inset 0 0 20px rgba(14, 165, 233, 0.03)"
                : "none",
            }}
          >
            {/* SWAP */}
            {activeTab === "swap" && (
              <div className="p-3">
                {!ready || !authenticated ? (
                  <p className="text-center text-xs text-zinc-500 py-6">Connect wallet to swap</p>
                ) : (
                  <>
                    <LiFiWidget integrator="Rainmaker" config={swapConfig} />
                    <LiFiEvents onCompleted={onLiFiCompleted} />
                  </>
                )}
                <p className="mt-2 text-center text-[10px] text-zinc-600">Powered by LI.FI</p>
              </div>
            )}

            {/* DEPOSIT */}
            {activeTab === "deposit" && (
              <div className="p-4 space-y-3">
                {!depositWidgetUrl ? (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openFunding("kalshi")}
                        disabled={depositLoading}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-xs font-medium text-[#0EA5E9] transition-all hover:brightness-125 disabled:opacity-50"
                        style={{ background: "rgba(14, 165, 233, 0.12)" }}
                      >
                        {depositLoading && depositTarget === "kalshi" && <Loader2 className="h-3 w-3 animate-spin" />}
                        Fund Kalshi
                      </button>
                      <button
                        onClick={() => openFunding("polymarket")}
                        disabled={depositLoading || !POLYMARKET_FUNDING_ENABLED}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          POLYMARKET_FUNDING_ENABLED ? "text-[#0EA5E9] hover:brightness-125" : "text-zinc-500"
                        }`}
                        style={{ background: POLYMARKET_FUNDING_ENABLED ? "rgba(14, 165, 233, 0.12)" : "rgba(255, 255, 255, 0.03)" }}
                      >
                        {depositLoading && depositTarget === "polymarket" && <Loader2 className="h-3 w-3 animate-spin" />}
                        Fund Polymarket
                      </button>
                    </div>

                    {/* Wallet Addresses - only visible in deposit */}
                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Or send directly to</p>
                      <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-white/[0.02]">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-[#0EA5E9]">Solana (Kalshi)</p>
                          <p className="truncate text-[11px] text-zinc-400 font-mono">{solFundingAddress || "—"}</p>
                        </div>
                        <div className="ml-2 flex items-center gap-2">
                          {solFundingAddress && (
                            <button
                              onClick={() => handleCopy(String(solFundingAddress), "sol")}
                              className="text-zinc-500 hover:text-white"
                            >
                              {copied === "sol" ? (
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-white/[0.02]">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-[#0EA5E9]">Polygon (Polymarket)</p>
                          <p className="truncate text-[11px] text-zinc-400 font-mono">{polygonDepositAddress || "—"}</p>
                        </div>
                        {polygonDepositAddress && (
                          <button onClick={() => handleCopy(polygonDepositAddress, "poly")} className="ml-2 text-zinc-500 hover:text-white">
                            {copied === "poly" ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>

                    </div>

                    <p className="text-center text-[10px] text-zinc-600">Card deposits powered by MoonPay</p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">MoonPay • {depositTarget}</span>
                      <button onClick={() => setDepositWidgetUrl(null)} className="text-[10px] text-zinc-500 hover:text-white">
                        Back
                      </button>
                    </div>
                    <iframe
                      title="MoonPay"
                      allow="clipboard-write"
                      src={depositWidgetUrl}
                      className="w-full rounded-lg"
                      style={{ height: depositWidgetHeight }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* WITHDRAW */}
            {activeTab === "withdraw" && (
              <div className="p-4 space-y-3">
                {withdrawSuccess ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-white">Withdrawal submitted</p>
                    {lastWithdrawSig && <p className="mt-1 text-[10px] text-zinc-500 font-mono truncate">{lastWithdrawSig}</p>}
                  </div>
                ) : (
                  <>
                    <select
                      value={withdrawCurrency}
                      onChange={(e) => setWithdrawCurrency(e.target.value as WithdrawCurrency)}
                      onFocus={() => setPanelInputFocused(true)}
                      onBlur={() => setPanelInputFocused(false)}
                      className="h-10 w-full rounded-xl bg-white/[0.03] px-3 text-xs text-white outline-none"
                      style={{ boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset" }}
                    >
                      <option value="rain">RAIN (Solana)</option>
                      <option value="jupusd">JupUSD (Solana)</option>
                      <option value="usdc_e">USDC.e (Polygon)</option>
                      <option value="usdc_native">USDC (Polygon)</option>
                      <option value="usdc_solana">USDC (Solana)</option>
                      <option value="sol">SOL</option>
                    </select>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        onFocus={() => setPanelInputFocused(true)}
                        onBlur={() => setPanelInputFocused(false)}
                        placeholder="Amount"
                        className="flex-1 h-10 rounded-xl bg-white/[0.03] px-3 text-xs text-white outline-none"
                        style={{ boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset" }}
                      />
                      <button
                        onClick={() => setWithdrawAmount(withdrawMax.toString())}
                        className="px-3 rounded-xl text-[11px] text-[#0EA5E9]"
                        style={{ background: "rgba(14, 165, 233, 0.12)" }}
                      >
                        Max
                      </button>
                    </div>

                    <input
                      type="text"
                      value={withdrawTo}
                      onChange={(e) => setWithdrawTo(e.target.value)}
                      onFocus={() => setPanelInputFocused(true)}
                      onBlur={() => setPanelInputFocused(false)}
                      placeholder={isEvmCurrency ? "0x... (EVM)" : "Solana address"}
                      className="h-10 w-full rounded-xl bg-white/[0.03] px-3 text-xs text-white outline-none font-mono"
                      style={{ boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset" }}
                    />

                    <button
                      onClick={handleWithdraw}
                      disabled={loading || !withdrawAmount || !withdrawTo}
                      className="w-full h-11 rounded-full text-sm font-medium text-[#0EA5E9] transition-all hover:brightness-125 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: "rgba(14, 165, 233, 0.12)" }}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
                      {loading ? "Processing..." : "Withdraw"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* NEO */}
            {activeTab === "neo" && (
              <div className="p-4 flex flex-col items-center">
                <div className="relative">
                  <Image
                    src="/rainmaker-neo-card.png"
                    alt="Neo Card"
                    width={320}
                    height={218}
                    className="drop-shadow-xl opacity-70"
                    priority
                    unoptimized
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full px-4 py-2 bg-black/70 backdrop-blur border border-white/10">
                      <Lock className="h-4 w-4 text-[#0EA5E9]" />
                      <span className="text-sm font-medium text-white">Coming Soon</span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-zinc-500">Instant delivery • Pay with SOL</p>
                <button
                  disabled
                  className="mt-3 flex h-10 items-center justify-center gap-2 rounded-full px-6 text-xs font-medium text-zinc-500 cursor-not-allowed"
                  style={{ background: "rgba(255, 255, 255, 0.03)" }}
                >
                  <CreditCard className="h-4 w-4" />
                  Issue Neo Card
                  <Lock className="h-3 w-3" />
                </button>

                {/* Buy $RAIN */}
                <div className="mt-6 pt-4 border-t border-white/[0.06] w-full space-y-2">
                  {rainSwapResult ? (
                    <div className="text-center py-3">
                      <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-xs text-white">Swap complete!</p>
                      <p className="text-[10px] text-zinc-600 font-mono truncate mt-1">{rainSwapResult.txSig}</p>
                      <button
                        onClick={() => setRainSwapResult(null)}
                        className="mt-2 text-[10px] text-[#0EA5E9] hover:underline"
                      >
                        Swap again
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                        <button
                          onClick={() => setRainSide("buy")}
                          className={`flex-1 rounded-md py-1.5 text-[10px] font-medium transition-all ${
                            rainSide === "buy" ? "text-[#0EA5E9]" : "text-[#757575] hover:text-white"
                          }`}
                          style={{ background: rainSide === "buy" ? "rgba(14, 165, 233, 0.12)" : "transparent" }}
                        >
                          Buy
                        </button>
                        <button
                          onClick={() => setRainSide("sell")}
                          className={`flex-1 rounded-md py-1.5 text-[10px] font-medium transition-all ${
                            rainSide === "sell" ? "text-[#0EA5E9]" : "text-[#757575] hover:text-white"
                          }`}
                          style={{ background: rainSide === "sell" ? "rgba(14, 165, 233, 0.12)" : "transparent" }}
                        >
                          Sell
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{rainSide === "buy" ? "Buy $RAIN" : "Sell $RAIN"}</span>
                        <span>
                          Bal:&nbsp;
                          {(() => {
                            const other =
                              rainInputToken === "sol"
                                ? `${balanceSol?.toFixed(4) ?? "—"} SOL`
                                : rainInputToken === "jupusd"
                                  ? `${balanceJupUsd?.toFixed(2) ?? "—"} JupUSD`
                                  : `${balanceUsdc?.toFixed(2) ?? "—"} USDC`;
                            const rain = `${(balanceRain ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} RAIN`;
                            return rainSide === "buy" ? `${other} • ${rain}` : `${rain} • ${other}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {[12.5, 25, 50].map((pct) => {
                          const bal = rainSide === "sell"
                            ? (balanceRain ?? 0)
                            : rainInputToken === "sol"
                              ? (balanceSol ?? 0)
                              : rainInputToken === "jupusd"
                                ? (balanceJupUsd ?? 0)
                                : (balanceUsdc ?? 0);
                          return (
                            <button
                              key={pct}
                              disabled={rainSwapping || bal <= 0}
                              onClick={() => {
                                const val = bal * pct / 100;
                                if (val <= 0) return;
                                const decimals = rainSide === "sell" ? 2 : rainInputToken === "sol" ? 6 : 2;
                                const amt = val.toFixed(decimals);
                                setRainBuyAmount(amt);
                                handleSwapRain(amt);
                              }}
                              className="flex-1 rounded-md py-1.5 text-[10px] font-medium text-[#0EA5E9] transition-all hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.15)" }}
                            >
                              {pct}%
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={rainInputToken}
                          onChange={(e) => setRainInputToken(e.target.value as "sol" | "usdc" | "jupusd")}
                          className="h-10 w-20 rounded-lg bg-white/[0.03] px-2 text-xs text-white outline-none"
                          style={{ boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset" }}
                        >
                          <option value="sol">SOL</option>
                          <option value="usdc">USDC</option>
                          <option value="jupusd">JupUSD</option>
                        </select>
                        <input
                          type="number"
                          value={rainBuyAmount}
                          onChange={(e) => setRainBuyAmount(e.target.value)}
                          placeholder={rainSide === "sell" ? "RAIN amount" : "Amount"}
                          className="flex-1 h-10 rounded-lg bg-white/[0.03] px-3 text-xs text-white placeholder:text-zinc-600 outline-none"
                          style={{ boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset" }}
                        />
                        <button
                          onClick={() => handleSwapRain()}
                          disabled={rainSwapping || !rainBuyAmount}
                          className="flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-medium text-[#0EA5E9] transition-all hover:brightness-125 disabled:opacity-50"
                          style={{ background: "rgba(14, 165, 233, 0.12)" }}
                        >
                          {rainSwapping ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          {rainSwapping ? "Swapping..." : (rainSide === "sell" ? "Sell" : "Buy")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
