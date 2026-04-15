import type { SupabaseClient } from "@supabase/supabase-js";

export type C9TickerLabel = {
  matchName: string;
  team: string | null;
};

type C9GamesRow = {
  home_team: string | null;
  away_team: string | null;
  kalshi_home_ticker: string | null;
  kalshi_away_ticker: string | null;
};

function fmtMatchName(row: Pick<C9GamesRow, "home_team" | "away_team">): string | null {
  const home = String(row?.home_team || "").trim();
  const away = String(row?.away_team || "").trim();
  if (!home || !away) return null;
  return `${away} at ${home}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function fetchC9TickerLabels(
  supabase: SupabaseClient,
  tickers: string[]
): Promise<Record<string, C9TickerLabel>> {
  const uniq = Array.from(
    new Set(
      (Array.isArray(tickers) ? tickers : [])
        .map((t) => String(t || "").trim())
        .filter(Boolean)
    )
  );
  if (uniq.length === 0) return {};

  const out: Record<string, C9TickerLabel> = {};
  const cols = "home_team,away_team,kalshi_home_ticker,kalshi_away_ticker";

  for (const batch of chunk(uniq, 50)) {
    const [homeRes, awayRes] = await Promise.all([
      supabase.from("c9_games").select(cols).in("kalshi_home_ticker", batch),
      supabase.from("c9_games").select(cols).in("kalshi_away_ticker", batch),
    ]);

    const rows: C9GamesRow[] = [
      ...(Array.isArray(homeRes.data) ? (homeRes.data as any[]) : []),
      ...(Array.isArray(awayRes.data) ? (awayRes.data as any[]) : []),
    ];

    for (const r of rows) {
      const matchName = fmtMatchName(r) || "";
      const homeTicker = String(r?.kalshi_home_ticker || "").trim();
      const awayTicker = String(r?.kalshi_away_ticker || "").trim();

      if (homeTicker && batch.includes(homeTicker) && !out[homeTicker]) {
        out[homeTicker] = { matchName: matchName || homeTicker, team: r?.home_team || null };
      }
      if (awayTicker && batch.includes(awayTicker) && !out[awayTicker]) {
        out[awayTicker] = { matchName: matchName || awayTicker, team: r?.away_team || null };
      }
    }
  }

  return out;
}










