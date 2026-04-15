"use client";

import { TrendingUp, TrendingDown, MinusCircle } from "lucide-react";

interface PortfolioPnlCardProps {
  totalValue: number;
  pnlAmount: number;
  pnlPercentage: number;
  positions: number;
  cash: number;
  timeRange: "7d" | "30d" | "all";
  onTimeRangeChange: (range: "7d" | "30d" | "all") => void;
  onResetPnl?: () => void;
  pnlResetActive?: boolean;
}

export const PortfolioPnlCard = ({
  totalValue,
  pnlAmount,
  pnlPercentage,
  positions,
  cash,
  timeRange,
  onTimeRangeChange,
  onResetPnl,
  pnlResetActive = false,
}: PortfolioPnlCardProps) => {
  const isPositive = pnlAmount >= 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const timeRanges: { label: string; value: "7d" | "30d" | "all" }[] = [
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 sm:rounded-2xl sm:p-6"
      style={{
        background:
          "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
      }}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{
          backgroundImage: "url('/c9-pnl-bg.png')",
          backgroundPosition: "right center",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Total Value & P&L */}
        <div>
          <p className="text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
            {formatCurrency(totalValue)}
          </p>
          <div className="mt-1.5 flex items-center gap-2 sm:mt-2">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-[#0EE957]" />
            ) : (
              <TrendingDown className="h-4 w-4 text-[#FF0066]" />
            )}
            <span
              className={`text-xs font-medium sm:text-sm ${
                isPositive ? "text-[#0EE957]" : "text-[#FF0066]"
              }`}
            >
              {isPositive ? "+" : "-"}
              {formatCurrency(Math.abs(pnlAmount))} ({pnlPercentage}%)
            </span>
          </div>
        </div>

        {/* Right: Time Range Tabs + Positions & Cash */}
        <div className="flex flex-col gap-3 sm:items-end sm:gap-4">
          {/* Time Range Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => onTimeRangeChange(range.value)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all sm:px-3 sm:text-xs ${
                  timeRange === range.value
                    ? "bg-white/10 text-white"
                    : "text-[#757575] hover:text-zinc-300"
                }`}
              >
                {range.label}
              </button>
            ))}
            {onResetPnl && (
              <button
                type="button"
                onClick={onResetPnl}
                title="Reset PnL baseline (hide older history)"
                className={`ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all sm:h-9 sm:w-9 ${
                  pnlResetActive
                    ? "bg-white/10 text-white"
                    : "text-[#757575] hover:bg-white/5 hover:text-zinc-300"
                }`}
              >
                <MinusCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Positions & Cash */}
          <div className="flex gap-6 sm:gap-8 sm:text-right">
            <div>
              <p className="text-[11px] text-[#757575] sm:text-xs">Positions</p>
              <p className="mt-0.5 text-base font-medium text-white sm:mt-1 sm:text-lg">
                {formatCurrency(positions)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#757575] sm:text-xs">Cash</p>
              <p className="mt-0.5 text-base font-medium text-white sm:mt-1 sm:text-lg">
                {formatCurrency(cash)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
