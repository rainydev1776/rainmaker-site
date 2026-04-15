"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { History, Wallet, ArrowRight, Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { backendFetchJson, getBackendJwt } from "@/lib/backend";

interface Position {
  id: string;
  ticker: string;
  matchName: string;
  team: string | null;
  sport: string | null;
  entryPriceCents: number;
  currentPriceCents: number;
  quantity: number;
  costUsd: number;
  unrealizedPnlUsd: number;
}

interface TradeRow {
  ticker: string | null;
  matchName?: string | null;
  team?: string | null;
  sport?: string | null;
  pnl_usd?: number | null;
  size_usd?: number | null;
  status?: string | null;
  executed_at?: string | null;
}

function sportToEmoji(sport: string | null | undefined): string {
  const s = String(sport || "").toLowerCase();
  if (s.includes("nba") || s.includes("basketball")) return "\u{1F3C0}";
  if (s.includes("nfl") || s.includes("football")) return "\u{1F3C8}";
  if (s.includes("mlb") || s.includes("baseball")) return "\u26BE";
  if (s.includes("nhl") || s.includes("hockey")) return "\u{1F3D2}";
  if (s.includes("soccer")) return "\u26BD";
  return "\u{1F3DF}\uFE0F";
}

function sportLabel(sport: string | null | undefined): string {
  const s = String(sport || "").toUpperCase();
  if (s === "NBA") return "Pro Basketball";
  if (s === "NFL") return "Pro Football";
  if (s === "MLB") return "Pro Baseball";
  if (s === "NHL") return "Pro Hockey";
  return sport || "Sports";
}

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SearchCommand = ({ open, onOpenChange }: SearchCommandProps) => {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [trades, setTrades] = React.useState<TradeRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetched, setFetched] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (fetched) return;
    if (!getBackendJwt()) return;

    const load = async () => {
      setLoading(true);
      try {
        const [posRes, tradeRes] = await Promise.all([
          backendFetchJson<{ ok: boolean; positions: any[] }>("/c9/sniper/positions").catch(() => null),
          backendFetchJson<{ ok: boolean; trades: any[] }>("/c9/sniper/trades?days=90").catch(() => null),
        ]);

        const rawPos = Array.isArray(posRes?.positions) ? posRes.positions : [];
        setPositions(
          rawPos.map((p: any) => ({
            id: p.ticker,
            ticker: p.ticker,
            matchName: p.matchName || p.ticker,
            team: p.team || null,
            sport: p.sport || null,
            entryPriceCents: Number(p.entryPriceCents || 0),
            currentPriceCents: Number(p.currentPriceCents || 0),
            quantity: Number(p.quantity || 0),
            costUsd: Number(p.costUsd || 0),
            unrealizedPnlUsd: Number(p.unrealizedPnlUsd || 0),
          }))
        );

        const rawTrades = Array.isArray(tradeRes?.trades) ? tradeRes.trades : [];
        setTrades(
          rawTrades
            .filter((t: any) => t.status === "settled" || t.pnl_usd != null)
            .slice(0, 20)
        );
      } catch {
        // silently fail
      } finally {
        setLoading(false);
        setFetched(true);
      }
    };
    load();
  }, [open, fetched]);

  // Reset fetched state when dialog closes so it re-fetches next open
  React.useEffect(() => {
    if (!open) setFetched(false);
  }, [open]);

  const q = search.toLowerCase();

  const matchesPosition = (p: Position) =>
    !q ||
    p.matchName.toLowerCase().includes(q) ||
    (p.team && p.team.toLowerCase().includes(q)) ||
    (p.sport && p.sport.toLowerCase().includes(q)) ||
    sportLabel(p.sport).toLowerCase().includes(q);

  const matchesTrade = (t: TradeRow) =>
    !q ||
    (t.matchName && t.matchName.toLowerCase().includes(q)) ||
    (t.team && t.team.toLowerCase().includes(q)) ||
    (t.sport && t.sport.toLowerCase().includes(q)) ||
    (t.ticker && t.ticker.toLowerCase().includes(q)) ||
    sportLabel(t.sport).toLowerCase().includes(q);

  const filteredPositions = positions.filter(matchesPosition);
  const filteredTrades = trades.filter(matchesTrade);

  const handleSelectPosition = (ticker: string) => {
    onOpenChange(false);
    router.push(`/c9`);
  };

  const handleSelectTrade = (ticker: string) => {
    onOpenChange(false);
    router.push(`/c9`);
  };

  const totalResults = filteredPositions.length + filteredTrades.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[560px] overflow-hidden border-0 p-0 [&>button]:hidden"
        style={{
          borderRadius: "16px",
          background: "#0D0D0F",
          boxShadow: "0 0 0 1px #292929, 0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search markets</DialogTitle>
          <DialogDescription>
            Search for positions or trade history
          </DialogDescription>
        </DialogHeader>
        <Command
          className="bg-transparent"
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <div
            className="flex items-center gap-3 border-b px-4 w-full justify-between"
            style={{ borderColor: "#292929" }}
          >
            <CommandInput
              placeholder="Search teams, markets, or trades..."
              value={search}
              onValueChange={setSearch}
              className="h-12 border-0 bg-transparent text-white placeholder:text-[#757575] focus:ring-0"
            />
            <kbd
              className="hidden rounded px-2 py-1 text-[10px] font-medium text-[#757575] sm:inline-block"
              style={{ background: "rgba(255, 255, 255, 0.05)" }}
            >
              ESC
            </kbd>
          </div>

          <CommandList className="max-h-[400px] overflow-auto p-2 [&::-webkit-scrollbar]:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : (
              <>
                <CommandEmpty className="py-12 text-center text-sm text-[#757575]">
                  No results found.
                </CommandEmpty>

                {filteredPositions.length > 0 && (
                  <CommandGroup
                    heading={
                      <span className="flex items-center gap-2 text-xs font-medium text-[#757575]">
                        <Wallet className="h-3 w-3" />
                        Open Positions
                      </span>
                    }
                  >
                    {filteredPositions.map((pos) => {
                      const pnl = pos.unrealizedPnlUsd;
                      const isPositive = pnl >= 0;
                      const cur = pos.currentPriceCents;
                      return (
                        <CommandItem
                          key={pos.id}
                          value={`position-${pos.matchName}-${pos.team || ""}-${pos.sport || ""}`}
                          onSelect={() => handleSelectPosition(pos.ticker)}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-white/5"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-lg">
                            {sportToEmoji(pos.sport)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {pos.matchName}
                            </p>
                            <p className="text-xs text-[#757575]">
                              {sportLabel(pos.sport)}
                              {pos.team ? ` \u00B7 ${pos.team}` : ""}
                              {" \u00B7 "}
                              {fmtUsd(pos.costUsd)} position
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-medium ${
                                isPositive ? "text-[#0EE957]" : "text-[#FF0066]"
                              }`}
                            >
                              {isPositive ? "+" : ""}{fmtUsd(pnl)}
                            </p>
                            <p className="text-xs text-[#757575]">
                              {cur > 0 ? `${cur}\u00A2` : ""}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-[#757575]" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {filteredTrades.length > 0 && (
                  <>
                    {filteredPositions.length > 0 && (
                      <CommandSeparator className="my-2 bg-zinc-800" />
                    )}
                    <CommandGroup
                      heading={
                        <span className="flex items-center gap-2 text-xs font-medium text-[#757575]">
                          <History className="h-3 w-3" />
                          Trade History
                        </span>
                      }
                    >
                      {filteredTrades.map((trade, i) => {
                        const pnl = Number(trade.pnl_usd || 0);
                        const isWin = pnl > 0;
                        return (
                          <CommandItem
                            key={`${trade.ticker}-${i}`}
                            value={`trade-${trade.matchName || ""}-${trade.team || ""}-${trade.sport || ""}-${trade.ticker || ""}`}
                            onSelect={() => handleSelectTrade(trade.ticker || "")}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-white/5"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-lg">
                              {sportToEmoji(trade.sport)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {trade.matchName || trade.ticker || "Unknown"}
                              </p>
                              <p className="text-xs text-[#757575]">
                                {sportLabel(trade.sport)}
                                {trade.team ? ` \u00B7 ${trade.team}` : ""}
                                {trade.executed_at ? ` \u00B7 ${fmtDate(trade.executed_at)}` : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-sm font-medium ${
                                  isWin ? "text-[#0EE957]" : "text-[#FF0066]"
                                }`}
                              >
                                {isWin ? "+" : ""}{fmtUsd(pnl)}
                              </p>
                              <p className="text-xs text-[#757575] capitalize">
                                {isWin ? "win" : "loss"}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-[#757575]" />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>

          <div
            className="flex items-center justify-between border-t px-4 py-2"
            style={{ borderColor: "#292929" }}
          >
            <div className="flex items-center gap-4 text-xs text-[#757575]">
              <span className="flex items-center gap-1">
                <kbd
                  className="rounded px-1.5 py-0.5 text-[10px]"
                  style={{ background: "rgba(255, 255, 255, 0.05)" }}
                >
                  \u2191\u2193
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd
                  className="rounded px-1.5 py-0.5 text-[10px]"
                  style={{ background: "rgba(255, 255, 255, 0.05)" }}
                >
                  \u21B5
                </kbd>
                Select
              </span>
            </div>
            <span className="text-xs text-[#757575]">
              {totalResults} results
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
