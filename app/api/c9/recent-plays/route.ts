import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUMMARY_ENDPOINTS: Record<string, string> = {
  NBA: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary",
  MLB: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary",
  NHL: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary",
};

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 8;

type EspnPlay = {
  id?: string | number;
  type?: { text?: string };
  text?: string;
  awayScore?: number | string;
  homeScore?: number | string;
  period?: { displayValue?: string };
  clock?: { displayValue?: string };
  scoreValue?: number | string;
  scoringPlay?: boolean;
  wallclock?: string;
};

function toFiniteInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizePeriodLabel(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (upper.includes("SHOOTOUT")) return "SO";
  if (upper.includes("HALF")) return "Half";
  if (upper.includes("INTERMISSION")) return "INT";
  if (upper.includes("OVERTIME")) {
    const match = raw.match(/(\d+)(?:ST|ND|RD|TH)?\s*OVERTIME/i);
    return match?.[1] ? `OT${match[1]}` : "OT";
  }

  const match = raw.match(/(\d+)(?:ST|ND|RD|TH)/i);
  if (match?.[0]) return match[0];

  return raw;
}

function derivePlayLabel(play: EspnPlay, sport: string): string {
  const type = String(play?.type?.text || "").trim().toLowerCase();
  const text = String(play?.text || "").trim().toLowerCase();
  const scoreValue = toFiniteInt(play?.scoreValue);
  const s = String(sport || "").toUpperCase();

  if (scoreValue && scoreValue > 0) {
    if (s === "MLB") return `+${scoreValue} ${scoreValue === 1 ? "Run" : "Runs"}`;
    if (s === "NHL") return scoreValue === 1 ? "Goal" : `+${scoreValue} Goals`;
    return `+${scoreValue} ${scoreValue === 1 ? "Point" : "Points"}`;
  }

  if (type.includes("timeout") || text.includes("timeout")) return "Timeout";
  if (type.includes("challenge") || text.includes("challenge")) return "Challenge";
  if (type.includes("review") || text.includes("review")) return "Review";
  if (type.includes("jump") || text.includes("jump ball")) return "Jump Ball";
  if (type.includes("turnover") || text.includes("turnover") || text.includes("lost ball")) return "Turnover";
  if (type.includes("foul") || text.includes("foul")) return "Foul";
  if (type.includes("rebound") || text.includes("rebound")) return "Rebound";
  if (type.includes("substitution") || text.includes("substitution")) return "Substitution";
  if (type.includes("ejection") || text.includes("eject")) return "Ejection";
  if (/\bsteal(s)?\b/.test(text) || type.includes("steal")) return "Steal";
  if (/\bblock(s|ed)?\b/.test(text) || type.includes("block")) return "Block";

  if (text.includes("misses") || text.includes("missed")) {
    if (text.includes("free throw")) return "Missed FT";
    return "Missed FG";
  }

  if (type.includes("end period") || text.includes("end of the")) return "End Period";

  const fallback = String(play?.type?.text || "").trim();
  return fallback || "Play";
}

export async function GET(req: NextRequest) {
  const sport = req.nextUrl.searchParams.get("sport")?.toUpperCase() || "NBA";
  const eventId = req.nextUrl.searchParams.get("eventId")?.trim() || "";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") || DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(limitRaw)))
    : DEFAULT_LIMIT;

  if (!eventId) {
    return NextResponse.json(
      { ok: false, message: "Missing eventId", plays: [] },
      { status: 400 }
    );
  }

  const endpoint = SUMMARY_ENDPOINTS[sport];
  if (!endpoint) {
    return NextResponse.json(
      { ok: false, message: "Unsupported sport", plays: [] },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${endpoint}?event=${encodeURIComponent(eventId)}`, {
      headers: {
        accept: "application/json",
        "user-agent": "RainmakerC9/1.0",
      },
      next: { revalidate: 5 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: "ESPN recent plays fetch failed", plays: [] },
        { status: 502 }
      );
    }

    const data = await res.json();
    const plays = Array.isArray(data?.plays) ? (data.plays as EspnPlay[]) : [];

    const recentPlays = plays
      .slice(-limit)
      .reverse()
      .map((play) => ({
        id: String(play?.id || ""),
        label: derivePlayLabel(play, sport),
        text: String(play?.text || "").trim(),
        clock: play?.clock?.displayValue ? String(play.clock.displayValue) : null,
        period: normalizePeriodLabel(play?.period?.displayValue),
        wallclock: play?.wallclock ? String(play.wallclock) : null,
        awayScore: toFiniteInt(play?.awayScore),
        homeScore: toFiniteInt(play?.homeScore),
        scoringPlay: Boolean(play?.scoringPlay),
      }))
      .filter((play) => play.id || play.text || play.label);

    return NextResponse.json({
      ok: true,
      plays: recentPlays,
      message: recentPlays.length ? null : "No recent plays available yet.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: `ESPN recent plays error: ${(error as Error).message}`,
        plays: [],
      },
      { status: 500 }
    );
  }
}
