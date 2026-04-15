"use client";

import { LineChart, Line, ResponsiveContainer, ReferenceLine } from "recharts";

export type C9PricePoint = {
  ts: number; // ms since epoch
  cents: number;
};

export const C9PriceSparkline = ({
  data,
  stroke,
  entryPriceCents,
}: {
  data: C9PricePoint[];
  stroke: string;
  entryPriceCents?: number;
}) => {
  const points = Array.isArray(data) ? data : [];
  if (points.length < 2) {
    return (
      <div
        className="h-8 w-24 rounded-md"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.08) inset",
        }}
      />
    );
  }

  const lastIdx = points.length - 1;

  return (
    <div
      className="h-8 w-24 rounded-md"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.08) inset",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, bottom: 4, left: 4, right: 4 }}>
          {Number.isFinite(Number(entryPriceCents)) && Number(entryPriceCents) > 0 ? (
            <ReferenceLine
              y={Number(entryPriceCents)}
              stroke="rgba(255, 255, 255, 0.10)"
              strokeDasharray="3 3"
            />
          ) : null}
          {/* Glow pass */}
          <Line
            type="monotone"
            dataKey="cents"
            stroke={stroke}
            strokeWidth={4}
            strokeOpacity={0.22}
            dot={false}
            isAnimationActive={false}
          />
          {/* Main stroke */}
          <Line
            type="monotone"
            dataKey="cents"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={(p: any) => {
              if (p?.index !== lastIdx) return <g />;
              return (
                <circle
                  cx={p?.cx}
                  cy={p?.cy}
                  r={2.5}
                  fill={stroke}
                  stroke="rgba(0, 0, 0, 0.6)"
                  strokeWidth={1}
                />
              );
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};


