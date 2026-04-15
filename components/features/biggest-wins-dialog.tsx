"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, Share2, Loader2 } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SharePnlDialog } from "@/components/features/c9/share-pnl-dialog";
import { backendFetchJson, getBackendJwt } from "@/lib/backend";

interface Win {
  id: string;
  matchName: string;
  sportCategory: string;
  sportEmoji: string;
  imageUrl?: string;
  pnlAmount: number;
  pnlPercentage: number;
  invested: number;
  position: number;
  date: string;
}

interface BiggestWinsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName?: string;
  profileImage?: string;
}

const SportIcon = ({
  imageUrl,
  emoji,
  alt,
}: {
  imageUrl?: string;
  emoji: string;
  alt: string;
}) => {
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 text-base">
        {emoji}
      </div>
    );
  }

  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

type TradeRow = {
  ticker: string | null;
  side: string | null;
  price: number | null;
  size_usd: number | null;
  pnl_usd?: number | null;
  status?: string | null;
  executed_at?: string | null;
  matchName?: string | null;
  team?: string | null;
  sport?: string | null;
};

function sportToEmoji(sport: string | null | undefined): string {
  const s = String(sport || "").toLowerCase();
  if (s.includes("nba") || s.includes("basketball")) return "🏀";
  if (s.includes("nfl") || s.includes("football")) return "🏈";
  if (s.includes("mlb") || s.includes("baseball")) return "⚾";
  if (s.includes("nhl") || s.includes("hockey")) return "🏒";
  if (s.includes("soccer") || s.includes("mls") || s.includes("epl")) return "⚽";
  if (s.includes("btc") || s.includes("bitcoin")) return "₿";
  if (s.includes("eth") || s.includes("ether")) return "⟠";
  return "📊";
}

function sportToCategory(sport: string | null | undefined): string {
  const s = String(sport || "").toLowerCase();
  if (s.includes("nba") || s.includes("basketball")) return "NBA";
  if (s.includes("nfl") || s.includes("football")) return "NFL";
  if (s.includes("mlb") || s.includes("baseball")) return "MLB";
  if (s.includes("nhl") || s.includes("hockey")) return "NHL";
  if (s.includes("soccer") || s.includes("mls") || s.includes("epl")) return "Soccer";
  if (s.includes("btc")) return "BTC";
  if (s.includes("eth")) return "ETH";
  return sport || "Other";
}

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const BiggestWinsDialog = ({
  open,
  onOpenChange,
  displayName = "rainmaker_user",
  profileImage = "/rainmaker-pfp.png",
}: BiggestWinsDialogProps) => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedWin, setSelectedWin] = useState<Win | null>(null);
  const [wins, setWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchWins = useCallback(async () => {
    if (!getBackendJwt()) return;
    setLoading(true);
    try {
      const res = await backendFetchJson<{ ok: boolean; trades: TradeRow[] }>(
        "/c9/sniper/trades?days=365"
      );
      const trades = Array.isArray(res?.trades) ? res.trades : [];

      const profitable = trades
        .filter((t) => typeof t.pnl_usd === "number" && t.pnl_usd > 0)
        .sort((a, b) => (b.pnl_usd ?? 0) - (a.pnl_usd ?? 0))
        .slice(0, 5);

      const mapped: Win[] = profitable.map((t, i) => {
        const pnl = t.pnl_usd ?? 0;
        const cost = Math.abs(Number(t.size_usd ?? 0));
        const pct = cost > 0 ? (pnl / cost) * 100 : 0;
        return {
          id: `${t.ticker}-${i}`,
          matchName: t.matchName || t.ticker || "Unknown",
          sportCategory: sportToCategory(t.sport),
          sportEmoji: sportToEmoji(t.sport),
          pnlAmount: pnl,
          pnlPercentage: Number(pct.toFixed(1)),
          invested: cost,
          position: cost + pnl,
          date: formatShortDate(t.executed_at),
        };
      });

      setWins(mapped);
      setFetched(true);
    } catch {
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !fetched) {
      fetchWins();
    }
  }, [open, fetched, fetchWins]);

  const handleShareWin = (win: Win) => {
    setSelectedWin(win);
    setShareDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-md border-0 p-0 gap-0"
          style={{
            borderRadius: "12px",
            background:
              "linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
            boxShadow: "0 0 0 1px #292929, 0 0 0 2px #0A0A0A",
          }}
        >
          <DialogTitle className="sr-only">Best Wins</DialogTitle>

          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-4">
            <Trophy className="h-5 w-5 text-[#0EE957]" />
            <h2 className="text-lg font-semibold text-white">Best Wins</h2>
          </div>

          {/* Wins List */}
          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : wins.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#757575]">
                No winning trades yet
              </p>
            ) : (
              <div className="space-y-2">
                {wins.map((win, index) => (
                  <div
                    key={win.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.02]"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.05) inset",
                    }}
                  >
                    <span className="w-4 text-sm font-medium text-[#757575]">
                      {index + 1}
                    </span>

                    <SportIcon
                      imageUrl={win.imageUrl}
                      emoji={win.sportEmoji}
                      alt={win.sportCategory}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {win.matchName}
                      </p>
                      <p className="text-xs text-[#757575]">
                        {win.sportCategory} · {win.date}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#0EE957]">
                        +${formatCurrency(win.pnlAmount)}
                      </p>
                      <p className="text-xs text-[#757575]">
                        +{win.pnlPercentage.toFixed(1)}%
                      </p>
                    </div>

                    <button
                      onClick={() => handleShareWin(win)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#757575] transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedWin && (
        <SharePnlDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          pnlAmount={selectedWin.pnlAmount}
          pnlPercentage={selectedWin.pnlPercentage}
          invested={selectedWin.invested}
          position={selectedWin.position}
          displayName={displayName}
          profileImage={profileImage}
        />
      )}
    </>
  );
};
