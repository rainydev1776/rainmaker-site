"use client";

import { useEffect, useState } from "react";
import { Medal, TrendingUp, TrendingDown } from "lucide-react";

interface C9PnlCardProps {
  totalPnl: number;
  pnlPct?: number | null;
  onShareClick?: () => void;
  backgroundVideoSrc?: string | null;
  backgroundPosterSrc?: string | null;
  backgroundVideoMaxSeconds?: number;
}

export const C9PnlCard = ({
  totalPnl,
  pnlPct,
  onShareClick,
  backgroundVideoSrc,
  backgroundPosterSrc,
  backgroundVideoMaxSeconds = 20,
}: C9PnlCardProps) => {
  const isPositive = totalPnl >= 0;
  const formattedPnl = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(totalPnl));
  const pctDisplay = pnlPct != null && Number.isFinite(pnlPct) ? Math.abs(pnlPct * 100).toFixed(0) : null;
  const [videoErrored, setVideoErrored] = useState(false);

  useEffect(() => {
    setVideoErrored(false);
  }, [backgroundVideoSrc]);

  const showVideo = Boolean(backgroundVideoSrc) && !videoErrored;
  const fallbackBg = String(backgroundPosterSrc || "").trim() || "/c9-pnl-bg.png";
  const highlightOverlay = "/c9-highlight-overlay.png";
  const shouldShowReadabilityOverlay = showVideo || fallbackBg !== "/c9-pnl-bg.png";
  const shouldDesaturateBg = fallbackBg !== "/c9-pnl-bg.png";

  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 flex flex-col justify-between sm:rounded-2xl sm:p-6 lg:p-8"
      style={{
        background:
          "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
      }}
    >
      {/* Background Media */}
      {showVideo ? (
        <>
          {/* Isolate video + overlay so mix-blend-lighten blends against the video, not the dark parent */}
          <div className="absolute inset-0" style={{ isolation: "isolate" }}>
            <video
              key={backgroundVideoSrc}
              src={backgroundVideoSrc ?? undefined}
              poster={backgroundPosterSrc || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: "saturate(0) brightness(0.9)" }}
              onError={() => setVideoErrored(true)}
              onTimeUpdate={(event) => {
                const limit = Number(backgroundVideoMaxSeconds || 0);
                if (!(Number.isFinite(limit) && limit > 0)) return;
                const video = event.currentTarget;
                if (video.currentTime < limit) return;
                video.currentTime = 0;
                void video.play().catch(() => {});
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none mix-blend-lighten"
              style={{
                backgroundImage: `url('${highlightOverlay}')`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
              }}
            />
          </div>
          {/* Dim the composited result to sit as a background */}
          <div className="absolute inset-0 pointer-events-none bg-black/50" />
          {/* Readability darkener */}
          {shouldShowReadabilityOverlay ? (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.48) 46%, rgba(0,0,0,0) 78%)",
              }}
            />
          ) : null}
        </>
      ) : (
        <>
          <img
            src={fallbackBg}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-40 pointer-events-none"
            style={{
              objectPosition: "right center",
              filter: shouldDesaturateBg ? "saturate(0) brightness(0.9)" : undefined,
            }}
          />
          {/* If we're using an ESPN poster (not the default bg), add the same readability overlay */}
          {shouldShowReadabilityOverlay ? (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.48) 46%, rgba(0,0,0,0) 78%)",
              }}
            />
          ) : null}
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-xs text-zinc-400 sm:text-sm">Total P&amp;L</p>
          <p
            className={`mt-2 text-2xl font-semibold tracking-tight sm:mt-3 sm:text-3xl lg:mt-4 lg:text-4xl ${
              isPositive ? "text-white" : "text-[#FF0066]"
            }`}
          >
            {isPositive ? "+" : "-"}
            {formattedPnl}
          </p>
          {pctDisplay && (
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
                {isPositive ? "+" : "-"}{pctDisplay}%
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onShareClick}
          className="flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-[#0EE957] bg-[#16281D] transition-all hover:brightness-125 sm:px-4 sm:py-2 sm:text-sm"
          style={{
            boxShadow: "0 1px 0 0 rgba(14, 233, 87, 0.10) inset",
          }}
        >
          <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Share P&amp;L Card
        </button>
      </div>
    </div>
  );
};
