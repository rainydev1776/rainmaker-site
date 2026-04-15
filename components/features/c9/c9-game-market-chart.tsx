"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { C9PricePoint } from "./c9-price-sparkline";

type MergedPoint = {
  ts: number;
  homeCents: number | null;
  awayCents: number | null;
  isHomeLast?: boolean;
  isAwayLast?: boolean;
};

function mergeMarketSeries(
  homeSeries: C9PricePoint[],
  awaySeries: C9PricePoint[]
): MergedPoint[] {
  const home = (Array.isArray(homeSeries) ? homeSeries : [])
    .map((pt) => ({ ts: Number(pt?.ts), cents: Number(pt?.cents) }))
    .filter((pt) => Number.isFinite(pt.ts) && Number.isFinite(pt.cents))
    .sort((a, b) => a.ts - b.ts);
  const away = (Array.isArray(awaySeries) ? awaySeries : [])
    .map((pt) => ({ ts: Number(pt?.ts), cents: Number(pt?.cents) }))
    .filter((pt) => Number.isFinite(pt.ts) && Number.isFinite(pt.cents))
    .sort((a, b) => a.ts - b.ts);

  const stamps = Array.from(new Set([...home.map((pt) => pt.ts), ...away.map((pt) => pt.ts)])).sort(
    (a, b) => a - b
  );
  if (stamps.length < 2) return [];

  let homeIdx = 0;
  let awayIdx = 0;
  let homeLast: number | null = null;
  let awayLast: number | null = null;
  const merged: MergedPoint[] = [];
  const homeLastTs = home.length ? home[home.length - 1].ts : null;
  const awayLastTs = away.length ? away[away.length - 1].ts : null;

  for (const ts of stamps) {
    while (homeIdx < home.length && home[homeIdx].ts <= ts) {
      homeLast = home[homeIdx].cents;
      homeIdx += 1;
    }
    while (awayIdx < away.length && away[awayIdx].ts <= ts) {
      awayLast = away[awayIdx].cents;
      awayIdx += 1;
    }
    if (homeLast === null && awayLast === null) continue;
    merged.push({
      ts,
      homeCents: homeLast,
      awayCents: awayLast,
      isHomeLast: homeLastTs === ts,
      isAwayLast: awayLastTs === ts,
    });
  }

  return merged.slice(-160);
}

function MarketTeamPill({
  label,
  logo,
  fallback,
  accent,
}: {
  label: string;
  logo: string | null;
  fallback: string;
  accent: string;
}) {
  const [hasError, setHasError] = useState(false);
  const initials = (fallback || label || "?").slice(0, 3).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
      <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-[#121214] text-[9px] font-semibold text-zinc-400">
        {logo && !hasError ? (
          <Image
            src={logo}
            alt={label}
            fill
            sizes="24px"
            className="object-contain p-0.5"
            onError={() => setHasError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <span className="max-w-[88px] truncate text-xs font-medium text-zinc-300">{label}</span>
    </div>
  );
}

function renderLastDot(stroke: string, isHome: boolean) {
  return (props: any) => {
    const payload = props?.payload as MergedPoint | undefined;
    const key = isHome ? "homeCents" : "awayCents";
    const value = payload?.[key];
    if (!payload || !Number.isFinite(Number(value))) return <g />;
    if (isHome ? !payload.isHomeLast : !payload.isAwayLast) return <g />;
    return (
      <circle
        cx={props?.cx}
        cy={props?.cy}
        r={3}
        fill={stroke}
        stroke="rgba(0, 0, 0, 0.65)"
        strokeWidth={1}
      />
    );
  };
}

export function C9GameMarketChart({
  homeLabel,
  awayLabel,
  homeLogo,
  awayLogo,
  homeFallback,
  awayFallback,
  homeSeries,
  awaySeries,
}: {
  homeLabel: string;
  awayLabel: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeFallback: string;
  awayFallback: string;
  homeSeries: C9PricePoint[];
  awaySeries: C9PricePoint[];
}) {
  const data = useMemo(() => mergeMarketSeries(homeSeries, awaySeries), [homeSeries, awaySeries]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <MarketTeamPill
          label={awayLabel}
          logo={awayLogo}
          fallback={awayFallback}
          accent="#D4D4D8"
        />
        <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#757575]">
          Kalshi Live Market
        </span>
        <MarketTeamPill
          label={homeLabel}
          logo={homeLogo}
          fallback={homeFallback}
          accent="#0EE957"
        />
      </div>

      {data.length < 2 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-white/[0.04] bg-[#121214] px-4 text-center text-sm text-zinc-400">
          Market line will appear as live Kalshi ticks come in.
        </div>
      ) : (
        <div className="h-40 rounded-lg border border-white/[0.04] bg-[#121214] px-2 py-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 8, bottom: 10, left: 8 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
              <YAxis hide domain={[0, 100]} />
              <Line
                type="monotone"
                dataKey="awayCents"
                stroke="#D4D4D8"
                strokeWidth={2}
                dot={renderLastDot("#D4D4D8", false)}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="homeCents"
                stroke="#0EE957"
                strokeWidth={2}
                dot={renderLastDot("#0EE957", true)}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
