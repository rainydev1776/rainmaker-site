"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

// Helpers
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

// Component registry - maps component names to React components
export const registry: Record<string, React.FC<{ props: any }>> = {
  LiveScore: ({ props }) => {
    const { homeTeam, homeScore, awayTeam, awayScore, period, clock, state, yourPick } = props;
    const isLive = state === "in";
    const isPost = state === "post";

    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">Live Score</span>
          {isLive && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-white">
            <span className={yourPick === homeTeam ? "text-cyan-400 font-semibold" : ""}>{homeTeam}</span>
            <span className="text-xl font-bold">{homeScore}</span>
          </div>
          <div className="flex items-center justify-between text-white">
            <span className={yourPick === awayTeam ? "text-cyan-400 font-semibold" : ""}>{awayTeam}</span>
            <span className="text-xl font-bold">{awayScore}</span>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-3">
          {isLive ? `${period} • ${clock}` : isPost ? "Final" : "Upcoming"}
        </p>
      </div>
    );
  },

  MetricCard: ({ props }) => {
    const { label, value, isPositive, format } = props;
    const formatted =
      format === "currency"
        ? fmtUsd(Number(value))
        : format === "percent"
        ? fmtPct(Number(value))
        : String(value);

    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
        <div
          className={`text-2xl font-bold mt-1 ${
            isPositive === true ? "text-[#0EE957]" : isPositive === false ? "text-[#FF0066]" : "text-white"
          }`}
        >
          {formatted}
        </div>
      </div>
    );
  },

  ProgressBar: ({ props }) => {
    const { label, startValue, endValue, currentValue, isPositive } = props;
    const range = endValue - startValue;
    const pct = range > 0 ? ((currentValue - startValue) / range) * 100 : 0;

    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">{label}</span>
          <span className={`text-sm font-medium ${isPositive ? "text-[#0EE957]" : "text-[#FF0066]"}`}>
            {currentValue}¢
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isPositive ? "bg-[#0EE957]" : "bg-[#FF0066]"}`}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
          <span>{startValue}¢</span>
          <span>{endValue}¢</span>
        </div>
      </div>
    );
  },

  Text: ({ props }) => {
    const { content, variant = "body", color = "default" } = props;
    const colorMap = {
      default: "text-white",
      muted: "text-zinc-400",
      success: "text-[#0EE957]",
      warning: "text-yellow-400",
      danger: "text-[#FF0066]",
    } as const;
    const variantMap = {
      body: "text-sm",
      caption: "text-xs text-zinc-500",
      label: "text-xs uppercase tracking-wide text-zinc-500",
    } as const;

    const colorKey = String(color || "default");
    const variantKey = String(variant || "body");

    const colorClass =
      colorKey in colorMap ? colorMap[colorKey as keyof typeof colorMap] : colorMap.default;
    const variantClass =
      variantKey in variantMap ? variantMap[variantKey as keyof typeof variantMap] : variantMap.body;

    return <p className={`${variantClass} ${colorClass}`}>{content}</p>;
  },

  ScenarioCard: ({ props }) => {
    const { outcome, payout, profit, roi, isPositive, probability } = props;

    return (
      <div
        className="rounded-xl p-4 border"
        style={{
          background: isPositive ? "rgba(14, 233, 87, 0.05)" : "rgba(255, 0, 102, 0.05)",
          borderColor: isPositive ? "rgba(14, 233, 87, 0.2)" : "rgba(255, 0, 102, 0.2)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">{outcome}</span>
          {probability !== undefined && (
            <span className="text-xs text-zinc-500">{probability}% chance</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase">Payout</span>
            <p className="text-sm font-semibold text-white">{fmtUsd(payout)}</p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase">Profit</span>
            <p className={`text-sm font-semibold ${isPositive ? "text-[#0EE957]" : "text-[#FF0066]"}`}>
              {fmtUsd(profit)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase">ROI</span>
            <p className={`text-sm font-semibold ${isPositive ? "text-[#0EE957]" : "text-[#FF0066]"}`}>
              {fmtPct(roi)}
            </p>
          </div>
        </div>
      </div>
    );
  },

  BarChart: ({ props }) => {
    const { data, title } = props;

    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
        {title && <span className="text-xs text-zinc-500 uppercase tracking-wide">{title}</span>}
        <div className="h-40 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={entry.value >= 0 ? "#0EE957" : "#FF0066"} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  },
};


