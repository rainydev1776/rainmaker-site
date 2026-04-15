"use client";

import { useCallback, useEffect, useMemo, useState, useContext, useRef } from "react";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useBackendAuth } from "@/components/providers";
import { ActivationVideoContext, UserProfileContext } from "@/components/layout/app-layout";
import {
  C9PnlCard,
  C9PositionsTable,
  C9SettingsPanel,
  C9ServiceAnnouncement,
  SharePnlDialog,
  positionMatchesGame,
  resolvePositionSide,
  type C9Position,
  type UpcomingGame,
} from "@/components/features/c9";
import { ChevronDown } from "lucide-react";
import {
  backendFetch,
  backendFetchJson,
  backendLoginWithPhantomSig,
  clearBackendJwt,
  createSolanaAuthProofBestEffort,
  getBackendJwt,
  setBackendJwt,
} from "@/lib/backend";

const DISABLED_CRYPTO_SPORTS = new Set(["btc", "eth"]);
const stripDisabledSports = (arr: string[], cryptoAllowed: boolean) =>
  cryptoAllowed ? arr : arr.filter((s) => !DISABLED_CRYPTO_SPORTS.has(s.toLowerCase()));

interface ShareDialogData {
  pnlAmount: number;
  pnlPercentage: number;
  invested: number;
  position: number;
  eventId: string | null;
  sport: string;
  matchName: string | null;
  modelLabel: string | null;
  teamLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeAbbr: string | null;
  awayAbbr: string | null;
  period: string | null;
  clock: string | null;
}

type SniperStatsResponse = {
  ok: boolean;
  stats: {
    winRate: number;
    wins: number;
    losses: number;
    totalSettled: number;
    totalPnlUsd: number;
    pnlPct: number | null;
  };
};

type LiveScore = {
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  period: string | null;
  clock: string | null;
  gameStatus: string | null;
};

type SniperPositionsResponse = {
  ok: boolean;
  positions: Array<{
    ticker: string;
    sport: string | null;
    matchName: string;
    team: string | null;
    modelLabel?: string | null;
    side: 'home' | 'away' | null;
    entryPriceCents: number;
    currentPriceCents: number;
    quantity: number;
    sparkline?: Array<{ ts: number; cents: number }>;
    costUsd: number;
    unrealizedPnlUsd: number;
    unrealizedPnlPct: number | null;
    status: string | null;
    liveScore: LiveScore | null;
  }>;
};

function normalizeModelLabel(raw: unknown): string | null {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return null;
  if (s === "burst 1.0") return "burst 1.0";
  if (s === "burst 2.0") return "burst 2.0";
  if (s === "burst 3.0") return "burst 3.0";
  if (s === "nhl burst") return "NHL Burst";
  if (s === "mlb burst") return "MLB Burst";
  if (s === "turbo" || s === "kage" || s === "foul" || s === "micro") return s;
  return null;
}

type SniperRedeemResponse = {
  ok: boolean;
  sold?: boolean;
  redeemed?: boolean;
  pending?: boolean;
  reason?: string | null;
  proceedsUsd?: number | null;
  txId?: string | null;
  txHash?: string | null;
  conditionId?: string;
  note?: string;
  error?: string;
  message?: string;
};

type AgentConfigResponse = {
  ok: boolean;
  cryptoAllowed?: boolean;
  turboAllowed?: boolean;
  strategyCatalog?: Array<{
    lineageKey: string;
    modeValue: string;
    displayName: string;
    winRate30d: number;
    pnl1k30d: number;
    trades30d: number;
    summaryText: string;
    candidateName?: string | null;
    resultPath?: string | null;
    promotedAt?: string | null;
    active?: boolean;
  }>;
  config: {
    enabled?: boolean;
    portfolio_usd?: number | null;
    max_concurrent?: number | null;
    tp_pct?: number | null;
    sl_pct?: number | null;
    execution_venue?: string | null;
    feature_flags?: any;
    updated_at?: string | null;
  };
};

type C9Mode = "turbo" | "kage" | "foul" | "micro" | "burst1" | "burst2" | "burst3" | "nhlburst39" | "mlbburst7071";

const C9_MODE_VALUES: C9Mode[] = ["turbo", "kage", "foul", "micro", "burst1", "burst2", "burst3", "nhlburst39", "mlbburst7071"];

function normalizeC9Mode(raw: unknown): C9Mode | "" {
  const s = String(raw || "").toLowerCase().trim();
  if (s === "favdip") return "burst1";
  return C9_MODE_VALUES.includes(s as C9Mode) ? (s as C9Mode) : "";
}
type ActivateSettings = {
  maxStake?: string;
  maxConcurrent?: string;
  stopLoss?: string;
  takeProfit?: string;
  stopLossEnabled?: boolean;
  coverage?: number;
  coverageEnabled?: boolean;
  turboMode?: boolean;
  ultraEnabled?: boolean;
  kageEnabled?: boolean;
  foulEnabled?: boolean;
  microEnabled?: boolean;
  mode?: C9Mode;
  modes?: C9Mode[];
  selectedSports?: string[];
  executionPath?: "dflow" | "jupiter";
  rainBuybackPct?: string;
  betaStakePct?: string;
  platform?: string;
  selectedPlatforms?: string[];
  balanceSource?: string;
};

type KalshiBalanceResponse = {
  ok: boolean;
  balance_cents: number;
  updated_ts?: string | null;
};

type MoonPayBalanceResponse = {
  ok: boolean;
  balance_usdc: number;
  balance_jupusd?: number;
  balance_sol: number;
  wallet_address: string | null;
};

type PolymarketBalanceResponse = {
  ok: boolean;
  balance_cents: number;
  balance_usd: number;
  wallet_addr?: string | null;
};

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
    pm_wallet_addr_full?: string | null;
    pm_wallet_configured: boolean;
  };
};

type C9AccessResponse = {
  ok: boolean;
  access: boolean;
};

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

function gameSideTokens(game: UpcomingGame, side: "home" | "away"): string[] {
  const values =
    side === "home"
      ? [game.homeTeam, game.homeShort, game.homeAbbr]
      : [game.awayTeam, game.awayShort, game.awayAbbr];

  return [...new Set(values.map(normalizeGameText).filter(Boolean))];
}

function rawPositionMatchesGame(
  position: SniperPositionsResponse["positions"][number],
  game: UpcomingGame
): boolean {
  const texts = [
    normalizeGameText(position.matchName),
    normalizeGameText(`${position.liveScore?.awayTeam || ""} @ ${position.liveScore?.homeTeam || ""}`),
    normalizeGameText(`${position.liveScore?.homeTeam || ""} vs ${position.liveScore?.awayTeam || ""}`),
  ].filter(Boolean);

  const homeTokens = gameSideTokens(game, "home");
  const awayTokens = gameSideTokens(game, "away");

  return texts.some(
    (text) => homeTokens.some((token) => text.includes(token)) && awayTokens.some((token) => text.includes(token))
  );
}

// Team code → city/short label (used only as a fallback when we don't have c9_games labels).
// NOTE: We intentionally keep this "city-only" so codes that overlap across sports (e.g. KC)
// still map to a sensible display value.
const TEAM_LABELS: Record<string, string> = {
  // Common (NBA/NFL/MLB/NHL)
  ATL: "Atlanta",
  BOS: "Boston",
  BKN: "Brooklyn",
  CHA: "Charlotte",
  CHI: "Chicago",
  CLE: "Cleveland",
  DAL: "Dallas",
  DEN: "Denver",
  DET: "Detroit",
  HOU: "Houston",
  IND: "Indiana",
  LAC: "Los Angeles",
  LAL: "Los Angeles",
  MEM: "Memphis",
  MIA: "Miami",
  MIL: "Milwaukee",
  MIN: "Minnesota",
  NO: "New Orleans",
  NOP: "New Orleans",
  NY: "New York",
  NYK: "New York",
  OKC: "Oklahoma City",
  ORL: "Orlando",
  PHI: "Philadelphia",
  PHX: "Phoenix",
  POR: "Portland",
  SAC: "Sacramento",
  SA: "San Antonio",
  SAS: "San Antonio",
  TOR: "Toronto",
  UTA: "Utah",
  WAS: "Washington",
  WSH: "Washington",
  // NFL-ish
  ARI: "Arizona",
  ARZ: "Arizona",
  BAL: "Baltimore",
  BUF: "Buffalo",
  CAR: "Carolina",
  CIN: "Cincinnati",
  GB: "Green Bay",
  JAX: "Jacksonville",
  KC: "Kansas City",
  LV: "Las Vegas",
  LAR: "Los Angeles",
  NE: "New England",
  NYG: "New York",
  NYJ: "New York",
  PIT: "Pittsburgh",
  SF: "San Francisco",
  SEA: "Seattle",
  TB: "Tampa Bay",
  TEN: "Tennessee",
  // NHL-ish
  ANA: "Anaheim",
  CGY: "Calgary",
  CBJ: "Columbus",
  COL: "Colorado",
  EDM: "Edmonton",
  FLA: "Florida",
  LAK: "Los Angeles",
  MTL: "Montreal",
  MON: "Montreal",
  NJD: "New Jersey",
  NJ: "New Jersey",
  NYI: "New York",
  NYR: "New York",
  OTT: "Ottawa",
  SJS: "San Jose",
  SJ: "San Jose",
  STL: "St. Louis",
  TBL: "Tampa Bay",
  VAN: "Vancouver",
  VGK: "Vegas",
  VGS: "Vegas",
  WPG: "Winnipeg",
  NSH: "Nashville",
  // MLB-ish
  CHC: "Chicago",
  CHW: "Chicago",
  CWS: "Chicago",
  SD: "San Diego",
  TEX: "Texas",
};

function expandTeamAbbr(abbr: string | null): string {
  if (!abbr) return "";
  const key = abbr.toUpperCase();
  return TEAM_LABELS[key] || abbr;
}

function fmtUsd(n: number): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(v);
}

const C9Page = () => {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { backendAuthed } = useBackendAuth();
  const { showVideo, setShowVideo } = useContext(ActivationVideoContext);
  const { displayName, profileImage } = useContext(UserProfileContext);
  
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [dashboardLoadedOnce, setDashboardLoadedOnce] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [kalshiConnection, setKalshiConnection] = useState<PlatformConnection>({
    isConnected: false,
  });
  const [polymarketConnection, setPolymarketConnection] =
    useState<PlatformConnection>({
      isConnected: false,
    });
  const [totalPnl, setTotalPnl] = useState(0);
  const [pnlPct, setPnlPct] = useState<number | null>(null);
  const [portfolioUsd, setPortfolioUsd] = useState<number | null>(null);
  const [kalshiBalanceUsd, setKalshiBalanceUsd] = useState<number | null>(null);
  const [pmBalanceUsd, setPmBalanceUsd] = useState<number | null>(null);
  const [jupUsdBalance, setJupUsdBalance] = useState<number | null>(null);
  const [agentCfgRow, setAgentCfgRow] = useState<AgentConfigResponse["config"] | null>(null);
  const [strategyCatalog, setStrategyCatalog] = useState<AgentConfigResponse["strategyCatalog"]>([]);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [cryptoAllowed, setCryptoAllowed] = useState(false);
  const [turboAllowed, setTurboAllowed] = useState(false);
  const [configLoadedOnce, setConfigLoadedOnce] = useState(false);
  const [rawPositions, setRawPositions] =
    useState<SniperPositionsResponse["positions"]>([]);
  const [redeeming, setRedeeming] = useState<Record<string, boolean>>({});
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([]);
  const [pnlHighlightEventId, setPnlHighlightEventId] = useState<string | null>(null);
  const [pnlHighlightVideoSrc, setPnlHighlightVideoSrc] = useState<string | null>(null);
  const [pnlHighlightPosterSrc, setPnlHighlightPosterSrc] = useState<string | null>(null);
  const lastPnlHighlightEventIdRef = useRef<string | null>(null);

  // Play video once when agent gets activated (false → true)
  const prevAgentEnabled = useRef(agentEnabled);
  useEffect(() => {
    if (agentEnabled && !prevAgentEnabled.current) {
      // Just activated - play video once
      setShowVideo(true);
    }
    prevAgentEnabled.current = agentEnabled;
  }, [agentEnabled, setShowVideo]);

  // Auto-pull the held position's ESPN highlight video and use it as the P&L card background.
  useEffect(() => {
    const liveGames = upcomingGames.filter((g) => (g?.sport === "NBA" || g?.sport === "NHL") && g?.id);
    if (!liveGames.length) {
      lastPnlHighlightEventIdRef.current = null;
      setPnlHighlightEventId(null);
      setPnlHighlightVideoSrc(null);
      // Keep the last poster during data refreshes so the overlay doesn't flash off.
      // Only clear it when we're sure there are truly no games (first load with empty array).
      return;
    }

    const pickCandidateGame = (): UpcomingGame | null => {
      const matchedGames = rawPositions
        .filter((p) => { const s = String(p?.sport || "").toUpperCase(); return s === "NBA" || s === "NHL"; })
        .map((p) => liveGames.find((g) => rawPositionMatchesGame(p, g)) || null)
        .filter((g): g is UpcomingGame => Boolean(g?.id));

      const dedupedMatches = Array.from(new Map(matchedGames.map((g) => [g.id, g])).values());
      const rankedMatches = dedupedMatches.sort((a, b) => {
        const rank = (status: UpcomingGame["status"]) =>
          status === "post" ? 0 : status === "live" ? 1 : status === "pre" ? 2 : 3;
        return rank(a.status) - rank(b.status);
      });
      if (rankedMatches[0]) return rankedMatches[0];

      return (
        liveGames.find((g) => g.status === "post") ||
        liveGames.find((g) => g.status === "live") ||
        liveGames.find((g) => g.status === "pre") ||
        null
      );
    };

    const candidateGame = pickCandidateGame();
    const candidateEventId = candidateGame?.id ? String(candidateGame.id) : null;
    if (!candidateEventId) {
      lastPnlHighlightEventIdRef.current = null;
      setPnlHighlightEventId(null);
      setPnlHighlightVideoSrc(null);
      setPnlHighlightPosterSrc(null);
      return;
    }
    if (candidateEventId === lastPnlHighlightEventIdRef.current) return;
    lastPnlHighlightEventIdRef.current = candidateEventId;

    let cancelled = false;
    (async () => {
      try {
        const candidateSport = candidateGame?.sport || "NBA";
        const videoSrc = `/api/c9/highlight-video?sport=${candidateSport}&eventId=${encodeURIComponent(candidateEventId)}`;
        const metaRes = await fetch(
          `/api/c9/highlights?sport=${candidateSport}&eventId=${encodeURIComponent(candidateEventId)}`
        ).catch(() => null);
        const data = metaRes?.ok ? await metaRes.json().catch(() => null) : null;
        const highlight = data?.highlight || null;
        const thumbnail = highlight?.thumbnail ? String(highlight.thumbnail) : null;
        const mp4Url = highlight?.mp4Url ? String(highlight.mp4Url) : null;
        if (cancelled) return;
        setPnlHighlightEventId(candidateEventId);
        // Only attempt the video background when ESPN exposes an MP4 highlight.
        // Otherwise keep the static background image (prevents "blank header" before highlights exist).
        setPnlHighlightVideoSrc(mp4Url ? videoSrc : null);
        setPnlHighlightPosterSrc(thumbnail);
      } catch {
        if (cancelled) return;
        setPnlHighlightEventId(candidateEventId);
        setPnlHighlightVideoSrc(null);
        setPnlHighlightPosterSrc(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawPositions, upcomingGames]);

  const walletAddress =
    user?.wallet?.address ||
    (Array.isArray(wallets) ? (wallets as any)[0]?.address : null) ||
    (
      user?.linkedAccounts?.find((account) => account.type === "wallet") as
        | { address?: string }
        | undefined
    )?.address;

  const walletsArr = useMemo(() => (Array.isArray(wallets) ? wallets : []), [wallets]);

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [shareDialogData, setShareDialogData] = useState<ShareDialogData>({
    pnlAmount: 0,
    pnlPercentage: 0,
    invested: 0,
    position: 0,
    eventId: null,
    sport: "NBA",
    matchName: null,
    modelLabel: null,
    teamLogo: null,
    homeScore: null,
    awayScore: null,
    homeAbbr: null,
    awayAbbr: null,
    period: null,
    clock: null,
  });

  const openCostUsd = useMemo(() => {
    return rawPositions.reduce((s, p) => s + Number(p?.costUsd || 0), 0);
  }, [rawPositions]);

  const openValueUsd = useMemo(() => {
    return rawPositions.reduce((s, p) => {
      const cur = Number(p?.currentPriceCents || 0);
      const qty = Number(p?.quantity || 0);
      return s + (cur / 100) * qty;
    }, 0);
  }, [rawPositions]);

  const positions: C9Position[] = useMemo(() => {
    const baseKeyFromTicker = (ticker: string): string | null => {
      try {
        const t = String(ticker || "").trim().toUpperCase();
        if (!t) return null;
        // Strip trailing "-TEAM" or "-TEAM-T1" suffix to get a stable per-game key.
        const base = t.replace(/-([A-Z]{2,4})(?:-T\d)?$/, "");
        return base && base !== t ? base : null;
      } catch {
        return null;
      }
    };

    const extractTeamFromTicker = (ticker: string) => {
      const match = String(ticker || "").match(/-([A-Z]{2,4})(?:-T\d)?$/);
      return match ? match[1] : null;
    };

    const items = rawPositions.map((p, idx) => {
      const entry = Number(p.entryPriceCents || 0);
      const cur = Number(p.currentPriceCents || 0);
      const qty = Number(p.quantity || 0);
      const cost = Number(p.costUsd || 0);
        const backendPnl = Number(p?.unrealizedPnlUsd ?? NaN);
        const pnl = Number.isFinite(backendPnl)
          ? backendPnl
          : (cur / 100) * qty - cost;
        const pct =
          p?.unrealizedPnlPct != null && Number.isFinite(Number(p.unrealizedPnlPct))
            ? Number(p.unrealizedPnlPct) * 100
            : cost > 0
              ? (pnl / cost) * 100
              : 0;

      const extractedTeam = extractTeamFromTicker(p.ticker);
      const fullTeamName = expandTeamAbbr(extractedTeam);
      const displayMatchName =
        p.matchName && p.matchName !== p.ticker ? p.matchName : fullTeamName ? fullTeamName : p.ticker;
      const displayTeam = p.team || fullTeamName || extractedTeam || p.ticker;

      const pos: C9Position = {
        id: p.ticker,
        sportIcon: sportToIcon(p.sport),
        sportCategory: sportToCategory(p.sport),
        matchName: displayMatchName,
        modelLabel: normalizeModelLabel(p.modelLabel),
        side: p.side,
        choice: { type: "yes", team: displayTeam },
        lastTraded: Number.isFinite(cur) && cur > 0 ? `${cur}¢` : "—",
        entryPriceCents: entry > 0 ? entry : undefined,
        currentPriceCents: cur > 0 ? cur : undefined,
        sparkline: Array.isArray(p.sparkline)
          ? (p.sparkline as any[])
              .map((pt) => ({ ts: Number((pt as any)?.ts), cents: Number((pt as any)?.cents) }))
              .filter((pt) => Number.isFinite(pt.ts) && Number.isFinite(pt.cents))
          : [],
        contracts: qty,
        avgPrice: entry > 0 ? `${entry}¢` : "—",
        cost: fmtUsd(cost),
        totalReturn: {
          amount: fmtUsd(Math.abs(pnl)),
          percentage: `${Math.abs(pct).toFixed(0)}%`,
          isPositive: pnl >= 0,
        },
        liveScore: p.liveScore,
      };

      return { idx, base: baseKeyFromTicker(p.ticker), costUsd: cost, qty, entryCents: entry, curCents: cur, pos };
    });

    // Group coverage pairs in realtime:
    // If both sides of the same game are held, show ONE parent row (main leg) with a hedge child row.
    const byBase = new Map<string, Array<typeof items[number]>>();
    const outWithIdx: Array<{ idx: number; pos: C9Position }> = [];

    for (const it of items) {
      if (!it.base) {
        outWithIdx.push({ idx: it.idx, pos: it.pos });
        continue;
      }
      if (!byBase.has(it.base)) byBase.set(it.base, []);
      byBase.get(it.base)!.push(it);
    }

    for (const group of byBase.values()) {
      const uniqTickers = new Set(group.map((g) => String(g.pos.id || "")));
      if (group.length === 2 && uniqTickers.size === 2) {
        const sorted = [...group].sort((a, b) => {
          const dc = Number(b.costUsd || 0) - Number(a.costUsd || 0);
          if (dc !== 0) return dc;
          return Number(b.qty || 0) - Number(a.qty || 0);
        });
        const parent = sorted[0];
        const child = sorted[1];
        const pairCostUsd = Number(parent.costUsd || 0) + Number(child.costUsd || 0);
        const parentValUsd = (Number(parent.curCents || 0) / 100) * Number(parent.qty || 0);
        const childValUsd = (Number(child.curCents || 0) / 100) * Number(child.qty || 0);
        const pairValueUsd = parentValUsd + childValUsd;
        const pairPnlUsd = pairValueUsd - pairCostUsd;
        const pairPct = pairCostUsd > 0 ? (pairPnlUsd / pairCostUsd) * 100 : 0;
        const pairContracts = Number(parent.qty || 0) + Number(child.qty || 0);
        const pairAvgEntryCents = pairContracts > 0 ? Math.round((pairCostUsd / pairContracts) * 100) : 0;
        const pairAvgCurCents = pairContracts > 0 ? Math.round((pairValueUsd / pairContracts) * 100) : 0;
        const parentPos: C9Position = {
          ...parent.pos,
          coverage: { isParent: true },
          // Net the coverage pair in the parent row (cost/value/pnl reflect BOTH legs).
          contracts: pairContracts,
          lastTraded: pairAvgCurCents > 0 ? `${pairAvgCurCents}¢` : "—",
          entryPriceCents: pairAvgEntryCents > 0 ? pairAvgEntryCents : undefined,
          currentPriceCents: pairAvgCurCents > 0 ? pairAvgCurCents : undefined,
          avgPrice: pairAvgEntryCents > 0 ? `${pairAvgEntryCents}¢` : "—",
          cost: fmtUsd(pairCostUsd),
          totalReturn: {
            amount: fmtUsd(Math.abs(pairPnlUsd)),
            percentage: `${Math.abs(pairPct).toFixed(0)}%`,
            isPositive: pairPnlUsd >= 0,
          },
          // A single-leg sparkline is misleading for a netted pair; hide it on the parent row.
          sparkline: [],
          children: [{ ...child.pos, coverage: { isChild: true } }],
        };
        const minIdx = Math.min(parent.idx, child.idx);
        outWithIdx.push({ idx: minIdx, pos: parentPos });
      } else {
        for (const it of group) outWithIdx.push({ idx: it.idx, pos: it.pos });
      }
    }

    outWithIdx.sort((a, b) => a.idx - b.idx);
    return outWithIdx.map((x) => x.pos);
  }, [rawPositions]);

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
    if (!getBackendJwt()) {
      setIsLoadingKeys(false);
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
      const pmAddrFull = j?.keys?.pm_wallet_addr_full || null;
      const pmOk = !!j?.keys?.pm_wallet_configured;
      setPolymarketConnection({
        isConnected: pmOk,
        maskedKey: pmMasked || (pmAddrFull ? `${pmAddrFull.slice(0, 6)}…${pmAddrFull.slice(-4)}` : undefined),
        walletAddr: pmAddrFull || undefined,
      });
      return { kalshiOk, pmOk };
    } catch (e) {
      setErrMsg((e as any)?.message || String(e));
      return null;
    } finally {
      setIsLoadingKeys(false);
    }
  }, [ready, authenticated]);

  const fetchGames = useCallback(async () => {
    if (!ready || !authenticated) return null;
    try {
      const res = await fetch("/api/c9/games-feed?sports=NBA,MLB,NHL");
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return Array.isArray(data?.games) ? data.games : null;
    } catch {
      return null;
    }
  }, [ready, authenticated]);

  const loadC9 = useCallback(async () => {
    if (!ready || !authenticated) return;
    if (!getBackendJwt()) return; // backend auth handshake in AppLayout
    const shouldBlockRender = !dashboardLoadedOnce;
    if (shouldBlockRender) setBootstrapping(true);

    const access = await loadAccess();
    if (access !== true) {
      if (shouldBlockRender) setBootstrapping(false);
      return;
    }
    await loadKeys(); // populate platform connection status before rendering

    setErrMsg(null);
    try {
      const [stats, pos, cfg, solBal, pmBal, games] = await Promise.all([
        // Lifetime P&L (per-user) from Supabase-backed c9_trades
        backendFetchJson<SniperStatsResponse>("/c9/sniper/stats?scope=all"),
        backendFetchJson<SniperPositionsResponse>("/c9/sniper/positions"),
        backendFetchJson<AgentConfigResponse>("/c9/sports/agent/config"),
        backendFetchJson<MoonPayBalanceResponse>("/moonpay/balance").catch(() => null),
        backendFetchJson<PolymarketBalanceResponse>("/c9/polymarket/balance").catch(() => null),
        fetchGames(),
      ]);

      setTotalPnl(Number(stats?.stats?.totalPnlUsd || 0));
      setPnlPct(stats?.stats?.pnlPct ?? null);

      const pu = cfg?.config?.portfolio_usd;
      setPortfolioUsd(Number.isFinite(Number(pu)) ? Number(pu) : null);
      setAgentEnabled(!!cfg?.config?.enabled);
      setAgentCfgRow(cfg?.config || null);
      setStrategyCatalog(Array.isArray(cfg?.strategyCatalog) ? cfg.strategyCatalog : []);
      setCryptoAllowed(!!cfg?.cryptoAllowed);
      setTurboAllowed(!!cfg?.turboAllowed);
      setConfigLoadedOnce(true);

      const solUsdc = Number((solBal as any)?.balance_usdc ?? NaN);
      setKalshiBalanceUsd(Number.isFinite(solUsdc) && solUsdc > 0 ? solUsdc : null);

      const jupUsd = Number((solBal as any)?.balance_jupusd ?? NaN);
      setJupUsdBalance(Number.isFinite(jupUsd) && jupUsd > 0 ? jupUsd : null);

      const pmUsd = Number((pmBal as any)?.balance_usd ?? NaN);
      setPmBalanceUsd(Number.isFinite(pmUsd) && pmUsd > 0 ? pmUsd : null);

      const raw = Array.isArray(pos?.positions) ? pos.positions : [];
      setRawPositions(raw);
      if (Array.isArray(games)) setUpcomingGames(games);
      setDashboardLoadedOnce(true);
    } catch (e) {
      setErrMsg((e as any)?.message || String(e));
      if (shouldBlockRender) setDashboardLoadedOnce(true);
    } finally {
      if (shouldBlockRender) setBootstrapping(false);
    }
  }, [ready, authenticated, dashboardLoadedOnce, loadAccess, loadKeys, fetchGames]);


  const handleSharePnlCard = () => {
    const invested =
      Number.isFinite(Number(portfolioUsd)) && Number(portfolioUsd) > 0
        ? Number(portfolioUsd)
        : openCostUsd;
    const position =
      Number.isFinite(Number(portfolioUsd)) && Number(portfolioUsd) > 0
        ? Number(portfolioUsd) + totalPnl
        : openValueUsd;
    const pct =
      pnlPct != null && Number.isFinite(Number(pnlPct))
        ? Number(pnlPct) * 100
        : invested > 0
          ? ((position - invested) / invested) * 100
          : 0;

    setShareDialogData({
      pnlAmount: totalPnl,
      pnlPercentage: pct,
      invested,
      position,
      eventId: pnlHighlightEventId,
      sport: "NBA",
      matchName: null,
      modelLabel: null,
      teamLogo: null,
      homeScore: null,
      awayScore: null,
      homeAbbr: null,
      awayAbbr: null,
      period: null,
      clock: null,
    });
    setIsShareDialogOpen(true);
  };

  const handleSharePositionPnl = (positionId: string) => {
    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;

    const cost = parseFloat(pos.cost.replace(/[$,]/g, "")) || 0;
    const returnAmount = parseFloat(pos.totalReturn.amount.replace(/[$,]/g, "")) || 0;
    const pnlAmount = pos.totalReturn.isPositive ? returnAmount : -returnAmount;
    const pnlPercentage = parseFloat(pos.totalReturn.percentage.replace("%", "")) || 0;
    const currentValue = cost + pnlAmount;

    const matchedGame = (() => {
      const candidates = upcomingGames.filter((g) => positionMatchesGame(pos, g));
      if (candidates.length <= 1) return candidates[0] || null;
      const lastMs = new Date(pos.lastTraded || "").getTime();
      const anchor = Number.isFinite(lastMs) && lastMs > 0 ? lastMs : Date.now();
      const withStart = candidates
        .map((g) => ({ g, ms: g.startTime ? new Date(g.startTime).getTime() : NaN }))
        .filter((x) => Number.isFinite(x.ms)) as Array<{ g: UpcomingGame; ms: number }>;
      if (!withStart.length)
        return candidates.find((g) => g.status === "post") || candidates.find((g) => g.status === "live") || candidates[0];
      const pool = withStart.filter((x) => x.ms <= anchor);
      const finalPool = pool.length ? pool : withStart;
      finalPool.sort((a, b) => Math.abs(anchor - a.ms) - Math.abs(anchor - b.ms));
      return finalPool[0]?.g || candidates[0];
    })();
    const side = resolvePositionSide(pos, matchedGame);
    const teamLogo =
      side === "home" ? matchedGame?.homeLogo || null
        : side === "away" ? matchedGame?.awayLogo || null
        : null;

    const score = pos.liveScore || matchedGame;
    const matchName = pos.matchName || (matchedGame ? `${matchedGame.awayAbbr} @ ${matchedGame.homeAbbr}` : null);

    setShareDialogData({
      pnlAmount,
      pnlPercentage: pos.totalReturn.isPositive ? pnlPercentage : -pnlPercentage,
      invested: cost,
      position: currentValue,
      eventId: matchedGame?.id || null,
      sport: matchedGame?.sport || "NBA",
      matchName,
      modelLabel: pos.modelLabel || null,
      teamLogo,
      homeScore: score?.homeScore ?? null,
      awayScore: score?.awayScore ?? null,
      homeAbbr: matchedGame?.homeAbbr || pos.liveScore?.homeTeam || null,
      awayAbbr: matchedGame?.awayAbbr || pos.liveScore?.awayTeam || null,
      period: pos.liveScore?.period || matchedGame?.period || null,
      clock: pos.liveScore?.clock || matchedGame?.clock || null,
    });
    setIsShareDialogOpen(true);
  };

  const handleRedeemPosition = useCallback(
    async (positionId: string) => {
      const ticker = String(positionId || "").trim();
      if (!ticker) return;
      const raw = rawPositions.find((p) => p.ticker === ticker);
      const isFinal =
        (() => {
          const s = String(raw?.liveScore?.gameStatus || "").toLowerCase();
          return s === "final" || s === "post" || s.includes("final") || s.includes("ended") || s.includes("complete");
        })();
      setErrMsg(null);
      setNoticeMsg(null);
      setRedeeming((prev) => ({ ...prev, [ticker]: true }));
      try {
        const j = await backendFetchJson<SniperRedeemResponse>("/c9/sniper/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker }),
        });
        if (!j?.ok) {
          throw new Error(j?.message || j?.error || "redeem_failed");
        }
        if (j?.sold) {
          setNoticeMsg("Sell submitted.");
        } else if (j?.redeemed) {
          setNoticeMsg("Redeemed.");
        } else if (j?.pending) {
          setNoticeMsg(`${isFinal ? "Redeem" : "Sell"} pending${j?.reason ? `: ${String(j.reason)}` : ""}`);
        } else {
          setNoticeMsg(`${isFinal ? "Redeem" : "Sell"} not available${j?.reason ? `: ${String(j.reason)}` : ""}`);
        }
        // Refresh positions after redeem (or submission)
        await loadC9();
      } catch (e) {
        setErrMsg((e as any)?.message || String(e));
      } finally {
        setRedeeming((prev) => {
          const next = { ...prev };
          delete next[ticker];
          return next;
        });
      }
    },
    [loadC9, rawPositions]
  );

  const handleActivate = useCallback(
    async (settings: ActivateSettings) => {
      setErrMsg(null);
      setLoading(true);
      try {
        // Ensure backend JWT exists; if missing/expired, re-auth on user gesture (this click).
        const ensureBackendJwt = async () => {
          // If we have a token, validate it quickly.
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
        };

        await ensureBackendJwt();

        // Max stake is configured as a % of cash balance (JupUSD for Jupiter execution).
        const maxStakePctRaw = Number(settings?.maxStake ?? NaN);
        const maxStakePct = Number.isFinite(maxStakePctRaw)
          ? Math.max(0, Math.min(100, maxStakePctRaw))
          : NaN;
        const betaStakePctRaw = Number(settings?.betaStakePct ?? NaN);
        const betaStakePct = Number.isFinite(betaStakePctRaw)
          ? Math.max(0, Math.min(100, betaStakePctRaw))
          : 25;
        const betaStakeMult = Number((betaStakePct / 100).toFixed(4));
        const maxConcurrent = Number(settings?.maxConcurrent || 3);
        const tpPct = Number(settings?.takeProfit ?? 20) / 100;
        const slPct = Number(settings?.stopLoss ?? 50) / 100;

        const modeRaw = normalizeC9Mode(settings?.mode || "turbo") || "turbo";
        const modes: C9Mode[] = (() => {
          const rawArr = Array.isArray(settings?.modes) && settings?.modes?.length ? settings.modes : [modeRaw];
          const out: C9Mode[] = [];
          const seen = new Set<string>();
          for (const x of rawArr) {
            const s = normalizeC9Mode(x);
            if (!s) continue;
            if (seen.has(s)) continue;
            seen.add(s);
            out.push(s);
          }
          const filtered = turboAllowed !== true ? out.filter((m) => m !== "turbo") : out;
          return filtered.length ? filtered : (turboAllowed !== true ? (["burst2"] as C9Mode[]) : (["turbo"] as C9Mode[]));
        })();
        const mode: C9Mode = modes.includes(modeRaw) ? modeRaw : modes[0];
        const wantPmBase = false;

        let baseUsdRaw = wantPmBase
          ? Number(pmBalanceUsd ?? NaN)
          : Number(jupUsdBalance ?? NaN);
        let baseUsd = Number.isFinite(baseUsdRaw) ? baseUsdRaw : NaN;
        if (!(Number.isFinite(maxStakePct) && maxStakePct >= 0)) {
          throw new Error("max_stake_pct_required");
        }
        // Allow 0% (stress test / disable trades). Only require balance if pct > 0.
        if (maxStakePct > 0 && !(Number.isFinite(baseUsd) && baseUsd > 0)) {
          // On first load, C9 may render before balances are fetched. Fetch on-demand here.
          try {
            if (wantPmBase) {
              const bal = await backendFetchJson<PolymarketBalanceResponse>("/c9/polymarket/balance");
              const fetchedUsd = Number((bal as any)?.balance_usd ?? NaN);
              if (Number.isFinite(fetchedUsd) && fetchedUsd > 0) {
                setPmBalanceUsd(fetchedUsd);
                baseUsd = fetchedUsd;
              }
            } else {
              const bal = await backendFetchJson<MoonPayBalanceResponse>("/moonpay/balance");
              const fetchedUsdc = Number((bal as any)?.balance_usdc ?? NaN);
              setKalshiBalanceUsd(Number.isFinite(fetchedUsdc) && fetchedUsdc > 0 ? fetchedUsdc : null);

              const fetchedJupUsd = Number((bal as any)?.balance_jupusd ?? NaN);
              setJupUsdBalance(Number.isFinite(fetchedJupUsd) && fetchedJupUsd > 0 ? fetchedJupUsd : null);
              if (Number.isFinite(fetchedJupUsd) && fetchedJupUsd > 0) baseUsd = fetchedJupUsd;
            }
          } catch {}
        }
        if (maxStakePct > 0 && !(Number.isFinite(baseUsd) && baseUsd > 0)) {
          throw new Error(wantPmBase ? "polymarket_balance_unavailable" : "jupusd_balance_unavailable");
        }
        const maxStakeUsd =
          maxStakePct <= 0
            ? 0
            : Math.max(1, Number(((baseUsd * maxStakePct) / 100).toFixed(2)));

        const executionVenue = "kalshi";
        const executionPath = "jupiter";
        const featureFlags = {
          strategyMode: mode,
          strategyModes: modes,
          turboMode: modes.includes("turbo"),
          ultraEnabled: false,
          kageEnabled: modes.includes("kage"),
          nhlKageEnabled: modes.includes("kage"),
          foulEnabled: modes.includes("foul"),
          microEnabled: modes.includes("micro"),
          burst1Enabled: modes.includes("burst1"),
          burst2Enabled: modes.includes("burst2"),
          burst3Enabled: modes.includes("burst3"),
          nhlBurst39Enabled: modes.includes("nhlburst39"),
          mlbBurst7071Enabled: modes.includes("mlbburst7071"),
          mlbBurstEnabled: modes.includes("mlbburst7071"),
          favdipEnabled: modes.includes("burst1"),
          stopLossEnabled: !!settings?.stopLossEnabled,
          selectedSports: stripDisabledSports(settings?.selectedSports || ["all"], cryptoAllowed),
          coverageEnabled: false,
          coverage: Number(settings?.coverage ?? 1.1),
          rain_buyback_pct: (() => {
            const n = Number(settings?.rainBuybackPct ?? NaN);
            if (!Number.isFinite(n)) return 0;
            return Math.max(0, Math.min(100, n));
          })(),
          beta_stake_mult: betaStakeMult,
          ui_last_platform: "kalshi",
          ui_balance_source: "kalshi",
        };

        await backendFetchJson("/c9/sports/agent/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: true,
            ...(Number.isFinite(baseUsd) && baseUsd > 0 ? { portfolioUsd: baseUsd } : {}),
            maxStakeUsd,
            maxStakePct,
            maxConcurrent,
            tpPct,
            slPct,
            executionVenue,
            executionPath,
            featureFlags,
          }),
        });

        await backendFetchJson("/c9/sniper/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maxBetUsd: maxStakeUsd }),
        });

        await loadC9();
      } catch (e) {
        const msg = (e as any)?.message || String(e);
        // Friendlier copy for common auth failures
        if (msg.includes("token-required") || msg.includes("connect_wallet_first")) {
          setErrMsg("Connect your wallet and approve the Rainmaker login signature, then try again.");
        } else if (msg.includes("jupusd_balance_unavailable")) {
          setErrMsg("Swap some USDC → JupUSD first (or wait for balances to load), then click Activate again.");
        } else if (msg.includes("polymarket_balance_unavailable")) {
          setErrMsg("Polymarket balance hasn’t loaded yet. Wait ~2 seconds and click Activate again.");
        } else {
          setErrMsg(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [loadC9, kalshiBalanceUsd, jupUsdBalance, pmBalanceUsd, ready, authenticated, walletAddress, walletsArr, cryptoAllowed, turboAllowed]
  );

  const handleStop = useCallback(async () => {
    setErrMsg(null);
    setLoading(true);
    try {
      await backendFetchJson("/c9/sniper/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadC9();
    } catch (e) {
      setErrMsg((e as any)?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [loadC9]);

  const handleSwapToJupUsd = useCallback(
    async (amountUsd: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const s = String(amountUsd || "").trim();
        const n = Number(s);
        if (!(Number.isFinite(n) && n > 0)) return { ok: false, error: "invalid_amount" };

        const usdc = Number(kalshiBalanceUsd ?? NaN);
        if (!(Number.isFinite(usdc) && usdc > 0)) return { ok: false, error: "no_usdc_balance" };
        if (n > usdc + 1e-9) return { ok: false, error: "amount_exceeds_balance" };

        const res = await backendFetchJson<{ ok?: boolean; error?: string; signature?: string; txSig?: string }>(
          "/api/swap-rain",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inputToken: "usdc", outputToken: "jupusd", amount: n.toFixed(6) }),
          }
        );
        if (res?.ok || res?.signature || res?.txSig) {
          setTimeout(() => loadC9(), 3000);
          return { ok: true };
        }
        return { ok: false, error: res?.error || "swap_failed" };
      } catch (e: any) {
        return { ok: false, error: e?.message || "swap_failed" };
      }
    },
    [kalshiBalanceUsd, loadC9]
  );

  // Auto-save settings (debounced from panel) without changing enabled state
  const handleSettingsChange = useCallback(
    async (settings: ActivateSettings) => {
      if (!ready || !authenticated) return;
      try {
        const maxStakePctRaw = Number(settings?.maxStake ?? NaN);
        const maxStakePct = Number.isFinite(maxStakePctRaw)
          ? Math.max(0, Math.min(100, maxStakePctRaw))
          : 0;
        const betaStakePctRaw = Number(settings?.betaStakePct ?? NaN);
        const betaStakePct = Number.isFinite(betaStakePctRaw)
          ? Math.max(0, Math.min(100, betaStakePctRaw))
          : 25;
        const betaStakeMult = Number((betaStakePct / 100).toFixed(4));
        const maxConcurrent = Number(settings?.maxConcurrent ?? 50);
        const tpPct = Number(settings?.takeProfit ?? 20) / 100;
        const slPct = Number(settings?.stopLoss ?? 50) / 100;
        const modeRaw = normalizeC9Mode(settings?.mode || "turbo") || "turbo";
        const modes: C9Mode[] = (() => {
          const rawArr = Array.isArray(settings?.modes) && settings?.modes?.length ? settings.modes : [modeRaw];
          const out: C9Mode[] = [];
          const seen = new Set<string>();
          for (const x of rawArr) {
            const s = normalizeC9Mode(x);
            if (!s) continue;
            if (seen.has(s)) continue;
            seen.add(s);
            out.push(s);
          }
          const filtered = turboAllowed !== true ? out.filter((m) => m !== "turbo") : out;
          return filtered.length ? filtered : (turboAllowed !== true ? (["burst2"] as C9Mode[]) : (["turbo"] as C9Mode[]));
        })();
        const mode: C9Mode = modes.includes(modeRaw) ? modeRaw : modes[0];
        const executionVenue = "kalshi";
        const executionPath = "jupiter";
        let baseUsd = Number(jupUsdBalance ?? NaN);
        if (maxStakePct > 0 && !(Number.isFinite(baseUsd) && baseUsd > 0)) {
          try {
            const bal = await backendFetchJson<MoonPayBalanceResponse>("/moonpay/balance");
            const fetchedUsdc = Number(bal?.balance_usdc ?? NaN);
            setKalshiBalanceUsd(Number.isFinite(fetchedUsdc) && fetchedUsdc > 0 ? fetchedUsdc : null);
            const fetchedJupUsd = Number(bal?.balance_jupusd ?? NaN);
            setJupUsdBalance(Number.isFinite(fetchedJupUsd) && fetchedJupUsd > 0 ? fetchedJupUsd : null);
            if (Number.isFinite(fetchedJupUsd) && fetchedJupUsd > 0) baseUsd = fetchedJupUsd;
          } catch {}
        }
        const maxStakeUsd =
          maxStakePct <= 0
            ? 0
            : Number.isFinite(baseUsd) && baseUsd > 0
              ? Math.max(1, Number(((baseUsd * maxStakePct) / 100).toFixed(2)))
              : NaN;

        const nextFeatureFlags = {
          strategyMode: mode,
          strategyModes: modes,
          turboMode: modes.includes("turbo"),
          ultraEnabled: false,
          kageEnabled: modes.includes("kage"),
          nhlKageEnabled: modes.includes("kage"),
          foulEnabled: modes.includes("foul"),
          microEnabled: modes.includes("micro"),
          burst1Enabled: modes.includes("burst1"),
          burst2Enabled: modes.includes("burst2"),
          burst3Enabled: modes.includes("burst3"),
          nhlBurst39Enabled: modes.includes("nhlburst39"),
          mlbBurst7071Enabled: modes.includes("mlbburst7071"),
          mlbBurstEnabled: modes.includes("mlbburst7071"),
          favdipEnabled: modes.includes("burst1"),
          stopLossEnabled: !!settings?.stopLossEnabled,
          selectedSports: stripDisabledSports(settings?.selectedSports || ["all"], cryptoAllowed),
          coverageEnabled: false,
          coverage: Number(settings?.coverage ?? 1.1),
          rain_buyback_pct: (() => {
            const n = Number(settings?.rainBuybackPct ?? NaN);
            if (!Number.isFinite(n)) return 0;
            return Math.max(0, Math.min(100, n));
          })(),
          beta_stake_mult: betaStakeMult,
          ui_last_platform: "kalshi",
          ui_balance_source: "kalshi",
        };

        await backendFetchJson("/c9/sports/agent/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Don't change enabled state - just save settings
            ...(Number.isFinite(baseUsd) && baseUsd > 0 ? { portfolioUsd: baseUsd } : {}),
            ...(Number.isFinite(maxStakeUsd) ? { maxStakeUsd } : {}),
            maxStakePct,
            maxConcurrent,
            tpPct,
            slPct,
            executionVenue,
            executionPath,
            featureFlags: nextFeatureFlags,
          }),
        });
        setAgentCfgRow((prev) => ({
          ...(prev || {}),
          ...(Number.isFinite(baseUsd) && baseUsd > 0 ? { portfolio_usd: baseUsd } : {}),
          ...(Number.isFinite(maxStakeUsd) ? { max_stake_usd: maxStakeUsd } : {}),
          max_concurrent: maxConcurrent,
          tp_pct: tpPct,
          sl_pct: slPct,
          execution_venue: executionVenue,
          feature_flags: {
            ...((prev?.feature_flags && typeof prev.feature_flags === "object") ? prev.feature_flags : {}),
            ...nextFeatureFlags,
          },
        }));
        // Silently saved - no need to reload or show message
      } catch {
        // Ignore auto-save errors (non-critical)
      }
    },
    [ready, authenticated, cryptoAllowed, turboAllowed, jupUsdBalance]
  );

  useEffect(() => {
    if (!ready || !authenticated) return;
    loadC9();
  }, [ready, authenticated, backendAuthed, loadC9]);

  // Refresh dashboard data every 15 seconds without replacing mounted UI.
  useEffect(() => {
    if (!ready || !authenticated) return;
    const interval = setInterval(() => {
      loadC9();
    }, 15_000);
    return () => clearInterval(interval);
  }, [ready, authenticated, loadC9]);

  // Show "Go unlock" when access is explicitly denied, or when backend auth
  // completed but the access check failed/hasn't resolved (mobile timing edge case).
  if (ready && authenticated && (hasAccess === false || (hasAccess === null && backendAuthed))) {
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

  return (
    <div className="relative flex w-full min-h-0 flex-1 flex-col gap-3 overflow-auto sm:gap-4 xl:flex-row xl:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      
      
      {/* Left Side - Dashboard Container - above video effect */}
      <div
        className="relative z-20 w-full min-w-0 flex-1 rounded-[12px] p-3 sm:rounded-[16px] sm:p-4 xl:p-6"
        style={{
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      >
        <h1 className="shrink-0 text-lg font-semibold text-white sm:text-xl xl:text-2xl">
          C9 Dashboard
        </h1>

        <div className="mt-3 shrink-0 sm:mt-4 xl:mt-5">
          <C9PnlCard
            totalPnl={totalPnl}
            pnlPct={pnlPct}
            onShareClick={handleSharePnlCard}
            backgroundVideoSrc={pnlHighlightVideoSrc}
            backgroundPosterSrc={pnlHighlightPosterSrc}
          />
        </div>

        <div className="mt-3 shrink-0 sm:mt-4">
          <C9ServiceAnnouncement />
        </div>

        {(!ready || !authenticated) && (
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-zinc-300">
            Connect your wallet (top right) to view your positions.
          </div>
        )}
        {errMsg && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            {errMsg}
          </div>
        )}
        {noticeMsg && (
          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {noticeMsg}
          </div>
        )}

        <div
          className="mt-3 min-h-0 max-h-[calc(100vh-320px)] overflow-auto rounded-lg border border-white/[0.02] sm:mt-4 sm:rounded-xl xl:mt-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{
            background: "#141416",
            boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
          }}
        >
          {!dashboardLoadedOnce && bootstrapping ? (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
              Loading…
            </div>
          ) : (
            <C9PositionsTable
              positions={positions}
              upcomingGames={upcomingGames}
              onSharePnl={handleSharePositionPnl}
              onRedeem={handleRedeemPosition}
              redeeming={redeeming}
            />
          )}
        </div>

        {/* Collapsible settings panel on mobile (hidden on xl where it's in the sidebar) */}
        <div className="mt-3 sm:mt-4 xl:hidden">
          <button
            onClick={() => setSettingsExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
            }}
          >
            <span>{agentEnabled ? "C9 Active" : "Activate C9"}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${settingsExpanded ? "rotate-180" : ""}`}
            />
          </button>
          {settingsExpanded && (
            <div className="mt-2">
              <C9SettingsPanel
                onActivate={handleActivate}
                onDeactivate={handleStop}
                onSettingsChange={handleSettingsChange}
                onSwapToJupUsd={handleSwapToJupUsd}
                active={agentEnabled}
                loading={loading}
                isLoadingConfig={!configLoadedOnce || isLoadingKeys || (loading && !agentCfgRow)}
                kalshiBalanceUsd={kalshiBalanceUsd}
                balanceUsd={portfolioUsd ?? null}
                pmBalanceUsd={pmBalanceUsd}
                jupUsdBalance={jupUsdBalance}
                kalshiConfigured={kalshiConnection.isConnected}
                pmConfigured={polymarketConnection.isConnected}
                config={agentCfgRow}
                cryptoAllowed={cryptoAllowed}
                turboAllowed={turboAllowed}
                strategyCatalog={strategyCatalog || []}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Settings Panel (desktop only; mobile is inline above) */}
      <div className="hidden shrink-0 xl:block xl:w-auto">
        <C9SettingsPanel
          onActivate={handleActivate}
          onDeactivate={handleStop}
          onSettingsChange={handleSettingsChange}
          onSwapToJupUsd={handleSwapToJupUsd}
          active={agentEnabled}
          loading={loading}
          isLoadingConfig={!configLoadedOnce || isLoadingKeys || (loading && !agentCfgRow)}
          kalshiBalanceUsd={kalshiBalanceUsd}
          balanceUsd={portfolioUsd ?? null}
          pmBalanceUsd={pmBalanceUsd}
          jupUsdBalance={jupUsdBalance}
          kalshiConfigured={kalshiConnection.isConnected}
          pmConfigured={polymarketConnection.isConnected}
          config={agentCfgRow}
          cryptoAllowed={cryptoAllowed}
          turboAllowed={turboAllowed}
          strategyCatalog={strategyCatalog || []}
        />
      </div>

      {/* Share PNL Dialog */}
      <SharePnlDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        pnlAmount={shareDialogData.pnlAmount}
        pnlPercentage={shareDialogData.pnlPercentage}
        invested={shareDialogData.invested}
        position={shareDialogData.position}
        displayName={displayName || undefined}
        profileImage={profileImage || undefined}
        autoHighlightEventId={shareDialogData.eventId}
        autoHighlightSport={shareDialogData.sport}
        matchName={shareDialogData.matchName}
        modelLabel={shareDialogData.modelLabel}
        teamLogo={shareDialogData.teamLogo}
        homeScore={shareDialogData.homeScore}
        awayScore={shareDialogData.awayScore}
        homeAbbr={shareDialogData.homeAbbr}
        awayAbbr={shareDialogData.awayAbbr}
        period={shareDialogData.period}
        clock={shareDialogData.clock}
      />
    </div>
  );
};

export default C9Page;


