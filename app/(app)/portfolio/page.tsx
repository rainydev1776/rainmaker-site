"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  ConnectPrompt,
  PortfolioPnlCard,
  PortfolioPositionsTable,
  type PortfolioPosition,
} from "@/components/features";
import { SharePnlDialog } from "@/components/features/c9";
import { Spinner } from "@/components/ui/spinner";
import { UserProfileContext } from "@/components/layout/app-layout";
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

type C9AccessResponse = { ok: boolean; access: boolean };
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

interface PlatformConnection {
  isConnected: boolean;
  keyId?: string;
  maskedKey?: string;
  walletAddr?: string;
}

type SniperPositionsResponse = {
  ok: boolean;
  positions: Array<{
    ticker: string;
    sport: string | null;
    matchName: string;
    team: string | null;
    modelLabel?: string | null;
    entryPriceCents: number;
    currentPriceCents: number;
    quantity: number;
    costUsd: number;
    unrealizedPnlUsd: number;
    unrealizedPnlPct: number | null;
    status: string | null;
  }>;
};

type SniperStatsResponse = {
  ok: boolean;
  stats: {
    totalPnlUsd: number;
    pnlPct: number | null;
  };
};

type TradesResponse = {
  ok: boolean;
  trades: Array<{
    ticker: string | null;
    side: string | null;
    price: number | null;
    size_usd: number | null;
    pnl_usd?: number | null;
    status?: string | null;
    executed_at?: string | null;
    reason?: string | null;
    isSettlement?: boolean;
    hasSig?: boolean;
    // Server-side label enrichment (best-effort)
    matchName?: string | null;
    team?: string | null;
    sport?: string | null;
  }>;
  since?: string;
};

type KalshiBalanceResponse = { ok: boolean; balance_cents: number };
type MoonPayBalanceResponse = {
  ok: boolean;
  balance_usdc: number;
  balance_jupusd?: number;
  balance_sol: number;
  wallet_address: string | null;
};
type AgentConfigResponse = { ok: boolean; config?: { feature_flags?: any } };

function modelLabelFromTradeReason(reason: string): string | null {
  const r = String(reason || "").toLowerCase();
  if (!r) return null;
  if (r.includes("nba_favdip_burst_v2_imghedge_locked")) return "Burst 2.0 Hedge Locked";
  if (r.includes("nba_favdip_burst_v2_imghedge")) return "Burst 2.0 Hedge Pending";
  if (r.includes("nhl_favdip_burst_39_46")) return "NHL Burst";
  if (r.includes("mlb_burst_70_71")) return "MLB Burst";
  if (r.includes("nba_favdip_burst_v3")) return "burst 3.0";
  if (r.includes("nba_favdip_burst_v2")) return "burst 2.0";
  if (r.includes("nba_favdip_burst")) return "burst 1.0";
  if (r.includes("nba_foul")) return "foul";
  if (r.includes("nba_micro")) return "micro";
  if (r.includes("nhl_kage") || r.includes("nba_ultra") || r.includes("nhl_ultra")) return "kage";
  if (r.includes("nba_ud") || r.includes("nhl_ud")) return "turbo";
  return null;
}

interface PortfolioGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeShort: string;
  awayShort: string;
  homeAbbr: string;
  awayAbbr: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  period?: string | null;
  clock?: string | null;
  statusText?: string | null;
  status?: "pre" | "live" | "post";
  startTime?: string | null;
}

type ParsedKalshiTicker = {
  sport: string;
  awayAbbr: string;
  homeAbbr: string;
  isHome: boolean;
};

function normalizeSportCode(value: string | null | undefined): string {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";
  if (raw === "NBA" || raw.includes("BASKETBALL")) {
    return raw === "CBB" || raw.includes("COLLEGE") ? "CBB" : "NBA";
  }
  if (raw === "NFL" || raw.includes("FOOTBALL")) {
    return raw === "CFB" || raw.includes("COLLEGE") ? "CFB" : "NFL";
  }
  if (raw === "MLB" || raw.includes("BASEBALL")) return "MLB";
  if (raw === "NHL" || raw.includes("HOCKEY")) return "NHL";
  return raw;
}

function normalizeTeamAbbr(
  abbr: string | null | undefined,
  sport: string | null | undefined
): string {
  const raw = String(abbr || "").trim().toUpperCase();
  const s = normalizeSportCode(sport);
  if (!raw) return "";
  if (s === "NBA") {
    if (raw === "SA" || raw === "SAS") return "SAS";
    if (raw === "NO" || raw === "NOP") return "NOP";
    if (raw === "GS" || raw === "GSW") return "GSW";
    if (raw === "PHO" || raw === "PHX") return "PHX";
    if (raw === "WSH" || raw === "WAS") return "WAS";
    if (raw === "UTH" || raw === "UTA") return "UTA";
    if (raw === "NY" || raw === "NYK") return "NYK";
  }
  if (s === "MLB") {
    if (raw === "CHW" || raw === "CWS") return "CWS";
    if (raw === "WSH" || raw === "WAS" || raw === "WSN") return "WSH";
  }
  if (s === "NHL") {
    if (raw === "MON" || raw === "MTL") return "MTL";
    if (raw === "VGS" || raw === "VGK") return "VGK";
    if (raw === "SJ" || raw === "SJS") return "SJS";
    if (raw === "NJ" || raw === "NJD") return "NJD";
    if (raw === "TB" || raw === "TBL") return "TBL";
    if (raw === "LA" || raw === "LAK") return "LAK";
  }
  return raw;
}

function parseKalshiTicker(
  ticker: string | null | undefined
): ParsedKalshiTicker | null {
  try {
    const t = String(ticker || "").trim().toUpperCase();
    const m = t.match(
      /^KX(NBA|NFL|NHL|MLB)(?:GAME|UD)?-\d{2}[A-Z]{3}\d{2}([A-Z]+)-([A-Z]{2,4})$/
    );
    if (!m) return null;
    const sport = normalizeSportCode(m[1]);
    const combined = String(m[2] || "").trim().toUpperCase();
    const side = String(m[3] || "").trim().toUpperCase();
    if (!sport || !combined || !side) return null;

    let awayAbbr = "";
    let homeAbbr = "";
    if (combined.startsWith(side)) {
      awayAbbr = side;
      homeAbbr = combined.slice(side.length);
    } else if (combined.endsWith(side)) {
      homeAbbr = side;
      awayAbbr = combined.slice(0, combined.length - side.length);
    } else {
      return null;
    }

    const away = normalizeTeamAbbr(awayAbbr, sport);
    const home = normalizeTeamAbbr(homeAbbr, sport);
    const sideAbbr = normalizeTeamAbbr(side, sport);
    if (!away || !home || !sideAbbr) return null;

    return {
      sport,
      awayAbbr: away,
      homeAbbr: home,
      isHome: sideAbbr === home,
    };
  } catch {
    return null;
  }
}

function tickerMatchesPortfolioGame(
  position: PortfolioPosition,
  game: PortfolioGame | null
): ParsedKalshiTicker | null {
  if (!game) return null;
  const parsed = parseKalshiTicker(position.ticker);
  if (!parsed) return null;

  const gameSport = normalizeSportCode(game.sport);
  if (gameSport && parsed.sport !== gameSport) return null;

  const home = normalizeTeamAbbr(game.homeAbbr, parsed.sport);
  const away = normalizeTeamAbbr(game.awayAbbr, parsed.sport);
  if (parsed.homeAbbr !== home || parsed.awayAbbr !== away) return null;

  return parsed;
}

function tickerToSport(ticker: string): string | null {
  const t = String(ticker || "").toUpperCase();
  if (t.includes("KXNFL") || t.includes("NFL")) return "NFL";
  if (t.includes("KXNBA") || t.includes("NBA")) return "NBA";
  if (t.includes("KXMLB") || t.includes("MLB")) return "MLB";
  if (t.includes("KXNHL") || t.includes("NHL")) return "NHL";
  return null;
}

function sportToIcon(sport: string | null | undefined): string {
  const s = String(sport || "").toUpperCase();
  if (s === "NFL" || s.includes("FOOTBALL")) return "emoji:🏈";
  if (s === "NBA" || s.includes("BASKETBALL")) return "emoji:🏀";
  if (s === "MLB" || s.includes("BASEBALL")) return "emoji:⚾";
  if (s === "NHL" || s.includes("HOCKEY")) return "emoji:🏒";
  if (s.includes("TENNIS")) return "emoji:🎾";
  if (s.includes("GOLF")) return "emoji:⛳";
  if (s.includes("SOCCER")) return "emoji:⚽";
  return "emoji:🏟️";
}

function sportToCategory(sport: string | null | undefined): string {
  const s = String(sport || "").toUpperCase();
  if (s === "NFL") return "Pro Football";
  if (s === "NBA") return "Pro Basketball";
  if (s === "MLB") return "Pro Baseball";
  if (s === "NHL") return "Pro Hockey";
  return "Sports";
}

function normalizeGameText(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .replace(/@/g, " vs ")
    .replace(/\bat\b/g, " vs ")
    .replace(/\bversus\b/g, " vs ")
    .replace(/\bvs\.?\b/g, " vs ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function expandGameTokens(values: Array<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const value of values) {
    const raw = String(value || "").trim();
    const normalized = normalizeGameText(value);
    if (!normalized) continue;
    out.add(normalized);
    const parts = normalized.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      out.add(parts.slice(0, 2).join(" "));
      out.add(parts.slice(-2).join(" "));
    }
    if (/^[A-Za-z]{2,4}$/.test(raw)) out.add(normalized);
  }
  return [...out];
}

function gameSideTokens(game: PortfolioGame, side: "home" | "away"): string[] {
  const values =
    side === "home"
      ? [game.homeTeam, game.homeShort, game.homeAbbr]
      : [game.awayTeam, game.awayShort, game.awayAbbr];

  return expandGameTokens(values);
}

function positionMatchesPortfolioGame(position: PortfolioPosition, game: PortfolioGame): boolean {
  const positionSport = normalizeSportCode(position.sportCode);
  const gameSport = normalizeSportCode(game.sport);
  if (positionSport && gameSport && positionSport !== gameSport) return false;

  const parsedTicker = tickerMatchesPortfolioGame(position, game);
  if (parsedTicker) return true;
  if (parseKalshiTicker(position.ticker)) return false;

  const texts = [
    normalizeGameText(position.matchName),
    normalizeGameText(`${position.choice?.team || ""} @ ${position.matchName || ""}`),
    normalizeGameText(String(position.choice?.team || "")),
  ].filter(Boolean);
  const homeTokens = gameSideTokens(game, "home");
  const awayTokens = gameSideTokens(game, "away");

  return texts.some(
    (text) =>
      homeTokens.some((token) => text.includes(token)) &&
      awayTokens.some((token) => text.includes(token))
  );
}

function resolvePortfolioPositionSide(
  position: PortfolioPosition,
  game: PortfolioGame | null
): "home" | "away" | null {
  if (!game) return null;
  const parsedTicker = tickerMatchesPortfolioGame(position, game);
  if (parsedTicker) return parsedTicker.isHome ? "home" : "away";

  const choice = normalizeGameText(position.choice?.team);
  if (!choice) return null;

  const matchesSide = (tokens: string[]) =>
    tokens.some((token) => choice === token || choice.includes(token) || token.includes(choice));

  if (matchesSide(gameSideTokens(game, "home"))) return "home";
  if (matchesSide(gameSideTokens(game, "away"))) return "away";
  return null;
}

function parseStartMs(startTime: string | null | undefined): number | null {
  const ms = startTime ? new Date(startTime).getTime() : NaN;
  return Number.isFinite(ms) ? ms : null;
}

function pickBestPortfolioGame(position: PortfolioPosition, games: PortfolioGame[]): PortfolioGame | null {
  const candidates = games.filter((game) => positionMatchesPortfolioGame(position, game));
  if (!candidates.length) return null;

  const posMsRaw = Number(position.dateMs ?? NaN);
  const hasPosMs = Number.isFinite(posMsRaw) && posMsRaw > 0;
  const anchorMs = hasPosMs ? posMsRaw : Date.now();

  const withStart = candidates
    .map((g) => ({ g, startMs: parseStartMs(g.startTime) }))
    .filter((x) => x.startMs != null) as Array<{ g: PortfolioGame; startMs: number }>;

  if (!withStart.length) {
    return (
      candidates.find((g) => g.status === "post") ||
      candidates.find((g) => g.status === "live") ||
      candidates[0]
    );
  }

  // If this is a historical position, avoid matching to a future rematch.
  const pool = hasPosMs ? withStart.filter((x) => x.startMs <= anchorMs) : withStart;
  const finalPool = pool.length ? pool : withStart;

  finalPool.sort((a, b) => {
    const da = Math.abs(anchorMs - a.startMs);
    const db = Math.abs(anchorMs - b.startMs);
    if (da !== db) return da - db;
    const rank = (s: PortfolioGame["status"] | undefined) =>
      s === "post" ? 0 : s === "live" ? 1 : 2;
    return rank(a.g.status) - rank(b.g.status);
  });

  return finalPool[0]?.g || candidates[0] || null;
}

function daysForRange(range: "7d" | "30d" | "all"): number {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  return 3650;
}

const PortfolioPage = () => {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { backendAuthed } = useBackendAuth();
  const { displayName, profileImage } = useContext(UserProfileContext);

  const walletsArr = useMemo(() => (Array.isArray(wallets) ? wallets : []), [wallets]);
  const walletAddress =
    user?.wallet?.address ||
    walletsArr?.[0]?.address ||
    (
      user?.linkedAccounts?.find((a) => a.type === "wallet") as
        | { address?: string }
        | undefined
    )?.address;

  const ensureBackendJwt = useCallback(async () => {
    const existing = getBackendJwt();
    if (existing) {
      try {
        const r = await backendFetch("/api/me");
        if (r.ok) return;
      } catch {}
      clearBackendJwt();
    }

    if (!ready || !authenticated || !walletAddress) {
      throw new Error("connect_wallet_first");
    }

    const msg = `Rainmaker Login ${Date.now()}`;
    const proof = await createSolanaAuthProofBestEffort({
      wallets: walletsArr,
      address: String(walletAddress),
      message: msg,
    });
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

  const [loading, setLoading] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  const [kalshiConnection, setKalshiConnection] = useState<PlatformConnection>({
    isConnected: false,
  });
  const [polymarketConnection, setPolymarketConnection] =
    useState<PlatformConnection>({
      isConnected: false,
    });

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("7d");
  const [pnlAmount, setPnlAmount] = useState(0);
  const [pnlPercentage, setPnlPercentage] = useState(0);
  const [pnlResetTs, setPnlResetTs] = useState<string | null>(null);
  const [cashUsd, setCashUsd] = useState(0);
  const [openPositions, setOpenPositions] = useState<PortfolioPosition[]>([]);
  const [historyPositions, setHistoryPositions] = useState<PortfolioPosition[]>([]);
  const [portfolioGames, setPortfolioGames] = useState<PortfolioGame[]>([]);

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareDialog, setShareDialog] = useState({
    pnlAmount: 0,
    pnlPercentage: 0,
    invested: 0,
    position: 0,
    matchName: null as string | null,
    modelLabel: null as string | null,
    teamLogo: null as string | null,
    homeScore: null as number | null,
    awayScore: null as number | null,
    homeAbbr: null as string | null,
    awayAbbr: null as string | null,
    period: null as string | null,
    clock: null as string | null,
  });
  const [shareDialogHighlightEventId, setShareDialogHighlightEventId] = useState<string | null>(null);
  const [shareDialogHighlightSport, setShareDialogHighlightSport] = useState<string>("NBA");

  const openPositionsUsd = useMemo(() => {
    return openPositions.reduce((s, p) => s + Number(p.totalPayout || 0), 0);
  }, [openPositions]);

  const totalValueUsd = useMemo(() => {
    return Number(cashUsd || 0) + Number(openPositionsUsd || 0);
  }, [cashUsd, openPositionsUsd]);

  const loadAccess = useCallback(async () => {
    try {
      const j = await backendFetchJson<C9AccessResponse>("/c9/access");
      const ok = !!j?.access;
      setHasAccess(ok);
      return ok;
    } catch {
      setHasAccess(null);
      return null;
    }
  }, []);

  const loadKeys = useCallback(async () => {
    if (!ready || !authenticated) {
      setIsLoadingKeys(false);
      return null;
    }
    if (!backendAuthed) {
      return null;
    }
    if (!getBackendJwt()) {
      return null;
    }
    try {
      const j = await backendFetchJson<AgentKeysResponse>("/c9/sports/agent/keys");
      const kid = j?.keys?.kalshi_key_id || "";
      const kalshiWalletFull = j?.keys?.kalshi_wallet_addr_full || null;
      const kalshiOk = !!j?.keys?.kalshi_wallet_configured || !!j?.keys?.kalshi_keys_configured;
      setKalshiConnection({
        isConnected: kalshiOk,
        keyId: kid || undefined,
        maskedKey: kid
          ? `${kid.slice(0, 8)}…${kid.slice(-4)}`
          : (kalshiWalletFull ? `${kalshiWalletFull.slice(0, 6)}…${kalshiWalletFull.slice(-4)}` : undefined),
        walletAddr: kalshiWalletFull || undefined,
      });
      const pmMasked = j?.keys?.pm_wallet_addr || "";
      const pmOk = !!j?.keys?.pm_wallet_configured;
      setPolymarketConnection({
        isConnected: pmOk,
        maskedKey: pmMasked || undefined,
      });
      return { kalshiOk, pmOk };
    } catch (e) {
      setErrMsg((e as any)?.message || String(e));
      return null;
    } finally {
      setIsLoadingKeys(false);
    }
  }, [ready, authenticated, backendAuthed]);

  const deriveHistoryPositions = useCallback((trades: TradesResponse["trades"]) => {
    type BuyLot = {
      costUsd: number;
      buyPrice: number;
      contracts: number;
      ts: string;
      tsMs: number;
      sport: string | null;
      matchName: string | null;
      team: string | null;
      reason: string;
      modelLabel: string | null;
    };

    type Leg = {
      id: string;
      ticker: string;
      sport: string | null;
      matchName: string;
      team: string;
      modelLabel: string | null;
      buyTs: string;
      buyTsMs: number;
      sellTs: string;
      sellTsMs: number;
      entryPriceCents: number | null;
      exitPriceCents: number | null;
      contracts: number;
      costUsd: number;
      payoutUsd: number;
      pnlUsd: number;
      pnlPct: number;
      exitKind: "trade" | "settlement";
      cov: {
        enabled: boolean;
        pairedMainTicker: string | null;
        covXEff: number | null;
        covXUser: number | null;
      };
    };

    const parseTag = (reason: string, tag: string): string | null => {
      try {
        const r = String(reason || "");
        const m = r.match(new RegExp(`\\|${tag}:([^|]+)`));
        return m && m[1] ? String(m[1]).trim() : null;
      } catch {
        return null;
      }
    };
    const parseTagNum = (reason: string, tag: string): number | null => {
      const s = parseTag(reason, tag);
      const n = s != null ? Number(s) : NaN;
      return Number.isFinite(n) ? n : null;
    };

    const sorted = [...(trades || [])].sort((a, b) => {
      const ta = a?.executed_at ? Date.parse(String(a.executed_at)) : 0;
      const tb = b?.executed_at ? Date.parse(String(b.executed_at)) : 0;
      return ta - tb;
    });

    const buysByTicker = new Map<string, BuyLot[]>();
    const legs: Leg[] = [];

    for (const t of sorted) {
      const ticker = String(t?.ticker || "");
      const side = String(t?.side || "").toLowerCase();
      const status = String(t?.status || "").toLowerCase();
      const price = t?.price != null ? Number(t.price) : null;
      const sizeUsd = Number(t?.size_usd || 0);
      const ts = String(t?.executed_at || "");
      const tsMs = ts ? Date.parse(ts) : 0;
      const reason = String(t?.reason || "");
      const reasonL = reason.toLowerCase();
      const isSettlement =
        t?.isSettlement === true ||
        reasonL.startsWith("settle_loss_final") ||
        reasonL.startsWith("kalshi_settle_final") ||
        reasonL.startsWith("dflow_settle_loss") ||
        reasonL.startsWith("dflow_settle_loss_sweep");
      if (!ticker || !side) continue;

      if (side === "buy" && status === "filled") {
        if (!(price != null && Number.isFinite(price) && price > 0)) continue;
        const costUsd = Number.isFinite(sizeUsd) && sizeUsd > 0 ? sizeUsd : 0;
        const contracts = costUsd > 0 ? costUsd / price : 0;
        if (!buysByTicker.has(ticker)) buysByTicker.set(ticker, []);
        buysByTicker.get(ticker)!.push({
          costUsd,
          buyPrice: price,
          contracts,
          ts,
          tsMs: Number.isFinite(tsMs) ? tsMs : 0,
          sport: normalizeSportCode(t?.sport) || tickerToSport(ticker),
          matchName: t?.matchName ? String(t.matchName) : null,
          team: t?.team ? String(t.team) : null,
          reason,
          modelLabel: modelLabelFromTradeReason(reason),
        });
        continue;
      }

      const isExit =
        (side === "sell" && status === "filled") ||
        (side === "redeem" && (status === "redeemed" || status === "filled"));
      if (!isExit) continue;

      const q = buysByTicker.get(ticker);
      if (!q || q.length === 0) continue;
      // A single SELL/REDEEM can close a position built from multiple BUY fills.
      // Aggregate the full basis so "invested" and PnL% don't blow up on stacked entries.
      const lots = q.splice(0, q.length);
      const firstBuy = lots[0]!;
      const costUsd = lots.reduce((s, b) => {
        const v = Number(b?.costUsd ?? 0);
        return Number.isFinite(v) && v > 0 ? s + v : s;
      }, 0);
      const contracts = lots.reduce((s, b) => {
        const c = Number(b?.contracts ?? 0);
        if (Number.isFinite(c) && c > 0) return s + c;
        const cst = Number(b?.costUsd ?? 0);
        const bp = Number(b?.buyPrice ?? 0);
        if (Number.isFinite(cst) && cst > 0 && Number.isFinite(bp) && bp > 0) return s + cst / bp;
        return s;
      }, 0);
      const buyPrice =
        Number.isFinite(contracts) && contracts > 0
          ? costUsd / contracts
          : Number(firstBuy?.buyPrice ?? 0);
      const buyReason =
        lots.find(
          (b) =>
            String(b?.reason || "").includes("|coverage:1") ||
            String(b?.reason || "").includes("|paired:") ||
            String(b?.reason || "").includes("|covX:") ||
            String(b?.reason || "").includes("|covUser:")
        )?.reason ?? String(firstBuy?.reason || "");

      const isJupMarket = reason.includes("|marketId:POLY-") || reason.includes("|marketId:POLY");
      // For Jupiter fills, SELL rows log `size_usd` as net proceeds. Prefer that for payout so PnL
      // remains correct even if older rows had broken `pnl_usd=0`.
      const jupSellPayoutUsd =
        side === "sell" && isJupMarket && Number.isFinite(sizeUsd) && sizeUsd > 0
          ? sizeUsd
          : null;

      const hasPnlUsd =
        jupSellPayoutUsd == null && t?.pnl_usd != null && Number.isFinite(Number(t.pnl_usd));
      const payout =
        jupSellPayoutUsd != null
          ? jupSellPayoutUsd
          : hasPnlUsd
          ? costUsd + Number(t.pnl_usd)
          : side === "sell" && price != null && Number.isFinite(price)
            ? contracts * Math.max(0, price)
            : side === "redeem" && Number.isFinite(sizeUsd) && sizeUsd >= 0
              ? sizeUsd
              : (price != null && Number.isFinite(price))
                ? contracts * Math.max(0, price)
                : 0;
      const pnl = hasPnlUsd ? Number(t.pnl_usd) : payout - costUsd;
      const pct = costUsd > 0 ? (pnl / costUsd) * 100 : 0;

      const matchName = (t?.matchName ? String(t.matchName) : firstBuy.matchName) || ticker;
      const team = (t?.team ? String(t.team) : firstBuy.team) || ticker;
      const sport = normalizeSportCode(t?.sport) || firstBuy.sport || tickerToSport(ticker);
      const entryPriceCents = Number.isFinite(buyPrice) ? Math.round(buyPrice * 100) : null;
      let exitPriceDollars: number | null = null;
      // Prefer explicit exit price; allow 0 for settled losers.
      if (price != null && Number.isFinite(Number(price)) && Number(price) >= 0) {
        exitPriceDollars = Number(price);
      } else if (Number.isFinite(payout) && Number.isFinite(contracts) && contracts > 0) {
        // Fallback: infer from payout and contracts (allow 0).
        exitPriceDollars = payout / contracts;
      }
      const exitPriceCents =
        exitPriceDollars != null && Number.isFinite(Number(exitPriceDollars))
          ? Math.round(Number(exitPriceDollars) * 100)
          : null;

      const covEnabled = buyReason.includes("|coverage:1");
      const covXEff = parseTagNum(buyReason, "covX");
      const covXUser = parseTagNum(buyReason, "covUser") ?? covXEff;
      const pairedMainTicker = parseTag(buyReason, "paired");

      legs.push({
        id: `leg:${ticker}:${firstBuy.ts}:${ts}`,
        ticker,
        sport,
        matchName,
        team,
        modelLabel: firstBuy.modelLabel,
        buyTs: firstBuy.ts,
        buyTsMs: firstBuy.tsMs,
        sellTs: ts,
        sellTsMs: Number.isFinite(tsMs) ? tsMs : 0,
        entryPriceCents,
        exitPriceCents,
        contracts,
        costUsd: Number(costUsd.toFixed(2)),
        payoutUsd: Number(Math.max(0, payout).toFixed(2)),
        pnlUsd: Number(pnl.toFixed(2)),
        pnlPct: pct,
        exitKind: isSettlement ? "settlement" : "trade",
        cov: {
          enabled: covEnabled,
          pairedMainTicker: pairedMainTicker ? String(pairedMainTicker) : null,
          covXEff,
          covXUser,
        },
      });
    }

    const PAIR_GAP_MS = 5 * 60 * 1000;
    const mainLegsByTicker = new Map<string, Leg[]>();
    const hedgeLegs: Leg[] = [];
    for (const leg of legs) {
      if (leg.cov.pairedMainTicker) hedgeLegs.push(leg);
      else {
        if (!mainLegsByTicker.has(leg.ticker)) mainLegsByTicker.set(leg.ticker, []);
        mainLegsByTicker.get(leg.ticker)!.push(leg);
      }
    }
    for (const list of mainLegsByTicker.values()) list.sort((a, b) => a.buyTsMs - b.buyTsMs);

    const usedMain = new Set<string>();
    const usedHedge = new Set<string>();
    const outWithTs: Array<{ pos: PortfolioPosition; tsMs: number }> = [];

    for (const hedge of hedgeLegs) {
      const mainTicker = hedge.cov.pairedMainTicker;
      if (!mainTicker) continue;
      const candidates = mainLegsByTicker.get(mainTicker) || [];
      let best: Leg | null = null;
      let bestGap = Infinity;
      for (const c of candidates) {
        if (usedMain.has(c.id)) continue;
        const gap = Math.abs((c.buyTsMs || 0) - (hedge.buyTsMs || 0));
        if (gap <= PAIR_GAP_MS && gap < bestGap) {
          best = c;
          bestGap = gap;
        }
      }
      if (!best) continue;
      usedMain.add(best.id);
      usedHedge.add(hedge.id);

      const sport = best.sport || tickerToSport(best.ticker);
      // Coverage should display PAIR NET by default (main+hedge).
      const parentCost = best.costUsd + hedge.costUsd;
      const parentPayout = best.payoutUsd + hedge.payoutUsd;
      const parentPnl = best.pnlUsd + hedge.pnlUsd;
      const parentPct = parentCost > 0 ? (parentPnl / parentCost) * 100 : 0;
      const pairTsMs = Math.max(best.sellTsMs || 0, hedge.sellTsMs || 0);

      outWithTs.push({
        pos: {
          id: `hist:cov:${best.ticker}:${best.sellTs || best.buyTs || Date.now()}`,
          ticker: best.ticker,
          sportCode: sport,
          sportIcon: sportToIcon(sport),
          sportCategory: sportToCategory(sport),
          matchName: best.matchName,
          modelLabel:
            hedge.modelLabel === "Burst 2.0 Hedge Locked"
              ? hedge.modelLabel
              : best.modelLabel,
          choice: { type: "yes", team: best.team },
          finalPosition: `${Math.max(1, Math.round(best.contracts))} Yes`,
          settlementPayment: parentPayout,
          totalCost: parentCost,
          totalPayout: parentPayout,
          entryPriceCents: best.entryPriceCents,
          exitPriceCents: best.exitPriceCents,
          exitKind: best.exitKind,
          dateMs: pairTsMs,
          totalReturn: {
            amount: Number(Math.abs(parentPnl).toFixed(2)),
            percentage: Number(Math.abs(parentPct).toFixed(0)),
            isPositive: parentPnl >= 0,
          },
          coverage: {
            isParent: true,
            covXUser: best.cov.covXUser,
            covXEff: best.cov.covXEff,
            hedgeTicker: hedge.ticker,
          },
          children: [
            {
              id: `hist:covchild:${hedge.ticker}:${hedge.sellTs || hedge.buyTs || Date.now()}`,
              ticker: hedge.ticker,
              sportCode: hedge.sport,
              sportIcon: sportToIcon(sport),
              sportCategory: sportToCategory(sport),
              matchName: hedge.matchName,
              modelLabel: hedge.modelLabel,
              choice: { type: "yes", team: hedge.team },
              finalPosition: `${Math.max(1, Math.round(hedge.contracts))} Yes`,
              settlementPayment: hedge.payoutUsd,
              totalCost: hedge.costUsd,
              totalPayout: hedge.payoutUsd,
              entryPriceCents: hedge.entryPriceCents,
              exitPriceCents: hedge.exitPriceCents,
              exitKind: hedge.exitKind,
              dateMs: hedge.sellTsMs || 0,
              totalReturn: {
                amount: Number(Math.abs(hedge.pnlUsd).toFixed(2)),
                percentage: Number(Math.abs(hedge.pnlPct).toFixed(0)),
                isPositive: hedge.pnlUsd >= 0,
              },
              coverage: { isChild: true },
            },
          ],
        },
        tsMs: pairTsMs,
      });
    }

    for (const leg of legs) {
      if (usedMain.has(leg.id) || usedHedge.has(leg.id)) continue;
      const sport = leg.sport || tickerToSport(leg.ticker);
      outWithTs.push({
        pos: {
          id: `hist:${leg.ticker}:${leg.sellTs || leg.buyTs || Date.now()}`,
          ticker: leg.ticker,
          sportCode: sport,
          sportIcon: sportToIcon(sport),
          sportCategory: sportToCategory(sport),
          matchName: leg.matchName,
          modelLabel: leg.modelLabel,
          choice: { type: "yes", team: leg.team },
          finalPosition: `${Math.max(1, Math.round(leg.contracts))} Yes`,
          settlementPayment: leg.payoutUsd,
          totalCost: leg.costUsd,
          totalPayout: leg.payoutUsd,
          entryPriceCents: leg.entryPriceCents,
          exitPriceCents: leg.exitPriceCents,
          exitKind: leg.exitKind,
          dateMs: leg.sellTsMs || 0,
          totalReturn: {
            amount: Number(Math.abs(leg.pnlUsd).toFixed(2)),
            percentage: Number(Math.abs(leg.pnlPct).toFixed(0)),
            isPositive: leg.pnlUsd >= 0,
          },
        },
        tsMs: leg.sellTsMs || 0,
      });
    }

    outWithTs.sort((a, b) => (b.tsMs || 0) - (a.tsMs || 0));
    return outWithTs.map((x) => x.pos);
  }, []);

  const fetchPortfolioGames = useCallback(async () => {
    try {
      const res = await fetch("/api/c9/games-feed?sports=NBA,NFL,MLB,NHL,CFB,CBB");
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return Array.isArray(data?.games) ? (data.games as PortfolioGame[]) : null;
    } catch {
      return null;
    }
  }, []);

  const loadPortfolio = useCallback(async () => {
    if (!ready || !authenticated || !backendAuthed) return;
    if (!getBackendJwt()) return;
    setErrMsg(null);

    const access = await loadAccess();
    if (access !== true) return;

    const keys = await loadKeys();
    if (!(keys?.kalshiOk || keys?.pmOk)) return;

    setLoading(true);
    try {
      const days = daysForRange(timeRange);
      // Best-effort: if any finished games are stuck in open positions (historical bug),
      // reconcile them into history BEFORE loading tables.
      try {
        await backendFetchJson("/c9/sniper/reconcile-finished", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      } catch {}

      const [stats, pos, trades, cfg, games] = await Promise.all([
        backendFetchJson<SniperStatsResponse>(
          timeRange === "all"
            ? "/c9/sniper/stats?scope=all"
            : `/c9/sniper/stats?days=${days}`
        ),
        backendFetchJson<SniperPositionsResponse>("/c9/sniper/positions"),
        backendFetchJson<TradesResponse>(`/c9/sniper/trades?days=${days}`),
        backendFetchJson<AgentConfigResponse>("/c9/sports/agent/config").catch(() => null),
        fetchPortfolioGames(),
      ]);

      const pnlUsd = Number(stats?.stats?.totalPnlUsd || 0);
      const pct =
        stats?.stats?.pnlPct != null && Number.isFinite(Number(stats.stats.pnlPct))
          ? Number(stats.stats.pnlPct) * 100
          : 0;
      setPnlAmount(pnlUsd);
      setPnlPercentage(Number.isFinite(pct) ? Number(pct.toFixed(0)) : 0);

      try {
        const flags = (cfg as any)?.config?.feature_flags || {};
        const ts = flags?.pnl_reset_ts ?? flags?.pnlResetTs ?? null;
        setPnlResetTs(ts ? String(ts) : null);
      } catch {
        setPnlResetTs(null);
      }

      // Cash: combine Kalshi (Solana USDC) + Polymarket (Polygon USDC.e)
      let cashKalshi = 0;
      let cashPolymarket = 0;
      const cashTasks: Array<Promise<void>> = [];

      if (keys?.kalshiOk) {
        cashTasks.push(
          (async () => {
            // Solana wallet cash (USDC + JupUSD). Fall back to Kalshi API balance if needed.
            try {
              const bal = await backendFetchJson<MoonPayBalanceResponse>("/moonpay/balance");
              const usdc = Number(bal?.balance_usdc || 0);
              const jupUsd = Number(bal?.balance_jupusd ?? 0);
              cashKalshi = (Number.isFinite(usdc) ? usdc : 0) + (Number.isFinite(jupUsd) ? jupUsd : 0);
              if (!Number.isFinite(cashKalshi)) cashKalshi = 0;
            } catch {
              try {
                const bal = await backendFetchJson<KalshiBalanceResponse>("/c9/kalshi/balance");
                cashKalshi = Number(bal?.balance_cents || 0) / 100;
                if (!Number.isFinite(cashKalshi)) cashKalshi = 0;
              } catch {
                cashKalshi = 0;
              }
            }
          })()
        );
      }

      if (keys?.pmOk) {
        cashTasks.push(
          (async () => {
            try {
              const bal = await backendFetchJson<{ balance_usd?: number | null }>(
                "/c9/polymarket/balance"
              );
              cashPolymarket = Number(bal?.balance_usd || 0);
              if (!Number.isFinite(cashPolymarket)) cashPolymarket = 0;
            } catch {
              cashPolymarket = 0;
            }
          })()
        );
      }

      await Promise.all(cashTasks);
      const cash = cashKalshi + cashPolymarket;
      setCashUsd(Number.isFinite(cash) ? Number(cash.toFixed(2)) : 0);

      const rawOpen = Array.isArray(pos?.positions) ? pos.positions : [];
      const rawTrades = Array.isArray(trades?.trades) ? trades.trades : [];
      if (Array.isArray(games)) setPortfolioGames(games);

      const mappedOpen: PortfolioPosition[] = rawOpen.map((p) => {
        const ticker = String(p?.ticker || "");
        const qty = Number(p?.quantity || 0);
        const cost = Number(p?.costUsd || 0);
        const cur = Number(p?.currentPriceCents || 0);
        const payout = Number.isFinite(cur) && Number.isFinite(qty) ? (cur / 100) * qty : 0;
        const pnl = Number(p?.unrealizedPnlUsd || 0);
        const pct2 =
          p?.unrealizedPnlPct != null && Number.isFinite(Number(p.unrealizedPnlPct))
            ? Number(p.unrealizedPnlPct) * 100
            : cost > 0
              ? (pnl / cost) * 100
              : 0;
        return {
          id: ticker,
          ticker,
          sportCode: normalizeSportCode(p?.sport) || tickerToSport(ticker),
          sportIcon: sportToIcon(p?.sport),
          sportCategory: sportToCategory(p?.sport),
          matchName: p?.matchName || ticker,
          modelLabel: typeof p?.modelLabel === "string" ? p.modelLabel : null,
          choice: { type: "yes", team: p?.team || ticker },
          finalPosition: `${Math.max(0, Math.round(qty))} Yes`,
          settlementPayment: Number(payout.toFixed(2)),
          totalCost: Number(cost.toFixed(2)),
          totalPayout: Number(payout.toFixed(2)),
          entryPriceCents: Number.isFinite(Number(p?.entryPriceCents)) ? Number(p.entryPriceCents) : null,
          exitPriceCents: Number.isFinite(Number(p?.currentPriceCents)) ? Number(p.currentPriceCents) : null,
          totalReturn: {
            amount: Number(Math.abs(pnl).toFixed(2)),
            percentage: Number(Math.abs(pct2).toFixed(0)),
            isPositive: pnl >= 0,
          },
        };
      });
      setOpenPositions(mappedOpen);

      setHistoryPositions(deriveHistoryPositions(rawTrades));
    } catch (e) {
      setErrMsg((e as any)?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [ready, authenticated, backendAuthed, timeRange, loadAccess, loadKeys, deriveHistoryPositions, fetchPortfolioGames]);

  const handleResetPnl = useCallback(async () => {
    try {
      await ensureBackendJwt();
      await backendFetchJson<{ ok: boolean }>("/c9/sports/agent/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureFlags: {
            pnl_reset_ts: new Date().toISOString(),
          },
        }),
      });
      await loadPortfolio();
    } catch (e: any) {
      setErrMsg(e?.message || String(e));
    }
  }, [ensureBackendJwt, loadPortfolio]);

  useEffect(() => {
    if (!ready || !authenticated || !backendAuthed) return;
    loadPortfolio();
  }, [ready, authenticated, backendAuthed, timeRange, loadPortfolio]);

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
        await loadPortfolio();
      } catch (e) {
        setErrMsg((e as any)?.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [loadKeys, loadPortfolio]
  );

  const handleConnectPolymarket = useCallback(
    async () => {
      setErrMsg(null);
      setLoading(true);
      try {
        const j = await backendFetchJson<{ ok: boolean; pm_wallet_addr?: string | null }>(
          "/c9/sports/agent/keys",
          {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pm_generate_key: true }),
          }
        );
        await loadKeys();
        return j?.pm_wallet_addr || null;
      } catch (e) {
        setErrMsg((e as any)?.message || String(e));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loadKeys]
  );

  const handleSharePnl = (positionId: string) => {
    const all = [...openPositions, ...historyPositions];
    const p = all.find((x) => x.id === positionId);
    if (!p) return;
    const matchedGame = pickBestPortfolioGame(p, portfolioGames);
    const side = resolvePortfolioPositionSide(p, matchedGame);
    const teamLogo =
      side === "home"
        ? matchedGame?.homeLogo || null
        : side === "away"
          ? matchedGame?.awayLogo || null
          : null;

    const pnlSigned = p.totalReturn.isPositive ? p.totalReturn.amount : -p.totalReturn.amount;
    setShareDialog({
      pnlAmount: pnlSigned,
      pnlPercentage: p.totalReturn.isPositive ? p.totalReturn.percentage : -p.totalReturn.percentage,
      invested: p.totalCost,
      position: p.totalPayout,
      matchName: p.matchName || null,
      modelLabel: p.modelLabel || null,
      teamLogo,
      homeScore: matchedGame?.homeScore ?? null,
      awayScore: matchedGame?.awayScore ?? null,
      homeAbbr: matchedGame?.homeAbbr || null,
      awayAbbr: matchedGame?.awayAbbr || null,
      period: matchedGame?.period || null,
      clock: matchedGame?.clock || null,
    });
    setShareDialogHighlightEventId(matchedGame?.id ? String(matchedGame.id) : null);
    setShareDialogHighlightSport(String(matchedGame?.sport || "NBA").toUpperCase());
    setIsShareDialogOpen(true);
  };

  if (ready && authenticated && (!backendAuthed || hasAccess === null)) {
    return (
      <div
        className="flex w-full min-h-0 flex-1 flex-col items-center justify-center rounded-[12px] p-3 sm:rounded-[16px] sm:p-4"
        style={{
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-6 text-white/60" />
          <p className="text-sm text-[#757575]">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (ready && authenticated && hasAccess === false) {
    return (
      <div className="flex w-full min-w-0 flex-1 items-center justify-center rounded-[12px] p-3 sm:rounded-[16px] sm:p-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-white">Get early access</h1>
          <p className="mt-2 text-sm text-[#757575]">
            Your wallet isn’t unlocked for C9 yet.
          </p>
          <Link
            href="/early-access"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-[124px] px-5 text-sm font-medium text-white transition-all hover:brightness-110"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.08) inset",
            }}
          >
            Go unlock
          </Link>
        </div>
      </div>
    );
  }

  // Still loading keys? Show spinner (prevents flash of ConnectPrompt)
  if (ready && authenticated && hasAccess === true && isLoadingKeys) {
    return (
      <div
        className="flex w-full min-h-0 flex-1 flex-col items-center justify-center rounded-[12px] p-3 sm:rounded-[16px] sm:p-4"
        style={{
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-6 text-white/60" />
          <p className="text-sm text-[#757575]">Loading...</p>
        </div>
      </div>
    );
  }

  if (
    ready &&
    authenticated &&
    hasAccess === true &&
    !isLoadingKeys &&
    !kalshiConnection.isConnected &&
    !polymarketConnection.isConnected
  ) {
    return (
      <div
        className="flex w-full min-h-0 flex-1 flex-col rounded-[12px] p-3 sm:rounded-[16px] sm:p-4"
        style={{
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      >
        {errMsg && (
          <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            {errMsg}
          </div>
        )}
        <div className="flex flex-1 items-center justify-center">
          <ConnectPrompt
            polymarketConnection={polymarketConnection}
            kalshiConnection={kalshiConnection}
            onConnectPolymarket={handleConnectPolymarket}
            onConnectKalshi={handleConnectKalshi}
            isLoadingKeys={isLoadingKeys}
          />
        </div>
        {loading && (
          <p className="mt-3 text-center text-xs text-[#757575]">Saving…</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-auto sm:gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div
        className="w-full rounded-[12px] p-3 sm:rounded-[16px] sm:p-4"
        style={{
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      >
        <h1 className="shrink-0 text-lg font-semibold text-white sm:text-xl xl:text-2xl">
          Portfolio
        </h1>

        <div className="mt-3 sm:mt-4">
          <PortfolioPnlCard
            totalValue={totalValueUsd}
            pnlAmount={pnlAmount}
            pnlPercentage={pnlPercentage}
            positions={openPositionsUsd}
            cash={cashUsd}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
        onResetPnl={handleResetPnl}
        pnlResetActive={!!pnlResetTs}
          />
        </div>

        {errMsg && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            {errMsg}
          </div>
        )}

        <div
          className="mt-3 min-h-0 overflow-auto rounded-lg border border-white/[0.02] sm:mt-4 sm:rounded-xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{
            background: "#141416",
            boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
          }}
        >
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
              Loading…
            </div>
          ) : (
            <PortfolioPositionsTable
              positions={openPositions}
              historyPositions={historyPositions}
              games={portfolioGames}
              onSharePnl={handleSharePnl}
            />
          )}
        </div>
      </div>

      <SharePnlDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        pnlAmount={shareDialog.pnlAmount}
        pnlPercentage={shareDialog.pnlPercentage}
        invested={shareDialog.invested}
        position={shareDialog.position}
        displayName={displayName || undefined}
        profileImage={profileImage || undefined}
        autoHighlightEventId={shareDialogHighlightEventId}
        autoHighlightSport={shareDialogHighlightSport}
        matchName={shareDialog.matchName}
        modelLabel={shareDialog.modelLabel}
        teamLogo={shareDialog.teamLogo}
        homeScore={shareDialog.homeScore}
        awayScore={shareDialog.awayScore}
        homeAbbr={shareDialog.homeAbbr}
        awayAbbr={shareDialog.awayAbbr}
        period={shareDialog.period}
        clock={shareDialog.clock}
      />
    </div>
  );
};

export default PortfolioPage;


