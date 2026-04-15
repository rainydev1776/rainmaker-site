"use client";

import { ChoiceBadge } from "@/components/ui/choice-badge";
import { SportIcon } from "@/components/ui/sport-icon";

export interface C9LivePnlCardPosition {
  id: string; // ticker
  sportIcon: string;
  sportCategory: string;
  matchName: string;
  team: string;
  entryPriceCents: number;
  currentPriceCents: number;
  quantity: number;
  costUsd: number;
}

interface C9LivePnlCardProps {
  position: C9LivePnlCardPosition;
  onSharePnl?: (positionId: string) => void;
  onRedeem?: (positionId: string) => void;
  redeeming?: boolean;
}

function fmtUsd(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export const C9LivePnlCard = ({
  position,
  onSharePnl,
  onRedeem,
  redeeming,
}: C9LivePnlCardProps) => {
  const entryCents = Number(position.entryPriceCents || 0);
  const curCents = Number(position.currentPriceCents || 0);
  const qty = Number(position.quantity || 0);

  // Prefer backend-reported invested amount (fees included). Fallback to entry * qty.
  const investedUsd =
    Number.isFinite(Number(position.costUsd)) && Number(position.costUsd) > 0
      ? Number(position.costUsd)
      : (entryCents / 100) * qty;

  // Live mark-to-market PnL: sell-now value minus invested.
  const sellNowValueUsd = (curCents / 100) * qty;
  const pnlUsd = sellNowValueUsd - investedUsd;
  const pnlPct = investedUsd > 0 ? (pnlUsd / investedUsd) * 100 : 0;
  const isPositive = pnlUsd >= 0;

  const pnlColor = isPositive ? "#0EE957" : "#FF0066";
  const pnlBg = isPositive ? "rgba(14, 233, 87, 0.12)" : "rgba(255, 0, 102, 0.12)";
  const sign = isPositive ? "+" : "-";

  return (
    <div
      className="relative overflow-hidden rounded-xl p-4"
      style={{
        background:
          "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <SportIcon src={position.sportIcon} alt={position.sportCategory} size="sm" />
          <div className="min-w-0">
            <p className="text-xs text-[#757575]">{position.sportCategory}</p>
            <p className="mt-0.5 truncate text-sm font-medium text-white">
              {position.matchName}
            </p>
            <div className="mt-2">
              <ChoiceBadge type="yes" team={position.team} />
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xl font-semibold tracking-tight" style={{ color: pnlColor }}>
            {sign}
            {fmtUsd(Math.abs(pnlUsd))}
          </p>
          <div
            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
            style={{
              background: pnlBg,
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.08) inset",
              color: pnlColor,
            }}
          >
            <span>{isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(pnlPct).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#757575]">
            Invested
          </p>
          <p className="mt-1 text-sm font-medium text-white">{fmtUsd(investedUsd)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#757575]">
            Avg entry
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {entryCents > 0 ? `${entryCents}¢` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#757575]">
            Sell now
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {curCents > 0 ? `${curCents}¢` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-[#757575]">{Number.isFinite(qty) ? `${qty} contracts` : ""}</p>
        <div className="flex items-center gap-2">
          {onRedeem && (
            <button
              onClick={() => onRedeem(position.id)}
              disabled={redeeming}
              className="rounded-lg px-3 py-2 text-sm text-white transition-colors hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "#121214",
                boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
              }}
            >
              {redeeming ? "Selling…" : "Sell"}
            </button>
          )}
          {onSharePnl && (
            <button
              onClick={() => onSharePnl(position.id)}
              className="rounded-lg px-3 py-2 text-sm text-white transition-colors hover:text-zinc-200"
              style={{
                background: "#121214",
                boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
              }}
            >
              Share PNL
            </button>
          )}
        </div>
      </div>
    </div>
  );
};





