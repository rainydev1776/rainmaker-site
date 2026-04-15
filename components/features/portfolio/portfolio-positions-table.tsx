"use client";

import { ChevronRight, ChevronUp, ChevronDown, Search, Shield, Loader2, X } from "lucide-react";
import Image from "next/image";
import { Fragment, useState, useEffect, useRef, useMemo } from "react";
import { SportIcon } from "@/components/ui/sport-icon";
import { ChoiceBadge } from "@/components/ui/choice-badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { backendFetchJson } from "@/lib/backend";

export interface PortfolioPosition {
  id: string;
  ticker?: string | null;
  sportCode?: string | null;
  sportIcon: string;
  sportCategory: string;
  matchName: string;
  modelLabel?: string | null;
  choice: {
    type: "yes" | "no";
    team: string;
  };
  finalPosition: string;
  settlementPayment: number;
  totalCost: number;
  totalPayout: number;
  entryPriceCents?: number | null;
  exitPriceCents?: number | null;
  exitKind?: "trade" | "settlement" | null;
  // History rows: timestamp (ms) used to display a simple date column.
  dateMs?: number | null;
  totalReturn: {
    amount: number;
    percentage: number;
    isPositive: boolean;
  };
  // Coverage-aware history rows: parent can embed a hedge child row.
  children?: PortfolioPosition[];
  coverage?: {
    isParent?: boolean;
    isChild?: boolean;
    covXUser?: number | null;
    covXEff?: number | null;
    hedgeTicker?: string | null;
  };
}

function ModelLabel({ label }: { label?: string | null }) {
  if (!label) return null;
  return <p className="text-[10px] text-[#757575]">{label}</p>;
}

function ModelPill({ label }: { label?: string | null }) {
  const text = String(label || "").trim();
  if (!text) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-medium leading-none text-zinc-400"
      title={text}
    >
      {text}
    </span>
  );
}

function FinalScoreStrip({
  game,
  side,
}: {
  game: PortfolioGame;
  side: "home" | "away" | null;
}) {
  const hasScores = game.homeScore != null && game.awayScore != null;
  if (!hasScores) return null;

  const isHome = side === "home";
  const userScore = isHome ? game.homeScore : game.awayScore;
  const oppScore = isHome ? game.awayScore : game.homeScore;
  const isWinning = userScore != null && oppScore != null && userScore > oppScore;
  const awayLabel = game.awayAbbr || game.awayShort || game.awayTeam;
  const homeLabel = game.homeAbbr || game.homeShort || game.homeTeam;
  const isFinal = game.status === "post" || String(game.statusText || "").toLowerCase().includes("final");

  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2 py-1"
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <TeamLogo
        src={game.awayLogo}
        alt={awayLabel}
        fallback={game.awayAbbr || awayLabel}
        size="sm"
      />
      <span className={`text-xs font-bold tabular-nums ${side === "away" && isWinning ? "text-[#0EE957]" : "text-zinc-300"}`}>
        {awayLabel} {game.awayScore}
      </span>
      <span className="text-[10px] text-zinc-500">–</span>
      <TeamLogo
        src={game.homeLogo}
        alt={homeLabel}
        fallback={game.homeAbbr || homeLabel}
        size="sm"
      />
      <span className={`text-xs font-bold tabular-nums ${side === "home" && isWinning ? "text-[#0EE957]" : "text-zinc-300"}`}>
        {game.homeScore} {homeLabel}
      </span>
      {isFinal && (
        <>
          <span className="text-zinc-600">·</span>
          <span className="text-[10px] text-zinc-500">Final</span>
        </>
      )}
    </div>
  );
}

export interface PortfolioGame {
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
  homeColor?: string | null;
  awayColor?: string | null;
  homeRecord?: string | null;
  awayRecord?: string | null;
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

function tickerMatchesGame(
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

interface HighlightClip {
  id: string;
  headline: string;
  description: string;
  thumbnail: string | null;
  durationSec: number;
  hlsUrl: string | null;
  mp4Url: string | null;
  webUrl: string | null;
  publishedAt: string | null;
}

interface PortfolioPositionsTableProps {
  positions: PortfolioPosition[];
  historyPositions: PortfolioPosition[];
  games?: PortfolioGame[];
  onSharePnl?: (positionId: string) => void;
  highlightedId?: string | null;
  defaultTab?: "positions" | "history";
}

type SortField =
  | "market"
  | "date"
  | "finalPosition"
  | "settlementPayment"
  | "entryPrice"
  | "exitPrice"
  | "totalCost"
  | "totalPayout"
  | "totalReturn";

type SortDirection = "asc" | "desc";

const TableHeader = ({
  label,
  field,
  sortable = true,
  align = "left",
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  sortable?: boolean;
  align?: "left" | "right";
  currentSort: SortField | null;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) => {
  const isActive = currentSort === field;

  return (
    <th
      className={`px-3 py-3 text-xs font-normal whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      } ${sortable ? "cursor-pointer select-none hover:text-zinc-300" : ""} ${
        isActive ? "text-cyan-500" : "text-[#757575]"
      }`}
      onClick={() => sortable && onSort(field)}
    >
      <div
        className={`flex items-center gap-1 text-[#757575] font-medium ${
          align === "right" ? "justify-end" : ""
        }`}
      >
        {label}
        {sortable && (
          <div className="flex flex-col">
            <ChevronUp
              className={`h-3 w-3 -mb-1 transition-colors duration-200 ease-out font-medium ${
                isActive && currentDirection === "asc"
                  ? "text-[#0EA5E9]"
                  : "text-[#757575]"
              }`}
            />
            <ChevronDown
              className={`h-3 w-3 transition-colors duration-200 ease-out font-medium ${
                isActive && currentDirection === "desc"
                  ? "text-[#0EA5E9]"
                  : "text-[#757575]"
              }`}
            />
          </div>
        )}
      </div>
    </th>
  );
};


const EmptyState = () => (
  <div className="flex flex-1 flex-col items-center justify-center py-12">
    <Image
      src="/empty-state.svg"
      alt="No trades"
      width={120}
      height={120}
      className="opacity-50"
    />
    <p className="mt-4 text-sm text-[#757575]">No trades yet</p>
    <p className="mt-1 text-xs text-[#757575]">
      Your completed trades will appear here
    </p>
  </div>
);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const formatCents = (cents: number | null | undefined): string => {
  if (cents == null) return "—";
  const c = Number(cents);
  // Allow 0¢ exits for settled losers.
  if (!(Number.isFinite(c) && c >= 0)) return "—";
  return `${Math.round(c)}¢`;
};

const formatShortDate = (dateMs: number | null | undefined): string => {
  const ms = Number(dateMs ?? NaN);
  if (!(Number.isFinite(ms) && ms > 0)) return "—";
  try {
    return new Date(ms).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  } catch {
    return "—";
  }
};

function CoverageIcon() {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md p-1"
      style={{
        background: "rgba(14, 233, 87, 0.15)",
      }}
      title="Coverage enabled"
    >
      <Shield className="h-3.5 w-3.5 text-[#0EE957]" />
    </span>
  );
}

function SettlementBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-zinc-300"
      style={{ background: "rgba(255, 255, 255, 0.06)" }}
      title="Closed at settlement (no market sell)"
    >
      Settled
    </span>
  );
}

function TeamLogo({
  src,
  alt,
  fallback,
  size = "md",
}: {
  src: string | null;
  alt: string;
  fallback: string;
  size?: "sm" | "md";
}) {
  const [hasError, setHasError] = useState(false);
  const fallbackText = (fallback || alt || "?").slice(0, 3).toUpperCase();
  const isSmall = size === "sm";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-[#121214] font-semibold text-zinc-400 ${
        isSmall ? "h-5 w-5 text-[8px]" : "h-10 w-10 text-[10px]"
      }`}
      title={alt}
    >
      {src && !hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={isSmall ? "20px" : "40px"}
          className={`object-contain ${isSmall ? "p-0.5" : "p-1"}`}
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{fallbackText}</span>
      )}
    </div>
  );
}

function supportsHighlightDialogSport(sport: string | null | undefined): boolean {
  const s = String(sport || "").toUpperCase();
  return s === "NBA" || s === "NHL" || s === "MLB";
}

function supportsGameOddsSport(sport: string | null | undefined): boolean {
  const s = String(sport || "").toUpperCase();
  return s === "NBA" || s === "NHL" || s === "MLB";
}

function OddsBar({
  label,
  logo,
  fallback,
  pct,
  color,
  record,
}: {
  label: string;
  logo: string | null;
  fallback: string;
  pct: number;
  color: string;
  record?: string | null;
}) {
  const width = Math.max(2, Math.min(100, pct));
  return (
    <div className="flex items-center gap-2">
      <TeamLogo src={logo} alt={label} fallback={fallback} size="sm" />
      <div className="w-9 shrink-0">
        <span className="block truncate text-[11px] font-medium leading-tight text-zinc-400">{fallback || label}</span>
        {record ? <span className="block text-[8px] leading-tight text-zinc-600">{record}</span> : null}
      </div>
      <div className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-[11px] font-semibold" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function GameOddsBars({
  game,
  homeCents,
  awayCents,
}: {
  game: PortfolioGame;
  homeCents: number | null;
  awayCents: number | null;
}) {
  if (homeCents == null && awayCents == null) return null;
  const home = homeCents == null && awayCents != null ? Math.max(0, 100 - awayCents) : homeCents;
  const away = awayCents == null && homeCents != null ? Math.max(0, 100 - homeCents) : awayCents;
  if (home == null || away == null) return null;

  return (
    <div className="space-y-1.5">
      <OddsBar
        label={game.awayShort || game.awayAbbr || game.awayTeam}
        logo={game.awayLogo}
        fallback={game.awayAbbr || game.awayTeam}
        pct={away}
        color={game.awayColor || "#a1a1aa"}
        record={game.awayRecord}
      />
      <OddsBar
        label={game.homeShort || game.homeAbbr || game.homeTeam}
        logo={game.homeLogo}
        fallback={game.homeAbbr || game.homeTeam}
        pct={home}
        color={game.homeColor || "#0EE957"}
        record={game.homeRecord}
      />
    </div>
  );
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

function positionMatchesGame(position: PortfolioPosition, game: PortfolioGame): boolean {
  const positionSport = normalizeSportCode(position.sportCode);
  const gameSport = normalizeSportCode(game.sport);
  if (positionSport && gameSport && positionSport !== gameSport) return false;

  const parsedTicker = tickerMatchesGame(position, game);
  if (parsedTicker) return true;
  if (parseKalshiTicker(position.ticker)) return false;

  const texts = [
    normalizeGameText(position.matchName),
    normalizeGameText(`${position.choice?.team || ""} @ ${position.matchName || ""}`),
    normalizeGameText(String(position.choice?.team || "")),
  ].filter(Boolean);
  if (!texts.length) return false;
  const homeTokens = gameSideTokens(game, "home");
  const awayTokens = gameSideTokens(game, "away");
  return texts.some(
    (text) =>
      homeTokens.some((token) => text.includes(token)) &&
      awayTokens.some((token) => text.includes(token))
  );
}

function resolvePositionSide(position: PortfolioPosition, game: PortfolioGame | null): "home" | "away" | null {
  if (!game) return null;
  const parsedTicker = tickerMatchesGame(position, game);
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

function pickBestMatchedGame(position: PortfolioPosition, games: PortfolioGame[]): PortfolioGame | null {
  const candidates = games.filter((g) => positionMatchesGame(position, g));
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

  // History rows have a timestamp; avoid matching to a future rematch.
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

function formatHighlightDuration(durationSec: number): string {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "";
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function InlineHighlightPlayer({ clip }: { clip: HighlightClip }) {
  const [preferHls, setPreferHls] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const video = document.createElement("video");
    const canPlayHls = video.canPlayType("application/vnd.apple.mpegurl");
    setPreferHls(Boolean(canPlayHls));
  }, []);

  const src = (preferHls ? clip.hlsUrl : null) || clip.mp4Url || clip.hlsUrl || null;

  if (!src) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-zinc-400">
        This highlight is available on ESPN only.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{clip.headline}</p>
          {clip.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{clip.description}</p>
          ) : null}
        </div>
        {clip.durationSec > 0 ? (
          <span className="shrink-0 rounded-md bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-zinc-400">
            {formatHighlightDuration(clip.durationSec)}
          </span>
        ) : null}
      </div>

      <video
        key={src}
        controls
        playsInline
        preload="metadata"
        poster={clip.thumbnail || undefined}
        className="w-full rounded-lg bg-black"
        src={src}
      />

      {clip.webUrl ? (
        <div className="mt-2 flex justify-end">
          <a
            href={clip.webUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-[#0EA5E9] transition-colors hover:text-[#38BDF8]"
          >
            Open on ESPN
          </a>
        </div>
      ) : null}
    </div>
  );
}

function HighlightPanel({
  clip,
  loading,
  error,
}: {
  clip: HighlightClip | null | undefined;
  loading: boolean;
  error: string | null | undefined;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-zinc-400">
        Loading latest highlight…
      </div>
    );
  }

  if (clip) return <InlineHighlightPlayer clip={clip} />;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-zinc-400">
      {error || "No highlight available for this game yet."}
    </div>
  );
}

export const PortfolioPositionsTable = ({
  positions,
  historyPositions,
  games = [],
  onSharePnl,
  highlightedId,
  defaultTab = "history",
}: PortfolioPositionsTableProps) => {
  const [activeTab, setActiveTab] = useState<"positions" | "history">(
    defaultTab
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [flashingId, setFlashingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const highlightedRef = useRef<HTMLTableRowElement>(null);
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
  const [highlightDialogGame, setHighlightDialogGame] = useState<PortfolioGame | null>(null);
  const [highlightByGameId, setHighlightByGameId] = useState<Record<string, HighlightClip | null>>({});
  const [highlightLoadingByGameId, setHighlightLoadingByGameId] = useState<Record<string, boolean>>({});
  const [highlightErrorByGameId, setHighlightErrorByGameId] = useState<Record<string, string | null>>({});
  const [marketOddsByGameId, setMarketOddsByGameId] = useState<
    Record<string, { homeCents: number | null; awayCents: number | null } | null>
  >({});
  const [marketOddsLoadingByGameId, setMarketOddsLoadingByGameId] = useState<Record<string, boolean>>({});
  const [marketOddsErrorByGameId, setMarketOddsErrorByGameId] = useState<Record<string, string | null>>({});
  const [marketOddsAuthBlocked, setMarketOddsAuthBlocked] = useState(false);
  const marketOddsInFlightRef = useRef<Set<string>>(new Set());

  // Sync activeTab with defaultTab when it changes (from URL params)
  useEffect(() => {
    setActiveTab(defaultTab);
    setExpandedIds({});
  }, [defaultTab]);

  useEffect(() => {
    if (highlightedId) {
      setFlashingId(highlightedId);
      const scrollTimer = setTimeout(() => {
        highlightedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
      const flashTimer = setTimeout(() => {
        setFlashingId(null);
      }, 2000);
      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(flashTimer);
      };
    }
  }, [highlightedId]);

  const matchedGameByPositionId = useMemo(() => {
    const matches = new Map<string, PortfolioGame | null>();
    for (const position of historyPositions) {
      const matched = pickBestMatchedGame(position, games);
      matches.set(position.id, matched);
    }
    return matches;
  }, [historyPositions, games]);

  const loadGameMarketOdds = async (game: PortfolioGame) => {
    if (!game?.id || !supportsGameOddsSport(game.sport)) return;
    if (marketOddsAuthBlocked) return;
    if (marketOddsInFlightRef.current.has(game.id)) return;
    marketOddsInFlightRef.current.add(game.id);

    setMarketOddsLoadingByGameId((prev) => ({ ...prev, [game.id]: true }));
    setMarketOddsErrorByGameId((prev) => ({ ...prev, [game.id]: null }));

    try {
      const params = new URLSearchParams({
        sport: game.sport,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        status: game.status || "",
      });
      if (game.startTime) params.set("startTime", game.startTime);
      if (game.id) params.set("eventId", game.id);
      const data = await backendFetchJson<{
        ok: boolean;
        odds: { homeCents?: number | null; awayCents?: number | null } | null;
        message?: string;
      }>(`/c9/game-market-odds?${params.toString()}`);
      const odds = data?.odds || null;
      setMarketOddsByGameId((prev) => ({
        ...prev,
        [game.id]: odds ? { homeCents: odds.homeCents ?? null, awayCents: odds.awayCents ?? null } : null,
      }));
      if (!odds) {
        setMarketOddsErrorByGameId((prev) => ({
          ...prev,
          [game.id]: data?.message || "No Kalshi odds available for this game yet.",
        }));
      }
    } catch (error) {
      setMarketOddsByGameId((prev) => ({ ...prev, [game.id]: null }));
      const rawMsg = (error as Error)?.message || "";
      if (rawMsg.includes("backend_fetch_failed:401:")) {
        setMarketOddsAuthBlocked(true);
        setMarketOddsErrorByGameId((prev) => ({
          ...prev,
          [game.id]: "Unauthorized (backend auth missing). Reconnect wallet and refresh.",
        }));
      } else {
        setMarketOddsErrorByGameId((prev) => ({
          ...prev,
          [game.id]: rawMsg || "Failed to load Kalshi odds",
        }));
      }
    } finally {
      marketOddsInFlightRef.current.delete(game.id);
      setMarketOddsLoadingByGameId((prev) => ({ ...prev, [game.id]: false }));
    }
  };

  const openHighlights = async (game: PortfolioGame | null) => {
    if (!game || !supportsHighlightDialogSport(game.sport) || !game.id) return;

    setHighlightDialogGame(game);
    setHighlightDialogOpen(true);

    if (
      Object.prototype.hasOwnProperty.call(highlightByGameId, game.id) ||
      highlightLoadingByGameId[game.id]
    ) {
      void loadGameMarketOdds(game);
      return;
    }

    setHighlightLoadingByGameId((prev) => ({ ...prev, [game.id]: true }));
    setHighlightErrorByGameId((prev) => ({ ...prev, [game.id]: null }));

    try {
      const res = await fetch(`/api/c9/highlights?sport=${encodeURIComponent(game.sport)}&eventId=${encodeURIComponent(game.id)}`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load highlight");
      }

      setHighlightByGameId((prev) => ({
        ...prev,
        [game.id]: data?.highlight || null,
      }));

      if (!data?.highlight) {
        setHighlightErrorByGameId((prev) => ({
          ...prev,
          [game.id]: data?.message || "No highlight available for this game yet.",
        }));
      }
    } catch (error) {
      setHighlightByGameId((prev) => ({ ...prev, [game.id]: null }));
      setHighlightErrorByGameId((prev) => ({
        ...prev,
        [game.id]: (error as Error).message || "Failed to load highlight",
      }));
    } finally {
      setHighlightLoadingByGameId((prev) => ({ ...prev, [game.id]: false }));
    }
    void loadGameMarketOdds(game);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const currentPositions = historyPositions;

  const filteredPositions = useMemo(() => {
    let result = currentPositions.filter(
      (position) =>
        position.matchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        position.sportCategory
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        position.choice.team.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply sorting
    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case "market":
            comparison = a.matchName.localeCompare(b.matchName);
            break;
          case "date":
            comparison = Number(a.dateMs ?? 0) - Number(b.dateMs ?? 0);
            break;
          case "finalPosition":
            comparison = a.finalPosition.localeCompare(b.finalPosition);
            break;
          case "settlementPayment":
            comparison = a.settlementPayment - b.settlementPayment;
            break;
          case "entryPrice":
            comparison = Number(a.entryPriceCents ?? 0) - Number(b.entryPriceCents ?? 0);
            break;
          case "exitPrice":
            comparison = Number(a.exitPriceCents ?? 0) - Number(b.exitPriceCents ?? 0);
            break;
          case "totalCost":
            comparison = a.totalCost - b.totalCost;
            break;
          case "totalPayout":
            comparison = a.totalPayout - b.totalPayout;
            break;
          case "totalReturn": {
            const aReturn =
              a.totalReturn.amount * (a.totalReturn.isPositive ? 1 : -1);
            const bReturn =
              b.totalReturn.amount * (b.totalReturn.isPositive ? 1 : -1);
            comparison = aReturn - bReturn;
            break;
          }
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [currentPositions, searchQuery, sortField, sortDirection]);

  const showEmptyState = filteredPositions.length === 0;
  const activeHighlightClip = highlightDialogGame ? highlightByGameId[highlightDialogGame.id] : null;
  const activeHighlightLoading = highlightDialogGame ? !!highlightLoadingByGameId[highlightDialogGame.id] : false;
  const activeHighlightError = highlightDialogGame ? highlightErrorByGameId[highlightDialogGame.id] : null;
  const activeOdds = highlightDialogGame ? marketOddsByGameId[highlightDialogGame.id] : null;
  const activeOddsLoading = highlightDialogGame ? !!marketOddsLoadingByGameId[highlightDialogGame.id] : false;
  const activeOddsError = highlightDialogGame ? marketOddsErrorByGameId[highlightDialogGame.id] : null;

  return (
    <div
      className={`flex max-h-full flex-col ${
        showEmptyState ? "h-full" : ""
      }`}
    >
      {/* Header Row */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Trade History</span>
          <span className="text-xs text-[#757575]">({historyPositions.length} trades)</span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#757575]" />
          <input
            type="text"
            placeholder="Search markets"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-[180px] rounded-full pl-9 pr-4 text-sm text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-cyan-500/50"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
            }}
          />
        </div>
      </div>

      {/* Table Container */}
      <div
        className={`min-h-0 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
          showEmptyState ? "flex flex-1 flex-col" : ""
        }`}
      >
        {showEmptyState ? (
          <EmptyState />
        ) : (
          <>
          {/* Mobile Card Layout */}
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {filteredPositions.length === 0 ? (
              <p className="py-12 text-center text-[#757575] text-sm">No results found</p>
            ) : (
              filteredPositions.map((position) => {
                const isHighlighted = flashingId === position.id;
                const children = Array.isArray(position.children) ? position.children : [];
                const hasChildren = children.length > 0;
                const isExpanded = hasChildren && !!expandedIds[position.id];
                const matchedGame = matchedGameByPositionId.get(position.id) || null;
                const positionSide = resolvePositionSide(position, matchedGame);
                const positionLogo =
                  positionSide === "home"
                    ? matchedGame?.homeLogo || null
                    : positionSide === "away"
                      ? matchedGame?.awayLogo || null
                      : null;
                const canShowHighlights = supportsHighlightDialogSport(matchedGame?.sport) && Boolean(matchedGame?.id);
                const highlightLoading = matchedGame ? !!highlightLoadingByGameId[matchedGame.id] : false;
                return (
                  <div key={position.id}>
                    <div
                      ref={highlightedId === position.id ? highlightedRef : null}
                      onClick={() => { if (hasChildren) setExpandedIds((prev) => ({ ...prev, [position.id]: !prev[position.id] })); }}
                      className={`rounded-xl p-3 transition-all ${isHighlighted ? "ring-1 ring-inset ring-cyan-500/30" : ""} ${hasChildren ? "cursor-pointer" : ""}`}
                      style={{ background: isHighlighted ? "rgba(14, 165, 233, 0.06)" : "rgba(255,255,255,0.02)", boxShadow: "0 1px 0 0 rgba(255,255,255,0.06) inset" }}
                    >
                      <div className="flex items-center gap-3">
                        {positionLogo && matchedGame ? (
                          <TeamLogo
                            src={positionLogo}
                            alt={position.choice.team}
                            fallback={
                              positionSide === "home"
                                ? matchedGame.homeAbbr || matchedGame.homeShort || matchedGame.homeTeam
                                : matchedGame.awayAbbr || matchedGame.awayShort || matchedGame.awayTeam
                            }
                          />
                        ) : (
                          <SportIcon src={position.sportIcon} alt={position.sportCategory} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-[#757575]">{position.sportCategory}</span>
                            {String(position.exitKind || "") === "settlement" && <SettlementBadge />}
                            {hasChildren && <CoverageIcon />}
                          </div>
                          <ModelLabel label={position.modelLabel} />
                          <div className="mt-0.5"><ChoiceBadge type={position.choice.type} team={position.choice.team} /></div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-sm font-medium ${position.totalReturn.isPositive ? "text-[#0EE957]" : "text-[#FF0066]"}`}>
                            {position.totalReturn.isPositive ? "+" : "-"}{formatCurrency(Math.abs(position.totalReturn.amount))}
                          </span>
                          <p className={`text-[10px] ${position.totalReturn.isPositive ? "text-[#0EE957]/70" : "text-[#FF0066]/70"}`}>
                            {position.totalReturn.percentage}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
                        <div><span className="text-[#757575]">Date</span><p className="text-zinc-300">{formatShortDate(position.dateMs)}</p></div>
                        <div><span className="text-[#757575]">Entry</span><p className="text-zinc-300">{formatCents(position.entryPriceCents ?? null)}</p></div>
                        <div><span className="text-[#757575]">Exit</span><p className="text-zinc-300">{formatCents(position.exitPriceCents ?? null)}</p></div>
                        <div><span className="text-[#757575]">Cost</span><p className="text-zinc-300">{formatCurrency(position.totalCost)}</p></div>
                      </div>
                      {matchedGame && matchedGame.homeScore != null && matchedGame.awayScore != null ? (
                        <div className="mt-2">
                          <FinalScoreStrip game={matchedGame} side={positionSide} />
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center justify-end">
                        <div className="flex items-center gap-1.5">
                          {canShowHighlights && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void openHighlights(matchedGame);
                              }}
                              disabled={highlightLoading}
                              className="rounded-md px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
                              style={{ background: "rgba(255,255,255,0.04)" }}
                            >
                              {highlightLoading ? "Loading…" : "Highlights"}
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); onSharePnl?.(position.id); }} className="rounded-md px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:text-white" style={{ background: "rgba(255,255,255,0.04)" }}>Share</button>
                        </div>
                      </div>
                    </div>
                    {hasChildren && isExpanded && children.map((c) => (
                      <div key={c.id} className="ml-6 mt-1 rounded-lg px-3 py-2" style={{ background: "linear-gradient(0deg, rgba(14, 233, 87, 0.02) 0%, rgba(14, 233, 87, 0.04) 100%)" }}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3 text-[#0EE957]" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-zinc-300 flex-1 truncate block">{c.choice?.team || c.matchName}</span>
                            <ModelLabel label={c.modelLabel} />
                          </div>
                          <span className={`text-xs font-medium ${c.totalReturn.isPositive ? "text-[#0EE957]" : "text-[#FF0066]"}`}>
                            {c.totalReturn.isPositive ? "+" : "-"}{formatCurrency(Math.abs(c.totalReturn.amount))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10" style={{ background: "#141416", boxShadow: "inset 0 -1px 0 0 #FFFFFF05, 0 1px 0 0 #2A2A2A" }}>
                <tr>
                  <TableHeader label="Market" field="market" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <TableHeader label="Date" field="date" align="right" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <TableHeader label="Qty" field="finalPosition" align="right" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <TableHeader label="Entry" field="entryPrice" align="right" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <TableHeader label="Exit" field="exitPrice" align="right" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <TableHeader label="Cost" field="totalCost" align="right" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <TableHeader label="Return" field="totalReturn" align="right" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {filteredPositions.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-[#757575]">No results found</td></tr>
                ) : (
                  filteredPositions.map((position, index) => {
                    const isHighlighted = flashingId === position.id;
                    const isLast = index === filteredPositions.length - 1;
                    const borderClass = isLast ? "" : "border-b border-[#2A2A2A]";
                    const children = Array.isArray(position.children) ? position.children : [];
                    const hasChildren = children.length > 0;
                    const isExpanded = hasChildren && !!expandedIds[position.id];
                    const matchedGame = matchedGameByPositionId.get(position.id) || null;
                    const positionSide = resolvePositionSide(position, matchedGame);
                    const positionLogo =
                      positionSide === "home"
                        ? matchedGame?.homeLogo || null
                        : positionSide === "away"
                          ? matchedGame?.awayLogo || null
                          : null;
                    const canShowHighlights = supportsHighlightDialogSport(matchedGame?.sport) && Boolean(matchedGame?.id);
                    const highlightLoading = matchedGame ? !!highlightLoadingByGameId[matchedGame.id] : false;
                    return (
                      <Fragment key={position.id}>
                        <tr
                          ref={highlightedId === position.id ? highlightedRef : null}
                          className={`transition-all duration-500 ${isHighlighted ? "bg-cyan-500/10 ring-1 ring-inset ring-cyan-500/30" : ""} ${hasChildren ? "cursor-pointer" : ""}`}
                          onClick={() => { if (!hasChildren) return; setExpandedIds((prev) => ({ ...prev, [position.id]: !prev[position.id] })); }}
                        >
                          <td className={`px-3 py-3 ${borderClass}`}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-3">
                                {positionLogo && matchedGame ? (
                                  <TeamLogo
                                    src={positionLogo}
                                    alt={position.choice.team}
                                    fallback={
                                      positionSide === "home"
                                        ? matchedGame.homeAbbr || matchedGame.homeShort || matchedGame.homeTeam
                                        : matchedGame.awayAbbr || matchedGame.awayShort || matchedGame.awayTeam
                                    }
                                  />
                                ) : (
                                  <SportIcon src={position.sportIcon} alt={position.sportCategory} />
                                )}
                                <div className="min-w-0 flex items-center gap-2">
                                  {matchedGame && matchedGame.homeScore != null && matchedGame.awayScore != null ? (
                                    <FinalScoreStrip game={matchedGame} side={positionSide} />
                                  ) : (
                                    <p className="min-w-0 truncate text-sm font-medium text-white">
                                      {position.choice.team}
                                    </p>
                                  )}
                                  {String(position.exitKind || "") === "settlement" && <SettlementBadge />}
                                  {hasChildren && (
                                    <>
                                      <CoverageIcon />
                                      <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedIds((prev) => ({ ...prev, [position.id]: !prev[position.id] })); }} className="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 transition-colors hover:text-white" aria-label={isExpanded ? "Collapse" : "Expand"}>
                                        <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="pl-[52px] flex items-center gap-0">
                                <p className="w-[160px] shrink-0 truncate text-xs text-[#757575]">
                                  {position.matchName}
                                </p>
                                <ModelPill label={position.modelLabel} />
                              </div>
                            </div>
                          </td>
                          <td className={`px-3 py-3 text-right text-xs text-[#757575] whitespace-nowrap ${borderClass}`}>{formatShortDate(position.dateMs)}</td>
                          <td className={`px-3 py-3 text-right text-sm text-zinc-300 ${borderClass}`}>{position.finalPosition}</td>
                          <td className={`px-3 py-3 text-right text-sm text-zinc-300 ${borderClass}`}>{formatCents(position.entryPriceCents ?? null)}</td>
                          <td className={`px-3 py-3 text-right text-sm text-zinc-300 ${borderClass}`}>{formatCents(position.exitPriceCents ?? null)}</td>
                          <td className={`px-3 py-3 text-right text-sm text-zinc-300 ${borderClass}`}>{formatCurrency(position.totalCost)}</td>
                          <td className={`px-3 py-3 text-right ${borderClass}`}>
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-baseline justify-end gap-2">
                                <span className={`whitespace-nowrap text-xs font-medium ${position.totalReturn.isPositive ? "text-[#0EE957]" : "text-[#FF0066]"}`}>
                                  {position.totalReturn.isPositive ? "+" : "-"}{formatCurrency(Math.abs(position.totalReturn.amount))}
                                </span>
                                <span className={`whitespace-nowrap text-[10px] ${position.totalReturn.isPositive ? "text-[#0EE957]/70" : "text-[#FF0066]/70"}`}>
                                  {position.totalReturn.percentage}%
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {canShowHighlights && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void openHighlights(matchedGame);
                                    }}
                                    disabled={highlightLoading}
                                    className="rounded-md px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
                                    style={{ background: "rgba(255, 255, 255, 0.04)" }}
                                  >
                                    {highlightLoading ? "Loading…" : "Highlights"}
                                  </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); onSharePnl?.(position.id); }} className="rounded-md px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:text-white" style={{ background: "rgba(255, 255, 255, 0.04)" }}>Share</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {hasChildren && isExpanded && children.map((c) => (
                          <tr key={c.id} className="transition-all duration-300" style={{ background: "linear-gradient(0deg, rgba(14, 233, 87, 0.02) 0%, rgba(14, 233, 87, 0.04) 100%)" }}>
                            <td className={`px-3 py-2 ${borderClass}`}>
                              <div className="flex items-center gap-3 pl-[52px]">
                                <Shield className="h-3.5 w-3.5 text-[#0EE957]" />
                                <div>
                                  <span className="text-xs text-zinc-300 block">{c.choice?.team || c.matchName}</span>
                                  <ModelLabel label={c.modelLabel} />
                                </div>
                                {String(c.exitKind || "") === "settlement" && <SettlementBadge />}
                              </div>
                            </td>
                            <td className={`px-3 py-2 text-right text-[10px] text-[#757575] whitespace-nowrap ${borderClass}`}>{formatShortDate(c.dateMs)}</td>
                            <td className={`px-3 py-2 text-right text-xs text-zinc-400 ${borderClass}`}>{c.finalPosition}</td>
                            <td className={`px-3 py-2 text-right text-xs text-zinc-400 ${borderClass}`}>{formatCents(c.entryPriceCents ?? null)}</td>
                            <td className={`px-3 py-2 text-right text-xs text-zinc-400 ${borderClass}`}>{formatCents(c.exitPriceCents ?? null)}</td>
                            <td className={`px-3 py-2 text-right text-xs text-zinc-400 ${borderClass}`}>{formatCurrency(c.totalCost)}</td>
                            <td className={`px-3 py-2 text-right ${borderClass}`}>
                              <span className={`text-xs font-medium ${c.totalReturn.isPositive ? "text-[#0EE957]" : "text-[#FF0066]"}`}>
                                {c.totalReturn.isPositive ? "+" : "-"}{formatCurrency(Math.abs(c.totalReturn.amount))} ({c.totalReturn.percentage}%)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <Dialog open={highlightDialogOpen} onOpenChange={setHighlightDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-3xl overflow-hidden border-[#1A1A1A] bg-[#0D0D0F] p-0"
        >
          <div
            style={{
              background:
                "linear-gradient(0deg, rgba(255,255,255,0) 34.52%, rgba(255,255,255,0.02) 100%), #0D0D0F",
              boxShadow: "0 1px 0 0 rgba(255,255,255,0.10) inset",
            }}
          >
            <div className="flex items-start justify-between border-b border-[#1a1a1a] px-4 py-3">
              <div className="min-w-0">
                <DialogTitle className="text-sm font-medium text-white">
                  Highlights
                </DialogTitle>
                {highlightDialogGame ? (
                  <p className="mt-1 truncate text-xs text-[#757575]">
                    {highlightDialogGame.awayShort || highlightDialogGame.awayAbbr || highlightDialogGame.awayTeam} @ {highlightDialogGame.homeShort || highlightDialogGame.homeAbbr || highlightDialogGame.homeTeam}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setHighlightDialogOpen(false)}
                className="rounded-md p-1 text-zinc-500 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              {activeHighlightLoading ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              ) : (
                <HighlightPanel
                  clip={activeHighlightClip}
                  loading={false}
                  error={activeHighlightError}
                />
              )}

              {highlightDialogGame ? (
                <div className="mt-4">
                  {activeOdds ? (
                    <GameOddsBars
                      game={highlightDialogGame}
                      homeCents={activeOdds.homeCents}
                      awayCents={activeOdds.awayCents}
                    />
                  ) : activeOddsLoading ? (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-zinc-400">
                      Loading Kalshi odds…
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-zinc-400">
                      {activeOddsError || "No Kalshi odds available for this game yet."}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
