"use client";

import { ChevronDown, ChevronUp, Filter, Shield, X } from "lucide-react";
import Image from "next/image";
import { Fragment, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { C9PriceSparkline, type C9PricePoint } from "./c9-price-sparkline";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { backendFetchJson } from "@/lib/backend";

export interface LiveScore {
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  period: string | null;
  clock: string | null;
  gameStatus: string | null;
}

export interface C9Position {
  id: string;
  sportIcon: string;
  sportCategory: string;
  matchName: string;
  modelLabel?: string | null;
  side?: 'home' | 'away' | null;
  choice: {
    type: "yes" | "no";
    team: string;
  };
  children?: C9Position[];
  coverage?: {
    isParent?: boolean;
    isChild?: boolean;
  };
  lastTraded: string;
  entryPriceCents?: number;
  currentPriceCents?: number;
  sparkline?: C9PricePoint[];
  contracts: number;
  avgPrice: string;
  cost: string;
  totalReturn: {
    amount: string;
    percentage: string;
    isPositive: boolean;
  };
  liveScore?: LiveScore | null;
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

export interface UpcomingGame {
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
  homeScore: number | null;
  awayScore: number | null;
  period: string | null;
  clock: string | null;
  statusText: string | null;
  status: "pre" | "live" | "post";
  startTime: string | null;
  pulseLabel: string | null;
  pulseText: string | null;
  homeWinProb: number | null;
  awayWinProb: number | null;
  homeColor: string | null;
  awayColor: string | null;
  homeRecord: string | null;
  awayRecord: string | null;
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

interface RecentPlay {
  id: string;
  label: string;
  text: string;
  clock: string | null;
  period: string | null;
  wallclock: string | null;
  awayScore: number | null;
  homeScore: number | null;
  scoringPlay: boolean;
}


interface C9PositionsTableProps {
  positions: C9Position[];
  upcomingGames?: UpcomingGame[];
  onSharePnl?: (positionId: string) => void;
  onRedeem?: (positionId: string) => void;
  redeeming?: Record<string, boolean>;
}

type SortField =
  | "sport"
  | "market"
  | "lastTraded"
  | "contracts"
  | "avgPrice"
  | "cost"
  | "totalReturn";

type SortDirection = "asc" | "desc";

const TableHeader = ({
  label,
  field,
  sortable = true,
  align = "left",
  pad = "normal",
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  sortable?: boolean;
  align?: "left" | "right";
  pad?: "normal" | "compact";
  currentSort: SortField | null;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) => {
  const isActive = currentSort === field;
  const padX = pad === "compact" ? "px-2" : "px-3";

  return (
    <th
      className={`${padX} py-3 text-xs font-normal whitespace-nowrap ${
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

const SportIcon = ({ src, alt }: { src: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);

  const sportTileStyle = useMemo(
    () => ({
      background:
        "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.05) 100%), rgba(255, 255, 255, 0.05)",
      boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
    }),
    []
  );

  // Handle emoji icons (e.g., "emoji:🏀")
  if (src.startsWith("emoji:")) {
    const emoji = src.replace("emoji:", "");
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
        style={sportTileStyle}
        aria-label={alt}
      >
        {emoji}
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
        style={sportTileStyle}
      >
        🏈
      </div>
    );
  }

  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

// Live score display (Dynamic Island style)
const LiveScoreDisplay = ({
  liveScore,
  side,
  game,
}: {
  liveScore: LiveScore | null | undefined;
  side?: "home" | "away" | null;
  game?: UpcomingGame | null;
}) => {
  if (!liveScore) return null;
  
  const { homeTeam, awayTeam, homeScore, awayScore, period, clock } = liveScore;
  const hasScores = homeScore !== null && awayScore !== null;
  
  if (!hasScores && !period) return null;
  
  // Format period display (NBA quarters + NHL periods)
  const formatPeriod = () => {
    if (!period) return '';
    const p = String(period).toUpperCase();
    // NBA quarters
    if (p === '1' || p === 'Q1') return 'Q1';
    if (p === '2' || p === 'Q2') return 'Q2';
    if (p === '3' || p === 'Q3') return 'Q3';
    if (p === '4' || p === 'Q4') return 'Q4';
    // NHL periods
    if (p === 'P1' || p === '1ST PERIOD' || p === '1ST') return 'P1';
    if (p === 'P2' || p === '2ND PERIOD' || p === '2ND') return 'P2';
    if (p === 'P3' || p === '3RD PERIOD' || p === '3RD') return 'P3';
    if (p.includes('OT')) return 'OT';
    if (p === 'SO' || p.includes('SHOOTOUT')) return 'SO';
    if (p === 'HALF' || p === 'HT') return 'HT';
    if (p.includes('INT') || p === 'INTERMISSION') return 'INT';
    return p;
  };
  
  const periodDisplay = formatPeriod();
  const clockDisplay = clock && clock !== 'Live' ? clock : '';
  
  // Determine if user's side is winning
  const hasUserSide = side === "home" || side === "away";
  const isHome = side === 'home';
  const userScore = hasUserSide ? (isHome ? homeScore : awayScore) : null;
  const oppScore = hasUserSide ? (isHome ? awayScore : homeScore) : null;
  const isWinning = userScore !== null && oppScore !== null && userScore > oppScore;
  const awayLabel = compactTeamLabel(game?.awayShort, game?.awayAbbr, awayTeam);
  const homeLabel = compactTeamLabel(game?.homeShort, game?.homeAbbr, homeTeam);
  
  return (
    <div 
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{ 
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}
    >
      <div className="flex items-center gap-1.5">
        {game?.awayLogo ? (
          <TeamLogo
            src={game.awayLogo}
            alt={awayLabel}
            fallback={game.awayAbbr || awayLabel}
            size="sm"
          />
        ) : (
          <span className="max-w-[58px] truncate text-[10px] font-medium text-zinc-500">
            {awayLabel}
          </span>
        )}
        <span className={`text-sm font-bold tabular-nums ${!isHome && isWinning ? 'text-[#0EE957]' : 'text-zinc-300'}`}>
          {awayScore ?? '-'}
        </span>
      </div>

      <span className="text-xs text-zinc-500">–</span>

      <div className="flex items-center gap-1.5">
        {game?.homeLogo ? (
          <TeamLogo
            src={game.homeLogo}
            alt={homeLabel}
            fallback={game.homeAbbr || homeLabel}
            size="sm"
          />
        ) : (
          <span className="max-w-[58px] truncate text-[10px] font-medium text-zinc-500">
            {homeLabel}
          </span>
        )}
        <span className={`text-sm font-bold tabular-nums ${isHome && isWinning ? 'text-[#0EE957]' : 'text-zinc-300'}`}>
          {homeScore ?? '-'}
        </span>
      </div>
      
      {/* Period/clock */}
      {(periodDisplay || clockDisplay) && (
        <>
          {periodDisplay && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-500 whitespace-nowrap">{periodDisplay}</span>
            </>
          )}
          {clockDisplay && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-[#FF0066] whitespace-nowrap">{clockDisplay}</span>
            </>
          )}
        </>
      )}
    </div>
  );
};

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
  const sizeClass = size === "sm" ? "h-5 w-5 text-[8px]" : "h-8 w-8 text-[10px]";
  const paddingClass = size === "sm" ? "p-0.5" : "p-1";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-[#121214] font-semibold text-zinc-400 ${sizeClass}`}
      title={alt}
    >
      {src && !hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={size === "sm" ? "20px" : "32px"}
          className={`object-contain ${paddingClass}`}
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{fallbackText}</span>
      )}
    </div>
  );
}

function formatGameMatchup(game: UpcomingGame): string {
  return `${compactTeamLabel(game.awayShort, game.awayAbbr, game.awayTeam)} @ ${compactTeamLabel(game.homeShort, game.homeAbbr, game.homeTeam)}`;
}

function formatStartTimeEt(startTime: string | null): string | null {
  if (!startTime) return null;
  const d = new Date(startTime);
  if (!Number.isFinite(d.getTime())) return null;
  try {
    const t = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
    return `${t} ET`;
  } catch {
    return null;
  }
}

function formatPlayMeta(play: RecentPlay): string {
  return [play.clock, play.period].filter(Boolean).join(" • ");
}

function formatElapsedSince(wallclock: string | null | undefined, nowMs: number): string | null {
  const ts = new Date(String(wallclock || "")).getTime();
  if (!Number.isFinite(ts)) return null;

  const elapsedSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (elapsedSec < 60) return `${elapsedSec}s ago`;

  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s ago`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m ago`;
}

const EspnGameCard = ({
  game,
  onOpen,
}: {
  game: UpcomingGame;
  onOpen: (game: UpcomingGame) => void;
}) => {
  const isLive = game.status === "live";
  const awayWinning =
    isLive &&
    game.awayScore !== null &&
    game.homeScore !== null &&
    game.awayScore > game.homeScore;
  const homeWinning =
    isLive &&
    game.awayScore !== null &&
    game.homeScore !== null &&
    game.homeScore > game.awayScore;
  const statusLabel = (() => {
    if (game.status === "pre") {
      return formatStartTimeEt(game.startTime) || game.statusText || "Up next";
    }
    return (
      game.statusText ||
      game.period ||
      game.clock ||
      (game.status === "post" ? "Final" : "Live")
    );
  })();
  const awayLabel = compactTeamLabel(game.awayShort, game.awayAbbr, game.awayTeam);
  const homeLabel = compactTeamLabel(game.homeShort, game.homeAbbr, game.homeTeam);

  return (
    <button
      type="button"
      onClick={() => onOpen(game)}
      className="min-w-[148px] max-w-[148px] rounded-lg px-3 py-2 text-left text-zinc-300 transition-colors snap-start hover:bg-white/[0.03]"
      title={`${game.awayTeam} @ ${game.homeTeam}`}
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.08) inset",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium leading-none text-[#FF0066]">
          {statusLabel}
        </span>
        {isLive && game.pulseLabel ? (
          <span
            className="shrink-0 rounded-md bg-white/[0.04] px-2 py-1 text-[10px] font-medium leading-none text-zinc-300"
            title={game.pulseText || undefined}
          >
            {game.pulseLabel}
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TeamLogo
            src={game.awayLogo}
            alt={game.awayTeam}
            fallback={game.awayAbbr || game.awayTeam}
            size="sm"
          />
          <span
            className={`min-w-0 flex-1 truncate text-xs font-medium ${
              awayWinning ? "text-white" : "text-zinc-300"
            }`}
          >
            {awayLabel}
          </span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              awayWinning ? "text-white" : "text-zinc-300"
            }`}
          >
            {isLive ? game.awayScore ?? "-" : "—"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <TeamLogo
            src={game.homeLogo}
            alt={game.homeTeam}
            fallback={game.homeAbbr || game.homeTeam}
            size="sm"
          />
          <span
            className={`min-w-0 flex-1 truncate text-xs font-medium ${
              homeWinning ? "text-white" : "text-zinc-300"
            }`}
          >
            {homeLabel}
          </span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              homeWinning ? "text-white" : "text-zinc-300"
            }`}
          >
            {isLive ? game.homeScore ?? "-" : "—"}
          </span>
        </div>
      </div>
    </button>
  );
};

const LiveGamesSection = ({
  title,
  games,
  onOpen,
}: {
  title: string;
  games: UpcomingGame[];
  onOpen: (game: UpcomingGame) => void;
}) => (
  <div>
    <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-[#757575]">
      {title}
    </p>
    <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {games.map((game) => (
        <EspnGameCard key={game.id} game={game} onOpen={onOpen} />
      ))}
    </div>
  </div>
);

function formatHighlightDuration(durationSec: number): string {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "";
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function InlineHighlightPlayer({ clip }: { clip: HighlightClip }) {
  const preferHls = useMemo(() => {
    if (typeof document === "undefined") return false;
    const video = document.createElement("video");
    return Boolean(video.canPlayType("application/vnd.apple.mpegurl"));
  }, []);

  const src =
    (preferHls ? clip.hlsUrl : null) ||
    clip.mp4Url ||
    clip.hlsUrl ||
    null;

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

  if (clip) {
    return <InlineHighlightPlayer clip={clip} />;
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-zinc-400">
      {error || "No highlight available for this game yet."}
    </div>
  );
}

function RecentPlaysPanel({
  plays,
  loading,
  error,
  nowMs,
}: {
  plays: RecentPlay[];
  loading: boolean;
  error: string | null | undefined;
  nowMs: number;
}) {
  const visiblePlays = plays.slice(0, 4);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#757575]">
          Recent plays
        </p>
        {loading ? (
          <span className="text-[10px] font-medium text-zinc-500">Refreshing…</span>
        ) : null}
      </div>

      {visiblePlays.length ? (
        <div className="space-y-3">
          {visiblePlays.map((play) => {
            const age = formatElapsedSince(play.wallclock, nowMs);
            const meta = formatPlayMeta(play);
            const score =
              play.awayScore != null && play.homeScore != null
                ? `${play.awayScore}-${play.homeScore}`
                : null;

            return (
              <div
                key={play.id || `${play.label}-${play.wallclock || play.text}`}
                className="border-l border-white/[0.08] pl-3"
                style={{
                  borderLeftColor: play.scoringPlay ? "rgba(14, 165, 233, 0.55)" : "rgba(255, 255, 255, 0.08)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-sm font-medium ${
                      play.scoringPlay ? "text-[#0EA5E9]" : "text-white"
                    }`}
                  >
                    {play.label}
                  </span>
                  {score ? (
                    <span className="shrink-0 text-[11px] font-medium tabular-nums text-zinc-500">
                      {score}
                    </span>
                  ) : null}
                </div>

                {(meta || age) && (
                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                    <span>{meta || "Live"}</span>
                    {age ? <span className="shrink-0 tabular-nums">{age}</span> : null}
                  </div>
                )}

                {play.text ? (
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                    {play.text}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-zinc-400">
          {loading ? "Loading recent plays…" : error || "Recent plays will appear once the game starts."}
        </div>
      )}
    </div>
  );
}

const ChoiceBadge = ({ type, team }: { type: "yes" | "no"; team: string }) => (
  <span
    className="inline-flex items-center text-sm font-medium px-3 py-2"
    style={
      type === "yes"
        ? {
            borderRadius: "8px",
            background: "rgba(14, 165, 233, 0.10)",
            boxShadow: "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
            color: "#0EA5E9",
          }
        : {
            borderRadius: "8px",
            background: "rgba(255, 0, 102, 0.10)",
            boxShadow: "0 1px 0 0 rgba(255, 0, 102, 0.10) inset",
            color: "#FF0066",
          }
    }
  >
    {type === "yes" ? "Yes" : "No"} • {team}
  </span>
);

function sportToCategory(sport: string | null | undefined): string {
  const s = String(sport || "").toUpperCase();
  if (s === "NBA") return "Pro Basketball";
  if (s === "NFL") return "Pro Football";
  if (s === "MLB") return "Pro Baseball";
  if (s === "NHL") return "Pro Hockey";
  if (s === "CFB") return "College Football";
  if (s === "CBB") return "College Basketball";
  return sport || "Sports";
}

function supportsHighlightDialogSport(sport: string | null | undefined): boolean {
  const s = String(sport || "").toUpperCase();
  return s === "NBA" || s === "NHL" || s === "MLB";
}

function supportsGameOddsSport(sport: string | null | undefined): boolean {
  const s = String(sport || "").toUpperCase();
  return s === "NBA" || s === "NHL" || s === "MLB";
}

function compactTeamLabel(
  shortName: string | null | undefined,
  abbr: string | null | undefined,
  fullName: string | null | undefined
): string {
  return shortName || abbr || fullName || "";
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

function buildGameKeys(game: UpcomingGame): string[] {
  return [
    `${game.awayTeam} @ ${game.homeTeam}`,
    `${game.homeTeam} vs ${game.awayTeam}`,
    `${game.awayShort} @ ${game.homeShort}`,
    `${game.homeShort} vs ${game.awayShort}`,
    `${game.awayAbbr} @ ${game.homeAbbr}`,
    `${game.homeAbbr} vs ${game.awayAbbr}`,
  ].map(normalizeGameText).filter(Boolean);
}

function gameSideTokens(game: UpcomingGame, side: "home" | "away"): string[] {
  const values =
    side === "home"
      ? [game.homeTeam, game.homeShort, game.homeAbbr]
      : [game.awayTeam, game.awayShort, game.awayAbbr];

  return [...new Set(values.map(normalizeGameText).filter(Boolean))];
}

export function positionMatchesGame(position: C9Position, game: UpcomingGame): boolean {
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

export function resolvePositionSide(position: C9Position, game: UpcomingGame | null): "home" | "away" | null {
  if (position.side === "home" || position.side === "away") return position.side;
  if (!game) return null;

  const choice = normalizeGameText(position.choice?.team);
  if (!choice) return null;

  const matchesSide = (tokens: string[]) =>
    tokens.some((token) => choice === token || choice.includes(token) || token.includes(choice));

  if (matchesSide(gameSideTokens(game, "home"))) return "home";
  if (matchesSide(gameSideTokens(game, "away"))) return "away";
  return null;
}

function compactMatchName(position: C9Position, game: UpcomingGame | null): string {
  if (!game) return position.matchName;
  return `${compactTeamLabel(game.awayShort, game.awayAbbr, game.awayTeam)} @ ${compactTeamLabel(game.homeShort, game.homeAbbr, game.homeTeam)}`;
}

// Parse currency string to number (e.g., "$35.50" -> 35.50, "97¢" -> 0.97)
const parseCurrency = (value: string): number => {
  if (value.includes("¢")) {
    return parseFloat(value.replace("¢", "")) / 100;
  }
  return parseFloat(value.replace(/[$,]/g, "")) || 0;
};

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
  const [logoErr, setLogoErr] = useState(false);
  const initials = (fallback || label || "?").slice(0, 3).toUpperCase();
  const width = Math.max(2, Math.min(100, pct));

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-[#121214] text-[8px] font-semibold text-zinc-400">
        {logo && !logoErr ? (
          <Image src={logo} alt={label} fill sizes="20px" className="object-contain p-0.5" onError={() => setLogoErr(true)} />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className="w-9 shrink-0">
        <span className="block truncate text-[11px] font-medium leading-tight text-zinc-400">{fallback || label}</span>
        {record && <span className="block text-[8px] leading-tight text-zinc-600">{record}</span>}
      </div>
      <div className="relative flex-1 h-[6px] rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-[11px] font-semibold" style={{ color }}>{pct}%</span>
    </div>
  );
}

function PositionOddsBars({
  game,
  positionSide,
  priceCents,
}: {
  game: UpcomingGame;
  positionSide: "home" | "away" | null;
  priceCents: number;
}) {
  const cents = Math.max(0, Math.min(100, Math.round(priceCents)));
  const otherCents = Math.max(0, 100 - cents);
  const homeCents = positionSide === "home" ? cents : positionSide === "away" ? otherCents : cents;
  const awayCents = positionSide === "away" ? cents : positionSide === "home" ? otherCents : otherCents;

  return (
    <div className="space-y-1.5">
      <OddsBar
        label={compactTeamLabel(game.awayShort, game.awayAbbr, game.awayTeam)}
        logo={game.awayLogo}
        fallback={game.awayAbbr || game.awayTeam}
        pct={awayCents}
        color={game.awayColor || "#a1a1aa"}
        record={game.awayRecord}
      />
      <OddsBar
        label={compactTeamLabel(game.homeShort, game.homeAbbr, game.homeTeam)}
        logo={game.homeLogo}
        fallback={game.homeAbbr || game.homeTeam}
        pct={homeCents}
        color={game.homeColor || "#0EE957"}
        record={game.homeRecord}
      />
    </div>
  );
}

function GameOddsBars({
  game,
  homeCents,
  awayCents,
}: {
  game: UpcomingGame;
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
        label={compactTeamLabel(game.awayShort, game.awayAbbr, game.awayTeam)}
        logo={game.awayLogo}
        fallback={game.awayAbbr || game.awayTeam}
        pct={away}
        color={game.awayColor || "#a1a1aa"}
        record={game.awayRecord}
      />
      <OddsBar
        label={compactTeamLabel(game.homeShort, game.homeAbbr, game.homeTeam)}
        logo={game.homeLogo}
        fallback={game.homeAbbr || game.homeTeam}
        pct={home}
        color={game.homeColor || "#0EE957"}
        record={game.homeRecord}
      />
    </div>
  );
}

function isFinalGameStatus(liveScore: LiveScore | null | undefined): boolean {
  const raw = String(liveScore?.gameStatus || liveScore?.period || "").toLowerCase().trim();
  if (!raw) return false;
  return (
    raw === "final" ||
    raw === "post" ||
    raw === "ft" ||
    raw.includes("final") ||
    raw.includes("ended") ||
    raw.includes("complete")
  );
}

export const C9PositionsTable = ({
  positions,
  upcomingGames = [],
  onSharePnl,
  onRedeem,
  redeeming,
}: C9PositionsTableProps) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [expandedPositionId, setExpandedPositionId] = useState<string | null>(null);
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
  const [highlightDialogGame, setHighlightDialogGame] = useState<UpcomingGame | null>(null);
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
  const [recentPlaysByGameId, setRecentPlaysByGameId] = useState<Record<string, RecentPlay[]>>({});
  const [recentPlaysLoadingByGameId, setRecentPlaysLoadingByGameId] = useState<Record<string, boolean>>({});
  const [recentPlaysErrorByGameId, setRecentPlaysErrorByGameId] = useState<Record<string, string | null>>({});
  const recentPlaysInFlightRef = useRef<Set<string>>(new Set());
  const [dialogNowMs, setDialogNowMs] = useState(() => Date.now());

  // Filter upcoming games to exclude ones the user already has positions in
  const nonPositionedGames = useMemo(() => {
    if (!upcomingGames.length) return [];
    const posMatches = positions
      .map((p) => normalizeGameText(p.matchName))
      .filter(Boolean);

    return upcomingGames.filter((g) => {
      const gameKeys = new Set(buildGameKeys(g));
      const homeTeamKey = normalizeGameText(g.homeTeam);
      const awayTeamKey = normalizeGameText(g.awayTeam);
      const homeAbbrKey = normalizeGameText(g.homeAbbr);
      const awayAbbrKey = normalizeGameText(g.awayAbbr);

      for (const match of posMatches) {
        if (gameKeys.has(match)) return false;

        const fullTeamMatch =
          homeTeamKey &&
          awayTeamKey &&
          match.includes(homeTeamKey) &&
          match.includes(awayTeamKey);

        const abbrMatch =
          homeAbbrKey.length >= 3 &&
          awayAbbrKey.length >= 3 &&
          match.includes(homeAbbrKey) &&
          match.includes(awayAbbrKey);

        if (fullTeamMatch || abbrMatch) return false;
      }

      return true;
    });
  }, [upcomingGames, positions]);

  const matchedGameByPositionId = useMemo(() => {
    const matches = new Map<string, UpcomingGame | null>();
    for (const position of positions) {
      const matched = upcomingGames.find((game) => positionMatchesGame(position, game)) || null;
      matches.set(position.id, matched);
    }
    return matches;
  }, [positions, upcomingGames]);

  const loadHighlightClip = useCallback(
    async (game: UpcomingGame) => {
      if (!game?.id || !supportsHighlightDialogSport(game.sport)) return;
      if (
        Object.prototype.hasOwnProperty.call(highlightByGameId, game.id) ||
        highlightLoadingByGameId[game.id]
      ) {
        return;
      }

      setHighlightLoadingByGameId((prev) => ({ ...prev, [game.id]: true }));
      setHighlightErrorByGameId((prev) => ({ ...prev, [game.id]: null }));

      try {
        const res = await fetch(
          `/api/c9/highlights?sport=${encodeURIComponent(game.sport)}&eventId=${encodeURIComponent(game.id)}`
        );
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
    },
    [highlightByGameId, highlightLoadingByGameId]
  );

  const [highlightDialogPositionId, setHighlightDialogPositionId] = useState<string | null>(null);

  const loadGameMarketOdds = useCallback(
    async (game: UpcomingGame) => {
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
          status: game.status,
        });
        if (game.startTime) params.set("startTime", game.startTime);
        if (game.id) params.set("eventId", game.id);

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 12_000);
        const data = await backendFetchJson<{
          ok: boolean;
          odds: { homeCents?: number | null; awayCents?: number | null } | null;
          message?: string;
        }>(`/c9/game-market-odds?${params.toString()}`, { signal: controller.signal }).finally(
          () => window.clearTimeout(timeoutId)
        );

        const odds = data?.odds || null;
        setMarketOddsByGameId((prev) => ({
          ...prev,
          [game.id]: odds ? { homeCents: odds.homeCents ?? null, awayCents: odds.awayCents ?? null } : null,
        }));
        if (!odds) {
          setMarketOddsErrorByGameId((prev) => ({
            ...prev,
            [game.id]: data?.message || "No Kalshi market odds available for this game yet.",
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
          return;
        }
        const msg =
          (error as Error)?.name === "AbortError"
            ? "Odds timed out. Try again."
            : rawMsg || "Failed to load Kalshi odds";
        setMarketOddsErrorByGameId((prev) => ({ ...prev, [game.id]: msg }));
      } finally {
        marketOddsInFlightRef.current.delete(game.id);
        setMarketOddsLoadingByGameId((prev) => ({ ...prev, [game.id]: false }));
      }
    },
    [marketOddsAuthBlocked]
  );

  const loadRecentPlays = useCallback(async (game: UpcomingGame) => {
    if (!game?.id || !supportsHighlightDialogSport(game.sport)) return;
    if (recentPlaysInFlightRef.current.has(game.id)) return;
    recentPlaysInFlightRef.current.add(game.id);

    setRecentPlaysLoadingByGameId((prev) => ({ ...prev, [game.id]: true }));
    setRecentPlaysErrorByGameId((prev) => ({ ...prev, [game.id]: null }));

    try {
      const res = await fetch(
        `/api/c9/recent-plays?sport=${encodeURIComponent(game.sport)}&eventId=${encodeURIComponent(game.id)}&limit=4`
      );
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load recent plays");
      }

      const plays = Array.isArray(data?.plays) ? (data.plays as RecentPlay[]) : [];
      setRecentPlaysByGameId((prev) => ({ ...prev, [game.id]: plays }));

      if (!plays.length && game.status === "live") {
        setRecentPlaysErrorByGameId((prev) => ({
          ...prev,
          [game.id]: data?.message || "No recent plays available yet.",
        }));
      }
    } catch (error) {
      setRecentPlaysByGameId((prev) => ({ ...prev, [game.id]: prev[game.id] || [] }));
      setRecentPlaysErrorByGameId((prev) => ({
        ...prev,
        [game.id]: (error as Error).message || "Failed to load recent plays",
      }));
    } finally {
      recentPlaysInFlightRef.current.delete(game.id);
      setRecentPlaysLoadingByGameId((prev) => ({ ...prev, [game.id]: false }));
    }
  }, []);

  const openHighlights = useCallback(
    (game: UpcomingGame | null, positionId?: string) => {
      if (!game || !supportsHighlightDialogSport(game.sport) || !game.id) return;
      setHighlightDialogGame(game);
      setHighlightDialogPositionId(positionId || null);
      setHighlightDialogOpen(true);
      void loadHighlightClip(game);
      void loadGameMarketOdds(game);
      void loadRecentPlays(game);
    },
    [loadGameMarketOdds, loadHighlightClip, loadRecentPlays]
  );

  // Get unique sport categories
  const sportCategories = useMemo(() => {
    const fromPositions = positions.map((p) => p.sportCategory);
    const fromGames = nonPositionedGames.map((g) => sportToCategory(g.sport));
    const categories = [...new Set([...fromPositions, ...fromGames])];
    return categories.sort();
  }, [positions, nonPositionedGames]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Filter and sort positions
  const filteredAndSortedPositions = useMemo(() => {
    let result = [...positions];

    // Apply sport filter
    if (sportFilter !== "all") {
      result = result.filter((p) => p.sportCategory === sportFilter);
    }

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case "sport":
            comparison = a.sportCategory.localeCompare(b.sportCategory);
            break;
          case "market":
            comparison = a.matchName.localeCompare(b.matchName);
            break;
          case "lastTraded":
            comparison =
              parseCurrency(a.lastTraded) - parseCurrency(b.lastTraded);
            break;
          case "contracts":
            comparison = a.contracts - b.contracts;
            break;
          case "avgPrice":
            comparison = parseCurrency(a.avgPrice) - parseCurrency(b.avgPrice);
            break;
          case "cost":
            comparison = parseCurrency(a.cost) - parseCurrency(b.cost);
            break;
          case "totalReturn": {
            const aReturn =
              parseCurrency(a.totalReturn.amount) *
              (a.totalReturn.isPositive ? 1 : -1);
            const bReturn =
              parseCurrency(b.totalReturn.amount) *
              (b.totalReturn.isPositive ? 1 : -1);
            comparison = aReturn - bReturn;
            break;
          }
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [positions, sportFilter, sortField, sortDirection]);

  // Show up to 5 games: live first, then soonest upcoming.
  const featuredGames = useMemo(() => {
    const filteredBySport =
      sportFilter === "all"
        ? nonPositionedGames
        : nonPositionedGames.filter((g) => sportToCategory(g.sport) === sportFilter);

    const live = filteredBySport.filter((g) => g.status === "live");
    const upcoming = filteredBySport
      .filter((g) => g.status === "pre")
      .sort((a, b) => {
        const ta = a.startTime ? new Date(a.startTime).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.startTime ? new Date(b.startTime).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      });

    const out: UpcomingGame[] = [];
    const seen = new Set<string>();
    const push = (g: UpcomingGame) => {
      const id = String(g?.id || "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(g);
    };

    if (live.length > 0) {
      for (const g of live) {
        if (out.length >= 5) break;
        push(g);
      }
      for (const g of upcoming) {
        if (out.length >= 5) break;
        push(g);
      }
      return out;
    }

    for (const g of upcoming) {
      if (out.length >= 5) break;
      push(g);
    }
    return out;
  }, [nonPositionedGames, sportFilter]);

  const featuredGamesTitle = useMemo(() => {
    const hasLive = featuredGames.some((g) => g.status === "live");
    const hasUpcoming = featuredGames.some((g) => g.status === "pre");
    if (hasLive && hasUpcoming) return "Live + up next";
    if (hasLive) return "Live now";
    return "Up next";
  }, [featuredGames]);

  const activeHighlightClip = highlightDialogGame
    ? highlightByGameId[highlightDialogGame.id]
    : null;
  const activeHighlightLoading = highlightDialogGame
    ? !!highlightLoadingByGameId[highlightDialogGame.id]
    : false;
  const activeHighlightError = highlightDialogGame
    ? highlightErrorByGameId[highlightDialogGame.id]
    : null;
  const activeHighlightPending = highlightDialogGame
    ? !Object.prototype.hasOwnProperty.call(highlightByGameId, highlightDialogGame.id) ||
      activeHighlightLoading
    : false;

  const activeOdds = highlightDialogGame ? marketOddsByGameId[highlightDialogGame.id] : null;
  const activeOddsLoading = highlightDialogGame ? !!marketOddsLoadingByGameId[highlightDialogGame.id] : false;
  const activeOddsError = highlightDialogGame ? marketOddsErrorByGameId[highlightDialogGame.id] : null;
  const activeRecentPlays = highlightDialogGame ? recentPlaysByGameId[highlightDialogGame.id] || [] : [];
  const activeRecentPlaysLoading = highlightDialogGame
    ? !!recentPlaysLoadingByGameId[highlightDialogGame.id]
    : false;
  const activeRecentPlaysError = highlightDialogGame
    ? recentPlaysErrorByGameId[highlightDialogGame.id]
    : null;
  const showRecentPlays =
    !!highlightDialogGame &&
    supportsHighlightDialogSport(highlightDialogGame.sport) &&
    (
      highlightDialogGame.status === "live" ||
      activeRecentPlays.length > 0 ||
      activeRecentPlaysLoading ||
      !!activeRecentPlaysError
    );

  useEffect(() => {
    if (!highlightDialogOpen || !highlightDialogGame) return;
    void loadGameMarketOdds(highlightDialogGame);
    void loadRecentPlays(highlightDialogGame);
    const interval = window.setInterval(() => {
      void loadGameMarketOdds(highlightDialogGame);
      void loadRecentPlays(highlightDialogGame);
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [highlightDialogGame, highlightDialogOpen, loadGameMarketOdds, loadRecentPlays]);

  useEffect(() => {
    if (!highlightDialogOpen) return;
    setDialogNowMs(Date.now());
    const interval = window.setInterval(() => {
      setDialogNowMs(Date.now());
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [highlightDialogOpen]);

  return (
    <div className="flex flex-col">
      {/* Sport Filter */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]"
        style={{ background: "#141416" }}
      >
        <span className="text-sm text-zinc-400 font-medium">
          {filteredAndSortedPositions.length} position
          {filteredAndSortedPositions.length !== 1 ? "s" : ""}
        </span>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors font-medium ${
              sportFilter !== "all"
                ? "text-cyan-500 bg-cyan-500/10"
                : "text-zinc-400 hover:text-white"
            }`}
            style={{
              background:
                sportFilter !== "all"
                  ? "rgba(14, 165, 233, 0.10)"
                  : "rgba(255, 255, 255, 0.02)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
            }}
          >
            <Filter className="h-4 w-4" />
            {sportFilter === "all" ? "All Sports" : sportFilter}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ease-out ${
                filterDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {filterDropdownOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-zinc-800 p-1"
              style={{
                background: "#141416",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
              }}
            >
              <button
                onClick={() => {
                  setSportFilter("all");
                  setFilterDropdownOpen(false);
                }}
                className={`flex w-full items-center  px-2 py-1.5 text-sm transition-colors rounded-lg duration-200 ease-out hover:bg-[#FFFFFF05] hover:text-white ${
                  sportFilter === "all"
                    ? "text-[#0EA5E9] bg-[#102E3D]"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                All Sports
              </button>
              {sportCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSportFilter(category);
                    setFilterDropdownOpen(false);
                  }}
                  className={`flex w-full items-center px-2 py-1.5 text-sm transition-colors rounded-lg duration-200 ease-out hover:bg-[#FFFFFF05] hover:text-white ${
                    sportFilter === category
                      ? "text-[#0EA5E9] bg-[#102E3D]"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="flex flex-col gap-2 p-3 md:hidden">
        {featuredGames.length > 0 && (
          <div
            className="mb-1 rounded-lg border border-white/[0.02] px-3 py-3"
            style={{
              background: "#141416",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.08) inset",
            }}
          >
            <LiveGamesSection
              title={featuredGamesTitle}
              games={featuredGames}
              onOpen={openHighlights}
            />
          </div>
        )}
        {filteredAndSortedPositions.map((position) => {
          const isExpanded = expandedPositionId === position.id;
          const children = Array.isArray(position.children) ? position.children : [];
          const hasChildren = children.length > 0;
          const isFinal = isFinalGameStatus(position.liveScore);
          const matchedGame = matchedGameByPositionId.get(position.id) || null;
          const positionSide = resolvePositionSide(position, matchedGame);
          const positionLogo =
            positionSide === "home"
              ? matchedGame?.homeLogo || null
              : positionSide === "away"
                ? matchedGame?.awayLogo || null
                : null;
          const compactName = compactMatchName(position, matchedGame);
          const canShowHighlights = supportsHighlightDialogSport(matchedGame?.sport) && Boolean(matchedGame?.id);
          const highlightLoading = matchedGame ? !!highlightLoadingByGameId[matchedGame.id] : false;
          return (
            <div key={position.id}>
              <button
                type="button"
                onClick={() => setExpandedPositionId((cur) => (cur === position.id ? null : position.id))}
                className="w-full rounded-xl p-3 text-left transition-all"
                style={{ background: "rgba(255,255,255,0.02)", boxShadow: "0 1px 0 0 rgba(255,255,255,0.06) inset" }}
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
                      {position.sportCategory && position.sportCategory !== "Pro Basketball" && position.sportCategory !== "Pro Hockey" && (
                        <span className="text-[10px] text-[#757575]">{position.sportCategory}</span>
                      )}
                      {hasChildren && (
                        <span className="inline-flex items-center justify-center rounded-md p-0.5" style={{ background: "rgba(14, 233, 87, 0.12)" }}>
                          <Shield className="h-3 w-3 text-[#0EE957]" />
                        </span>
                      )}
                    </div>
                    <ModelLabel label={position.modelLabel} />
                    <p className="text-sm font-medium text-white truncate">{compactName}</p>
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-right">
                    <span
                      className={`text-sm font-medium ${
                        position.totalReturn.isPositive ? "text-[#0EE957]" : "text-[#FF0066]"
                      }`}
                    >
                      {position.totalReturn.isPositive ? "+" : "-"}
                      {position.totalReturn.amount}{" "}
                      <span className="text-[10px] opacity-70">
                        ({position.totalReturn.percentage})
                      </span>
                    </span>
                  </div>
                </div>
                {position.liveScore && (
                  <div className="mt-2">
                    <LiveScoreDisplay liveScore={position.liveScore} side={positionSide} game={matchedGame} />
                  </div>
                )}
                <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
                  <div><span className="text-[#757575]">Mark</span><p className="text-zinc-300">{position.lastTraded}</p></div>
                  <div><span className="text-[#757575]">Qty</span><p className="text-zinc-300">{position.contracts}</p></div>
                  <div><span className="text-[#757575]">Avg</span><p className="text-zinc-300">{position.avgPrice}</p></div>
                  <div><span className="text-[#757575]">Cost</span><p className="text-zinc-300">{position.cost}</p></div>
                </div>
              </button>
              {isExpanded && hasChildren && children.map((c) => (
                <div
                  key={c.id}
                  className="ml-6 mt-1 rounded-lg px-3 py-2"
                  style={{ background: "linear-gradient(0deg, rgba(14, 233, 87, 0.02) 0%, rgba(14, 233, 87, 0.04) 100%)" }}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-[#0EE957]" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-zinc-300 flex-1 truncate block">{c.choice?.team || c.matchName}</span>
                      <ModelLabel label={c.modelLabel} />
                    </div>
                    <span className={`text-xs font-medium ${c.totalReturn.isPositive ? "text-[#0EE957]" : "text-[#FF0066]"}`}>
                      {c.totalReturn.isPositive ? "+" : "-"}{c.totalReturn.amount}
                    </span>
                  </div>
                </div>
              ))}
              {isExpanded && (
                <div className="mt-1 rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.01)" }}>
                  {matchedGame && position.currentPriceCents != null && (
                    <PositionOddsBars game={matchedGame} positionSide={positionSide} priceCents={position.currentPriceCents} />
                  )}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <ChoiceBadge type={position.choice.type} team={position.choice.team} />
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {canShowHighlights && (
                        <button
                          onClick={() => void openHighlights(matchedGame, position.id)}
                          disabled={highlightLoading}
                          className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-white disabled:opacity-50"
                          style={{ background: "#121214", boxShadow: "0 1px 0 0 rgba(255,255,255,0.10) inset" }}
                        >
                          {highlightLoading ? "Loading…" : "Highlights"}
                        </button>
                      )}
                      <button onClick={() => onSharePnl?.(position.id)} className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-white" style={{ background: "#121214", boxShadow: "0 1px 0 0 rgba(255,255,255,0.10) inset" }}>Share</button>
                      {onRedeem && <button onClick={() => onRedeem(position.id)} disabled={!!redeeming?.[position.id]} className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-white disabled:opacity-50" style={{ background: "#121214", boxShadow: "0 1px 0 0 rgba(255,255,255,0.10) inset" }}>{redeeming?.[position.id] ? (isFinal ? "Redeeming…" : "Selling…") : isFinal ? "Redeem" : "Sell"}</button>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {featuredGames.length > 0 && (
        <div
          className="hidden md:block border-b border-[#2A2A2A] px-4 py-3"
          style={{ background: "#141416" }}
        >
          <LiveGamesSection
            title={featuredGamesTitle}
            games={featuredGames}
            onOpen={openHighlights}
          />
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead
            className="sticky top-0 z-10"
            style={{
              background: "#141416",
              boxShadow: "inset 0 -1px 0 0 #FFFFFF05, 0 1px 0 0 #2A2A2A",
            }}
          >
            <tr>
              <TableHeader label="Market" field="sport" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              <TableHeader label="Mark" field="lastTraded" align="right" pad="compact" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              <TableHeader label="Quantity" field="contracts" align="right" pad="compact" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              <TableHeader label="Avg Price" field="avgPrice" align="right" pad="compact" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              <TableHeader label="Cost" field="cost" align="right" pad="compact" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              <TableHeader label="Total Return" field="totalReturn" align="right" pad="compact" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPositions.map((position, index) => {
              const isLast = index === filteredAndSortedPositions.length - 1;
              const borderClass = isLast ? "" : "border-b border-[#2A2A2A]";
              const isExpanded = expandedPositionId === position.id;
              const children = Array.isArray(position.children) ? position.children : [];
              const hasChildren = children.length > 0;
              const isFinal = isFinalGameStatus(position.liveScore);
              const matchedGame = matchedGameByPositionId.get(position.id) || null;
              const positionSide = resolvePositionSide(position, matchedGame);
              const positionLogo =
                positionSide === "home"
                  ? matchedGame?.homeLogo || null
                  : positionSide === "away"
                    ? matchedGame?.awayLogo || null
                    : null;
              const compactName = compactMatchName(position, matchedGame);
              const canShowHighlights = supportsHighlightDialogSport(matchedGame?.sport) && Boolean(matchedGame?.id);
              const highlightLoading = matchedGame ? !!highlightLoadingByGameId[matchedGame.id] : false;
              return (
                <Fragment key={position.id}>
                  <tr onClick={() => setExpandedPositionId((cur) => (cur === position.id ? null : position.id))} className="cursor-pointer" title="Click to view actions">
                    <td className="px-3 py-4 align-middle border-b border-[#2A2A2A]">
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
                            {position.liveScore ? (
                              <LiveScoreDisplay
                                liveScore={position.liveScore}
                                side={positionSide}
                                game={matchedGame}
                              />
                            ) : (
                              <p className="min-w-0 truncate text-sm font-medium text-white">
                                {compactName}
                              </p>
                            )}

                            {hasChildren && (
                              <span
                                className="inline-flex items-center justify-center rounded-md p-1"
                                style={{ background: "rgba(14, 233, 87, 0.12)" }}
                                title="Coverage enabled"
                              >
                                <Shield className="h-3.5 w-3.5 text-[#0EE957]" />
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pl-[52px] flex items-center gap-0">
                          <p className="w-[160px] shrink-0 truncate text-xs text-[#757575]">
                            {position.liveScore
                              ? compactName
                              : position.sportCategory &&
                                position.sportCategory !== "Pro Basketball" &&
                                position.sportCategory !== "Pro Hockey"
                                ? position.sportCategory
                                : compactName}
                          </p>
                          <ModelPill label={position.modelLabel} />
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top text-right text-sm text-zinc-300 border-b border-[#2A2A2A]">
                      <div className="flex h-9 items-center justify-end">
                        {position.lastTraded}
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top text-right text-sm text-zinc-300 border-b border-[#2A2A2A]">
                      <div className="flex h-9 items-center justify-end">
                        {position.contracts}
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top text-right text-sm text-zinc-300 border-b border-[#2A2A2A]">
                      <div className="flex h-9 items-center justify-end">
                        {position.avgPrice}
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top text-right text-sm text-zinc-300 border-b border-[#2A2A2A]">
                      <div className="flex h-9 items-center justify-end">
                        {position.cost}
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top text-right border-b border-[#2A2A2A]">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex h-9 items-center">
                          <C9PriceSparkline
                            data={position.sparkline || []}
                            stroke={position.totalReturn.isPositive ? "#0EE957" : "#FF0066"}
                            entryPriceCents={position.entryPriceCents}
                          />
                        </div>
                        <div className="flex w-24 items-baseline justify-end gap-2">
                          <span
                            className={`whitespace-nowrap text-xs font-medium ${
                              position.totalReturn.isPositive ? "text-[#0EE957]" : "text-[#FF0066]"
                            }`}
                          >
                            {position.totalReturn.isPositive ? "+" : "-"}
                            {position.totalReturn.amount}
                          </span>
                          <span
                            className={`whitespace-nowrap text-[10px] ${
                              position.totalReturn.isPositive ? "text-[#0EE957]/70" : "text-[#FF0066]/70"
                            }`}
                          >
                            {position.totalReturn.percentage}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && hasChildren && children.map((c) => (
                    <tr key={c.id} style={{ background: "linear-gradient(0deg, rgba(14, 233, 87, 0.02) 0%, rgba(14, 233, 87, 0.04) 100%)" }}>
                      <td className="px-3 py-2 border-b border-[#2A2A2A]">
                        <div className="flex items-center gap-3 pl-[52px]">
                          <Shield className="h-3.5 w-3.5 text-[#0EE957]" />
                          <div>
                            <span className="text-xs text-zinc-300 block">{c.choice?.team || c.matchName}</span>
                            <ModelLabel label={c.modelLabel} />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-zinc-400 border-b border-[#2A2A2A]">{c.lastTraded}</td>
                      <td className="px-2 py-2 text-right text-xs text-zinc-400 border-b border-[#2A2A2A]">{c.contracts}</td>
                      <td className="px-2 py-2 text-right text-xs text-zinc-400 border-b border-[#2A2A2A]">{c.avgPrice}</td>
                      <td className="px-2 py-2 text-right text-xs text-zinc-400 border-b border-[#2A2A2A]">{c.cost}</td>
                      <td className="px-2 py-2 text-right border-b border-[#2A2A2A]">
                        <span className={`text-xs font-medium ${c.totalReturn.isPositive ? "text-[#0EE957]" : "text-[#FF0066]"}`}>
                          {c.totalReturn.isPositive ? "+" : "-"}{c.totalReturn.amount} ({c.totalReturn.percentage})
                        </span>
                      </td>
                    </tr>
                  ))}
                  {isExpanded && (
                    <tr style={{ background: "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F" }}>
                      <td colSpan={6} className={`px-4 py-3 ${borderClass}`}>
                        {matchedGame && position.currentPriceCents != null && (
                          <div className="mb-3">
                            <PositionOddsBars game={matchedGame} positionSide={positionSide} priceCents={position.currentPriceCents} />
                          </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <ChoiceBadge type={position.choice.type} team={position.choice.team} />
                          <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {canShowHighlights && (
                              <button
                                onClick={() => void openHighlights(matchedGame, position.id)}
                                disabled={highlightLoading}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ background: "#121214", boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset" }}
                              >
                                {highlightLoading ? "Loading…" : "Highlights"}
                              </button>
                            )}
                            <button onClick={() => onSharePnl?.(position.id)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:text-zinc-200" style={{ background: "#121214", boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset" }}>Share</button>
                            {onRedeem && <button onClick={() => onRedeem(position.id)} disabled={!!redeeming?.[position.id]} className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "#121214", boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset" }}>{redeeming?.[position.id] ? (isFinal ? "Redeeming…" : "Selling…") : isFinal ? "Redeem" : "Sell"}</button>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
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
                    {formatGameMatchup(highlightDialogGame)}
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
              <HighlightPanel
                clip={activeHighlightClip}
                loading={activeHighlightPending}
                error={activeHighlightError}
              />

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
                  ) : (() => {
                    const dialogPos = highlightDialogPositionId
                      ? positions.find((p) => p.id === highlightDialogPositionId)
                      : null;
                    if (dialogPos?.currentPriceCents == null) {
                      return (
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-zinc-400">
                          {activeOddsError || "No Kalshi odds available for this game yet."}
                        </div>
                      );
                    }
                    const side = resolvePositionSide(dialogPos, highlightDialogGame);
                    return (
                      <PositionOddsBars
                        game={highlightDialogGame}
                        positionSide={side}
                        priceCents={dialogPos.currentPriceCents}
                      />
                    );
                  })()}
                </div>
              ) : null}

              {showRecentPlays ? (
                <div className="mt-4">
                  <RecentPlaysPanel
                    plays={activeRecentPlays}
                    loading={activeRecentPlaysLoading}
                    error={activeRecentPlaysError}
                    nowMs={dialogNowMs}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
