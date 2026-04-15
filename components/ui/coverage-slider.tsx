"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, BadgeInfo } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type CoverageBacktestInfo = {
  /** Human label for the assumptions behind the stats (kept short). */
  label: string;
  /** Trades used to compute the stats. */
  trades: number;
  /** Total PnL in USD across that window. */
  pnlUsd: number;
  /** Avg % of stake recovered on pair losses (coverage ON). */
  avgRecoveredPctOnLosses: number;
  /** Avg % of stake recovered on the same losses with main-only (coverage OFF). */
  avgRecoveredPctOnLossesMainOnly: number;
};

interface CoverageSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  /** Optional: show a small info tooltip with backtest-based recovery numbers. */
  backtestInfo?: CoverageBacktestInfo | null;
}

export function CoverageSlider({
  value,
  onChange,
  // KAGE-safe default clamp (UI): keep coverage light.
  // NOTE: backend also clamps to <=1.1x so this is mostly UX.
  min = 1.01,
  max = 1.1,
  step = 0.01,
  enabled = false,
  onEnabledChange,
  backtestInfo = null,
}: CoverageSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const decimals = (() => {
    const s = String(step);
    const i = s.indexOf(".");
    if (i === -1) return 0;
    return Math.min(6, Math.max(0, s.length - i - 1));
  })();

  const safeMax = Math.max(min, max);
  const totalSteps = Math.max(1, Math.round((safeMax - min) / step));
  const currentStep = Math.max(0, Math.min(totalSteps, Math.round((value - min) / step)));

  const handleMove = (clientX: number) => {
    if (!trackRef.current || !enabled) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const rawValue = min + pct * (safeMax - min);
    const snapped = Math.round(rawValue / step) * step;
    const clamped = Math.max(min, Math.min(safeMax, snapped));
    onChange(Number(clamped.toFixed(decimals)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enabled) return;
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled) return;
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const handleEnd = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, enabled]);

  const yesPct = Math.round(100 / Math.max(1.000001, value));
  const noPct = 100 - yesPct;
  const estRecoveryPct = (() => {
    // Backtest-informed heuristic:
    // Scale the observed recovery at 1.1× by the hedge allocation (%).
    // This keeps the UI informative without implying exact guarantees.
    const base = backtestInfo?.avgRecoveredPctOnLosses ?? null;
    if (!(typeof base === "number" && Number.isFinite(base) && base > 0)) return null;
    const baseHedgePct = 9; // covX=1.1 => ~91/9 via yesPct rounding
    const scaled = baseHedgePct > 0 ? (base * Math.max(0, noPct)) / baseHedgePct : base;
    return Math.max(0, Math.min(99, scaled));
  })();

  return (
    <div className={`space-y-3 ${!enabled ? "opacity-50" : ""}`}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-zinc-300 font-medium">
          <Shield className="h-4 w-4 text-emerald-400" />
          Coverage™
        </label>
        {/* Toggle switch */}
        <button
          type="button"
          onClick={() => onEnabledChange?.(!enabled)}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{
            background: enabled ? "#2A2A2A" : "#3f3f46",
          }}
        >
          <div
            className="absolute top-1 w-4 h-4 rounded-full transition-all"
            style={{
              left: enabled ? "calc(100% - 20px)" : "4px",
              background: enabled ? "#0EE957" : "#71717a",
            }}
          />
        </button>
      </div>

      {/* Slider row */}
      <div className="flex items-center gap-3">
        {/* Track container - position relative for thumb */}
        <div
          ref={trackRef}
          className="relative flex-1 h-14 cursor-pointer select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Ticks */}
          <div className="flex items-center justify-between h-full">
            {Array.from({ length: totalSteps + 1 }).map((_, i) => (
              <div
                key={i}
                className="w-[2px] h-6 rounded-full"
                style={{
                  background: enabled && i <= currentStep 
                    ? "#0EE957" 
                    : "rgba(255,255,255,0.2)",
                  boxShadow: enabled && i <= currentStep 
                    ? "0 0 4px #0EE957" 
                    : "none",
                }}
              />
            ))}
          </div>

        </div>

        {/* Value badge */}
        <div
          className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white min-w-[52px] text-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          {Number(value).toFixed(Math.min(2, decimals))}×
        </div>
      </div>

      {/* Explainer */}
      <div
        className="rounded-xl p-3"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <p className="text-xs text-zinc-400 leading-relaxed">
          The opposite of leverage — this feature lets you recover up to a set % of your losses if the agent doesn't win.
        </p>
        <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-200 font-medium">{yesPct}% / {noPct}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-zinc-500">
              Recovery
              {backtestInfo ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center text-zinc-500 transition-colors hover:text-zinc-300"
                      aria-label="Coverage recovery info"
                    >
                      <BadgeInfo className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={8}
                    className="max-w-[280px] bg-[#141416] text-zinc-200 border border-white/[0.08]"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold">Coverage recovery (backtest)</div>
                      <div className="text-xs text-zinc-300">
                        {backtestInfo.label}
                      </div>
                      <div className="text-xs text-zinc-300">
                        Avg recovered on losses: {backtestInfo.avgRecoveredPctOnLosses.toFixed(2)}% (with coverage)
                      </div>
                      <div className="text-xs text-zinc-400">
                        Main-only baseline: {backtestInfo.avgRecoveredPctOnLossesMainOnly.toFixed(2)}%
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </span>
            <span className="text-emerald-400 font-medium">
              {estRecoveryPct != null ? `~${estRecoveryPct.toFixed(1)}%` : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
