import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ESPN_URLS: Record<string, string> = {
  NBA: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  NFL: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  MLB: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  NHL: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
  CFB: "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
  CBB: "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard",
};

interface GameFeedItem {
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
  homeWinProb: number | null; // 0..1 (ESPN win probability)
  awayWinProb: number | null; // 0..1 (ESPN win probability)
  homeColor: string | null;
  awayColor: string | null;
  homeRecord: string | null;
  awayRecord: string | null;
}

function toEspnScoreboardYmd(dateMs: number): string {
  // ESPN scoreboard `dates=` expects YYYYMMDD in America/New_York.
  const s = new Date(dateMs)
    .toLocaleDateString("en-CA", { timeZone: "America/New_York" })
    .replace(/-/g, "");
  return s;
}

function finite01(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function derivePulseLabel({
  lastPlayType,
  lastPlayText,
  scoreValue,
  statusText,
}: {
  lastPlayType: string | null;
  lastPlayText: string | null;
  scoreValue: number | null;
  statusText: string | null;
}): string | null {
  const type = String(lastPlayType || "").trim().toLowerCase();
  const text = String(lastPlayText || "").trim().toLowerCase();
  const st = String(statusText || "").trim().toLowerCase();
  const sv = Number(scoreValue);

  if (type.includes("timeout") || text.includes("timeout")) return "Timeout";
  if (type.includes("challenge") || text.includes("challenge")) return "Challenge";
  if (type.includes("review") || text.includes("review")) return "Review";
  if (type.includes("jump ball") || type.includes("jumpball") || text.includes("jump ball")) return "Jumpball";

  // These tend to appear inside the play text (e.g. "(X steals)", "blocks ...")
  if (/\bsteal(s)?\b/.test(text)) return "Steal";
  if (/\bblock(s|ed)?\b/.test(text)) return "Block";

  if (type.includes("turnover") || text.includes("turnover")) return "TO";
  if (type.includes("foul") || text.includes("foul")) return "Foul";
  if (type.includes("rebound") || text.includes("rebound")) return "Rebound";
  if (type.includes("substitution") || text.includes("substitution")) return "Sub";
  if (type.includes("ejection") || text.includes("eject")) return "Eject";

  if (Number.isFinite(sv) && sv > 0) {
    if (sv === 3) return "3PT";
    if (sv === 2) return "+2";
    if (sv === 1) return "FT";
    return `+${sv}`;
  }

  // Missed shots are 0 points; ESPN text is usually "X misses ... (three point ...)"
  if (text.includes("misses") || text.includes("missed")) {
    if (text.includes("three point") || text.includes("3-point") || text.includes("3 point")) return "Miss3";
    if (text.includes("free throw")) return "MissFT";
    return "Miss";
  }

  if (text.includes("dunk")) return "Dunk";

  if (type.includes("end period")) {
    if (st.includes("half")) return "Halftime";
    const m = text.match(/end of (?:the )?(\\d)(?:st|nd|rd|th) quarter/);
    if (m?.[1]) return `End Q${m[1]}`;
    if (st.startsWith("end of")) return statusText || "End";
    return "End";
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const sports =
      req.nextUrl.searchParams
        .get("sports")
        ?.split(",")
        .map((sport) => sport.trim().toUpperCase())
        .filter(Boolean) || ["NBA"];
    const now = Date.now();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const recentFinalsMs = 108 * 60 * 60 * 1000;
    const datesStart = toEspnScoreboardYmd(now - recentFinalsMs);
    const datesEnd = toEspnScoreboardYmd(now + twelveHoursMs);
    const datesQuery = datesStart === datesEnd ? datesStart : `${datesStart}-${datesEnd}`;

    const results: GameFeedItem[] = [];

    await Promise.all(
      sports.map(async (sport) => {
        const url = ESPN_URLS[sport.toUpperCase()];
        if (!url) return;
        try {
          const requestUrl = url.includes("?") ? `${url}&dates=${datesQuery}` : `${url}?dates=${datesQuery}`;
          const res = await fetch(requestUrl, {
            next: { revalidate: 15 },
            headers: { "User-Agent": "RainmakerApp/1.0" },
          });
          if (!res.ok) return;
          const data = await res.json();
          const events = data?.events;
          if (!Array.isArray(events)) return;

          for (const ev of events) {
            const comp = ev?.competitions?.[0];
            if (!comp) continue;

            const statusObj = comp?.status || ev?.status;
            const stateRaw = String(statusObj?.type?.state || "").toLowerCase();
            const status: "pre" | "live" | "post" =
              stateRaw === "in" ? "live" : stateRaw === "post" ? "post" : "pre";

            const startTimeStr = comp?.date || ev?.date || null;
            const startTime = startTimeStr ? new Date(startTimeStr) : null;

            // Only include live games, recent finals, or games starting within 12 hours.
            if (status === "pre" && startTime) {
              const diff = startTime.getTime() - now;
              if (diff > twelveHoursMs || diff < -twelveHoursMs) continue;
            }
            if (status === "post" && startTime) {
              const diffSinceStart = now - startTime.getTime();
              if (diffSinceStart > recentFinalsMs) continue;
            }
            if (status === "post" && !startTime) continue;

            const competitors = comp?.competitors || [];
            const home = competitors.find((c: any) => c?.homeAway === "home");
            const away = competitors.find((c: any) => c?.homeAway === "away");
            if (!home || !away) continue;

            const statusText = statusObj?.type?.shortDetail || statusObj?.type?.detail || null;
            const clock = statusObj?.displayClock || null;

            const lastPlay = comp?.situation?.lastPlay || null;
            const lastPlayType = lastPlay?.type?.text ? String(lastPlay.type.text) : null;
            const lastPlayText = lastPlay?.text ? String(lastPlay.text) : null;
            const lastPlayScoreValueRaw = Number(lastPlay?.scoreValue ?? NaN);
            const lastPlayScoreValue = Number.isFinite(lastPlayScoreValueRaw) ? lastPlayScoreValueRaw : null;
            const pulseLabel =
              status === "live"
                ? derivePulseLabel({
                    lastPlayType,
                    lastPlayText,
                    scoreValue: lastPlayScoreValue,
                    statusText,
                  })
                : null;
            const homeWinProb = status === "live" ? finite01(lastPlay?.probability?.homeWinPercentage) : null;
            const awayWinProb = status === "live" ? finite01(lastPlay?.probability?.awayWinPercentage) : null;

            results.push({
              id: String(ev?.id || `${sport}-${home?.team?.abbreviation}-${away?.team?.abbreviation}`),
              sport: sport.toUpperCase(),
              homeTeam: home?.team?.displayName || home?.team?.shortDisplayName || "",
              awayTeam: away?.team?.displayName || away?.team?.shortDisplayName || "",
              homeShort: home?.team?.shortDisplayName || home?.team?.name || home?.team?.abbreviation || "",
              awayShort: away?.team?.shortDisplayName || away?.team?.name || away?.team?.abbreviation || "",
              homeAbbr: home?.team?.abbreviation || "",
              awayAbbr: away?.team?.abbreviation || "",
              homeLogo: home?.team?.logo || null,
              awayLogo: away?.team?.logo || null,
              homeScore: status !== "pre" ? Number(home?.score || 0) : null,
              awayScore: status !== "pre" ? Number(away?.score || 0) : null,
              period: status !== "pre" ? statusText : null,
              clock: status === "live" ? clock : null,
              statusText,
              status,
              startTime: startTimeStr || null,
              pulseLabel,
              pulseText: status === "live" ? lastPlayText : null,
              homeWinProb,
              awayWinProb,
              homeColor: home?.team?.color ? `#${home.team.color}` : null,
              awayColor: away?.team?.color ? `#${away.team.color}` : null,
              homeRecord: home?.records?.[0]?.summary || null,
              awayRecord: away?.records?.[0]?.summary || null,
            });
          }
        } catch {
          // skip sport on error
        }
      })
    );

    return NextResponse.json({ ok: true, games: results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "games_feed_error", games: [] },
      { status: 500 }
    );
  }
}
