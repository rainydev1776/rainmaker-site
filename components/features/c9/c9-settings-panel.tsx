"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Swords,
  Zap,
  Shield,
  BadgeInfo,
  Rocket,
  Trophy,
  ChevronDown,
  Check,
  Settings,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { CoverageSlider } from "@/components/ui/coverage-slider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Platform = "polymarket" | "kalshi" | "novig";

type Sport = "all" | "nfl" | "nba" | "mlb" | "nhl" | "soccer" | "btc" | "eth";
type C9Mode = "turbo" | "kage" | "foul" | "micro" | "burst1" | "burst2" | "burst3" | "nhlburst39" | "mlbburst7071";

const C9_MODE_VALUES: C9Mode[] = ["turbo", "kage", "foul", "micro", "burst1", "burst2", "burst3", "nhlburst39", "mlbburst7071"];

function normalizeC9Mode(raw: unknown): C9Mode | "" {
  const s = String(raw || "").toLowerCase().trim();
  if (s === "favdip") return "burst1";
  return C9_MODE_VALUES.includes(s as C9Mode) ? (s as C9Mode) : "";
}

const PLATFORM_OPTIONS: {
  value: Platform;
  label: string;
  color: string;
  bgColor: string;
}[] = [
  {
    value: "polymarket",
    label: "Polymarket",
    color: "#0EA5E9",
    bgColor: "rgba(14, 165, 233, 0.15)",
  },
  {
    value: "kalshi",
    label: "Kalshi",
    color: "#0EE957",
    bgColor: "rgba(14, 233, 87, 0.15)",
  },
  {
    value: "novig",
    label: "Novig",
    color: "#FFFFFF",
    bgColor: "rgba(255, 255, 255, 0.10)",
  },
];

type SportOption = {
  value: Sport;
  label: string;
  disabled?: boolean;
  comingSoon?: boolean;
  crypto?: boolean;
};

const BASE_SPORT_OPTIONS: SportOption[] = [
  { value: "nba", label: "NBA" },
  { value: "nhl", label: "NHL" },
  { value: "mlb", label: "MLB" },
  { value: "nfl", label: "NFL", disabled: true },
  { value: "soccer", label: "Soccer", disabled: true },
];

const SPORT_ICONS: Record<string, string> = {
  nba: "/nba-icon.png",
  nhl: "/nhl-icon.png",
  mlb: "/mlb-icon.png",
  nfl: "/nfl-icon.png",
  soccer: "/soccer-icon.png",
};

const INDIVIDUAL_SPORTS: Sport[] = ["nfl", "nba", "mlb", "nhl", "soccer", "btc", "eth"];

type BalanceSource = "polymarket" | "kalshi";

type ExecutionPath = "dflow" | "jupiter";

// Settings (shared across platforms; backend stores one config row)
interface SettingsDraft {
  maxStake: string;
  betaStakePct: string;
  maxConcurrent: string;
  stopLoss: string;
  takeProfit: string;
  mode: C9Mode;
  modes: C9Mode[];
  stopLossEnabled: boolean;
  coverage: number; // clamped (KAGE-safe): 1.01 to 1.10 (inverse of leverage)
  coverageEnabled: boolean;
  turboMode: boolean;
  ultraEnabled: boolean;
  kageEnabled: boolean;
  selectedSports: Sport[];
  executionPath: ExecutionPath;
  rainBuybackPct: string;
}

// Global settings that apply across all platforms
interface GlobalSettings {
  selectedPlatforms: Platform[];
}

type AgentConfigRow = {
  enabled?: boolean | null;
  max_concurrent?: number | null;
  tp_pct?: number | null;
  sl_pct?: number | null;
  execution_venue?: string | null;
  feature_flags?: Record<string, unknown> | null;
};

type StrategyCatalogEntry = {
  lineageKey?: string;
  modeValue?: string;
  displayName?: string;
  winRate30d?: number;
  pnl1k30d?: number;
  trades30d?: number;
  summaryText?: string;
  candidateName?: string | null;
  resultPath?: string | null;
  promotedAt?: string | null;
  active?: boolean;
};

// Combined settings for activation
interface C9Settings extends SettingsDraft {
  platform: Platform;
  selectedPlatforms: Platform[];
  balanceSource: BalanceSource;
}

const DEFAULT_SETTINGS: SettingsDraft = {
  maxStake: "5",
  betaStakePct: "15",
  maxConcurrent: "50",
  stopLoss: "50",
  takeProfit: "20",
  mode: "turbo",
  modes: ["turbo"],
  stopLossEnabled: false,
  coverage: 1.1, // KAGE-safe default: light hedge (~91/9)
  coverageEnabled: false,
  turboMode: false,
  ultraEnabled: false,
  kageEnabled: false,
  selectedSports: ["nba"],
  executionPath: "jupiter",
  rainBuybackPct: "",
};

type StrategyModeOption = {
  value: C9Mode;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconSrc?: string;
  description: string;
  disabled?: boolean;
  tier: "verified" | "beta" | "hidden";
};

const DEFAULT_STRATEGY_MODE_OPTIONS: StrategyModeOption[] = [
  { value: "burst2", label: "Burst 2.0", iconSrc: "/nba-icon.png", description: "91.8% | $8.1k | 61", tier: "verified" },
  { value: "burst1", label: "Burst 1.0", iconSrc: "/nba-icon.png", description: "88.1% | $6.0k | 84", tier: "beta" },
  { value: "burst3", label: "Burst 3.0", iconSrc: "/nba-icon.png", description: "80.0% | $4.3k | 15", tier: "beta" },
  { value: "nhlburst39", label: "NHL Burst", iconSrc: "/nhl-icon.png", description: "61.5% | $104.9k | 26", tier: "beta" },
  { value: "mlbburst7071", label: "MLB Burst", iconSrc: "/mlb-icon.png", description: "63.6% | $14.9k | 11", tier: "beta" },
  { value: "turbo", label: "Turbo", icon: Rocket, description: "Underdog tape mode", disabled: false, tier: "hidden" },
  { value: "kage", label: "Kage", icon: Swords, description: "Shock-driven Kage mode", tier: "hidden" },
  { value: "foul", label: "Foul", icon: Shield, description: "Technical foul reaction mode", tier: "hidden" },
  { value: "micro", label: "Micro", icon: Zap, description: "Early-game microstructure scalp", tier: "hidden" },
];

interface C9SettingsPanelProps {
  onActivate?: (settings: C9Settings) => void;
  onDeactivate?: () => void;
  onSettingsChange?: (settings: Partial<C9Settings>) => void;
  onSwapToJupUsd?: (amountUsd: string) => Promise<{ ok: boolean; error?: string }>;
  active?: boolean;
  loading?: boolean;
  isLoadingConfig?: boolean;
  cryptoAllowed?: boolean;
  turboAllowed?: boolean;
  kalshiBalanceUsd?: number | null;
  pmBalanceUsd?: number | null;
  jupUsdBalance?: number | null;
  kalshiConfigured?: boolean;
  pmConfigured?: boolean;
  config?: AgentConfigRow | null;
  balanceUsd?: number | null;
  strategyCatalog?: StrategyCatalogEntry[] | null;
}

const InputField = ({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Allow empty string
    if (input === "") {
      onChange("");
      return;
    }

    // Only allow numbers and decimal point
    if (!/^\d*\.?\d*$/.test(input)) {
      return;
    }

    onChange(input);
  };

  return (
    <div className="flex-1">
      <label className="mb-1.5 block text-xs text-white font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          className={`h-10 w-full pl-3 text-sm text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-cyan-500/50 ${
            suffix ? "pr-8" : "pr-3"
          }`}
          style={{
            borderRadius: "10px",
            background: "rgba(255, 255, 255, 0.02)",
            boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
          }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#757575] font-medium">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

const PercentageInputField = ({
  label,
  value,
  onChange,
  rightHint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rightHint?: string;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Allow empty string
    if (input === "") {
      onChange("");
      return;
    }

    // Only allow numbers and decimal point
    if (!/^\d*\.?\d*$/.test(input)) {
      return;
    }

    // Parse the number and cap at 100
    const numValue = parseFloat(input);
    if (!isNaN(numValue) && numValue > 100) {
      onChange("100");
      return;
    }

    onChange(input);
  };

  return (
    <div className="flex-1">
      <label className="mb-1.5 block text-xs text-white font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder="0-100"
          className={`h-10 w-full pl-3 text-sm text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-cyan-500/50 ${
            rightHint ? "pr-16" : "pr-3"
          }`}
          style={{
            borderRadius: "10px",
            background: "rgba(255, 255, 255, 0.02)",
            boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
          }}
        />
        {rightHint && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#757575] font-medium">
            {rightHint}
          </span>
        )}
      </div>
    </div>
  );
};

const StaticValueField = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <div className="flex-1">
      <label className="mb-1.5 block text-xs text-white font-medium">
        {label}
      </label>
      <div
        className="flex h-10 w-full items-center rounded-[10px] px-3 text-sm font-medium text-[#757575]"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      >
        {value}
      </div>
    </div>
  );
};

function fmtUsd(n: number): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

const SwapToJupUsd = ({
  usdcBalance,
  onSwapToJupUsd,
}: {
  usdcBalance: number;
  onSwapToJupUsd: (amountUsd: string) => Promise<{ ok: boolean; error?: string }>;
}) => {
  const [amountUsd, setAmountUsd] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const maxStr = useMemo(() => {
    const n = Number(usdcBalance || 0);
    if (!(Number.isFinite(n) && n > 0)) return "0";
    const s = n.toFixed(6);
    return s.replace(/\.?0+$/, "");
  }, [usdcBalance]);

  const parsedAmount = useMemo(() => {
    const n = Number(String(amountUsd || "").trim());
    return Number.isFinite(n) ? n : NaN;
  }, [amountUsd]);

  const exceedsBalance = Number.isFinite(parsedAmount) && parsedAmount > usdcBalance + 1e-9;
  const canSwap =
    !swapping &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    !exceedsBalance &&
    Number.isFinite(Number(usdcBalance)) &&
    usdcBalance > 0;

  const handleMax = () => {
    setResult(null);
    setAmountUsd(maxStr);
  };

  const handleSwap = async () => {
    setSwapping(true);
    setResult(null);
    try {
      if (!canSwap) {
        const err = exceedsBalance ? "amount_exceeds_balance" : "invalid_amount";
        setResult({ ok: false, error: err });
        return;
      }
      const normalized = Number(parsedAmount).toFixed(6);
      const r = await onSwapToJupUsd(normalized);
      setResult(r);
      if (r.ok) setTimeout(() => setResult(null), 4000);
    } catch (e: any) {
      setResult({ ok: false, error: e?.message || "swap_failed" });
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs text-white font-medium">Swap USDC → JupUSD</label>
      <div className="mb-2 flex gap-1.5">
        {[5, 10, 25].map((v) => (
          <button
            key={v}
            type="button"
            disabled={swapping || usdcBalance < v}
            onClick={() => { setAmountUsd(String(v)); setResult(null); }}
            className="flex h-7 items-center justify-center rounded-lg px-2.5 text-[11px] font-medium text-zinc-400 transition-all hover:text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "rgba(255, 255, 255, 0.04)", boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset" }}
          >
            ${v}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#757575] font-medium">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={amountUsd}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                setAmountUsd("");
                setResult(null);
                return;
              }
              if (!/^\d*\.?\d*$/.test(raw)) return;
              const [w, f = ""] = raw.split(".");
              const next = f ? `${w}.${f.slice(0, 6)}` : w;
              setAmountUsd(next);
              setResult(null);
            }}
            placeholder="2.00"
            className="h-10 w-full pl-6 pr-3 text-sm text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-cyan-500/50"
            style={{
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.02)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleMax}
          disabled={swapping || !(Number.isFinite(Number(usdcBalance)) && usdcBalance > 0)}
          className="flex h-10 items-center justify-center rounded-lg px-3 text-[11px] font-medium text-zinc-400 transition-all hover:text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
          }}
        >
          Max
        </button>

        <button
          type="button"
          onClick={handleSwap}
          disabled={!canSwap}
          className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium text-zinc-400 transition-all hover:text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
          }}
        >
          {swapping ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {swapping ? "Swapping…" : "Swap"}
        </button>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[10px] text-[#757575]">Available: {fmtUsd(usdcBalance)} USDC</p>
        {exceedsBalance && <p className="text-[10px] text-[#FF0066]">Exceeds balance</p>}
      </div>

      {result && !result.ok && <p className="mt-1 text-[10px] text-[#FF0066]">{result.error}</p>}
      {result?.ok && <p className="mt-1 text-[10px] text-[#0EE957]">Done</p>}
    </div>
  );
};

export const C9SettingsPanel = ({
  onActivate,
  onDeactivate,
  onSettingsChange,
  onSwapToJupUsd,
  active = false,
  loading = false,
  isLoadingConfig = false,
  cryptoAllowed = false,
  turboAllowed = false,
  kalshiBalanceUsd = null,
  pmBalanceUsd = null,
  jupUsdBalance = null,
  kalshiConfigured = false,
  pmConfigured = false,
  config = null,
  balanceUsd = null,
  strategyCatalog = null,
}: C9SettingsPanelProps) => {
  const [platform, setPlatform] = useState<Platform>("kalshi");
  const [balanceSource, setBalanceSource] = useState<BalanceSource>("kalshi");
  const [settings, setSettings] = useState<SettingsDraft>({ ...DEFAULT_SETTINGS });
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    selectedPlatforms: ["kalshi"],
  });
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sportOptions = useMemo(() => {
    return BASE_SPORT_OPTIONS;
  }, [cryptoAllowed]);

  const disabledSports = useMemo(() => {
    return new Set<Sport>(sportOptions.filter((o) => o.disabled).map((o) => o.value));
  }, [sportOptions]);

  // Active balance based on selected balance source (cash only)
  const activeBalance = useMemo(() => {
    if (balanceSource === "kalshi") return jupUsdBalance ?? kalshiBalanceUsd ?? balanceUsd ?? null;
    return pmBalanceUsd ?? null;
  }, [balanceSource, jupUsdBalance, kalshiBalanceUsd, pmBalanceUsd, balanceUsd]);

  const maxStakeUsdValue = useMemo(() => {
    const pct = Number(settings.maxStake ?? NaN);
    const bal = Number(activeBalance ?? NaN);
    if (!(Number.isFinite(pct) && pct >= 0 && Number.isFinite(bal) && bal > 0)) return null;
    return Math.max(0, (bal * pct) / 100);
  }, [activeBalance, settings.maxStake]);

  const maxStakeUsdLabel = useMemo(() => {
    if (!(maxStakeUsdValue != null && Number.isFinite(maxStakeUsdValue))) return "—";
    return fmtUsd(maxStakeUsdValue);
  }, [maxStakeUsdValue]);

  const betaStakeUsdLabel = useMemo(() => {
    const betaPct = Number(settings.betaStakePct ?? NaN);
    if (!(Number.isFinite(betaPct) && betaPct >= 0)) return "";
    if (!(maxStakeUsdValue != null && Number.isFinite(maxStakeUsdValue))) return "";
    return fmtUsd((maxStakeUsdValue * betaPct) / 100);
  }, [maxStakeUsdValue, settings.betaStakePct]);

  const betaWinsPerLossWarning = useMemo(() => {
    const maxStakePct = Number(settings.maxStake ?? NaN);
    const betaStakePct = Number(settings.betaStakePct ?? NaN);
    if (!(Number.isFinite(maxStakePct) && maxStakePct > 0)) return null;
    if (!(Number.isFinite(betaStakePct) && betaStakePct > 0)) return null;

    const betaStakeFraction = Math.max(0, Math.min(1, betaStakePct / 100));
    if (!(betaStakeFraction > 0)) return null;

    const winsNeeded = betaStakeFraction / 0.15;
    const winsNeededLabel = winsNeeded
      .toFixed(winsNeeded >= 10 ? 1 : 2)
      .replace(/\.0+$/, "")
      .replace(/(\.\d*[1-9])0+$/, "$1");

    return winsNeededLabel;
  }, [settings.betaStakePct, settings.maxStake]);

  const strategyModeOptions = useMemo(() => {
    const overrides = new Map<string, StrategyCatalogEntry>();
    for (const row of Array.isArray(strategyCatalog) ? strategyCatalog : []) {
      const mode = normalizeC9Mode(row?.modeValue ?? "");
      if (!mode) continue;
      overrides.set(mode, row);
    }
    return DEFAULT_STRATEGY_MODE_OPTIONS.map((mode) => {
      const override = overrides.get(mode.value);
      if (!override) return mode;
      return {
        ...mode,
        label: String(override.displayName || "").trim() || mode.label,
        description: String(override.summaryText || "").trim() || mode.description,
      };
    });
  }, [strategyCatalog]);

  // Hydrate defaults from Supabase config ONCE (cross-device) unless user is actively editing.
  useEffect(() => {
    if (hydrated) return;
    if (dirty) return;
    // Wait until loading finishes
    if (isLoadingConfig) return;
    // If config is null after loading finished, use defaults (new user, no config row yet).
    if (!config) {
      setHydrated(true);
      return;
    }

    try {
      const flags = config?.feature_flags && typeof config.feature_flags === "object" ? config.feature_flags : {};

      const pctRaw = Number(flags?.max_stake_pct ?? flags?.maxStakePct ?? NaN);
      const maxStake = Number.isFinite(pctRaw) ? String(Math.max(0, Math.min(100, pctRaw))) : DEFAULT_SETTINGS.maxStake;

      const maxConcRaw = Number(config?.max_concurrent ?? NaN);
      const maxConcurrent = Number.isFinite(maxConcRaw) ? String(Math.max(1, Math.floor(maxConcRaw))) : DEFAULT_SETTINGS.maxConcurrent;

      const tpRaw = Number(config?.tp_pct ?? NaN);
      const takeProfit = Number.isFinite(tpRaw) ? String(Math.max(0, Math.round(tpRaw * 100))) : DEFAULT_SETTINGS.takeProfit;

      const slRaw = Number(config?.sl_pct ?? NaN);
      const stopLoss = Number.isFinite(slRaw) ? String(Math.max(0, Math.round(slRaw * 100))) : DEFAULT_SETTINGS.stopLoss;

      const covRaw = Number(flags?.coverage ?? flags?.coverage_ratio ?? flags?.coverageRatio ?? NaN);
      const coverage = Number.isFinite(covRaw)
        ? Math.max(1.01, Math.min(1.1, Number(covRaw.toFixed(3))))
        : DEFAULT_SETTINGS.coverage;

      const coverageEnabled = !!(flags?.coverageEnabled ?? flags?.coverage_enabled);
      const modeRaw = (() => {
        const explicit = normalizeC9Mode(flags?.strategyMode ?? flags?.strategy_mode ?? "");
        if (explicit) return explicit;
        if (flags?.burst3Enabled ?? (flags as any)?.burst3_enabled ?? (flags as any)?.favdip3Enabled ?? (flags as any)?.favdip3_enabled) {
          return "burst3" as C9Mode;
        }
        if (
          (flags as any)?.mlbBurst7071Enabled ??
          (flags as any)?.mlb_burst_70_71_enabled ??
          (flags as any)?.mlbBurstEnabled ??
          (flags as any)?.mlb_burst_enabled
        ) {
          return "mlbburst7071" as C9Mode;
        }
        if ((flags as any)?.nhlBurst39Enabled ?? (flags as any)?.nhl_burst_39_46_enabled) {
          return "nhlburst39" as C9Mode;
        }
        if (flags?.burst2Enabled ?? (flags as any)?.burst2_enabled ?? (flags as any)?.favdip2Enabled ?? (flags as any)?.favdip2_enabled) {
          return "burst2" as C9Mode;
        }
        if (
          flags?.burst1Enabled ??
          (flags as any)?.burst1_enabled ??
          flags?.favdipEnabled ??
          (flags as any)?.favdip_enabled
        ) {
          return "burst1" as C9Mode;
        }
        if (flags?.foulEnabled ?? flags?.foul_enabled) return "foul" as C9Mode;
        if (flags?.microEnabled ?? flags?.micro_enabled) return "micro" as C9Mode;
        if (flags?.kageEnabled ?? flags?.kage_enabled ?? flags?.nbaKageEnabled ?? flags?.nba_kage_enabled ?? flags?.kage) return "kage" as C9Mode;
        if (flags?.turboMode ?? flags?.turbo_mode) return "turbo" as C9Mode;
        return "turbo" as C9Mode;
      })();
      const modesRaw: C9Mode[] = (() => {
        const raw = flags?.strategyModes ?? flags?.strategy_modes ?? null;
        if (!Array.isArray(raw)) return [modeRaw];
        const out: C9Mode[] = [];
        const seen = new Set<string>();
        for (const x of raw) {
          const s = normalizeC9Mode(x);
          if (!s) continue;
          if (seen.has(s)) continue;
          seen.add(s);
          out.push(s);
        }
        return out.length ? out : [modeRaw];
      })();

      let modes: C9Mode[] = modesRaw;
      if (turboAllowed !== true) modes = modes.filter((m) => m !== "turbo");
      if (!modes.length) modes = ["burst2"];

      const mode = (() => {
        const preferred = modeRaw === "turbo" && turboAllowed !== true ? "burst2" : modeRaw;
        if (modes.includes(preferred)) return preferred;
        return modes[0];
      })();

      const turboMode = modes.includes("turbo");
      const ultraEnabled = false;
      const kageEnabled = modes.includes("kage");

      const stopLossEnabled = (() => {
        const raw =
          flags?.stopLossEnabled ??
          flags?.stop_loss_enabled ??
          flags?.slEnabled ??
          flags?.sl_enabled ??
          null;
        if (raw == null) return false; // default OFF (optional safety feature)
        if (raw === true || raw === 1) return true;
        if (raw === false || raw === 0) return false;
        const s = String(raw).toLowerCase().trim();
        if (s === "1" || s === "true" || s === "yes" || s === "on") return true;
        if (s === "0" || s === "false" || s === "no" || s === "off") return false;
        return true;
      })();

      const rawSports = Array.isArray(flags?.selectedSports ?? flags?.selected_sports)
        ? (flags?.selectedSports ?? flags?.selected_sports)
        : null;
      const sportsNorm: Sport[] = Array.isArray(rawSports)
        ? (rawSports
            .map((x: any) => String(x || "").toLowerCase().trim())
            .filter((s: string) => (["all", ...INDIVIDUAL_SPORTS] as string[]).includes(s))
            .filter((s: string) => !disabledSports.has(s as Sport)) as Sport[])
        : DEFAULT_SETTINGS.selectedSports;

      const executionPath: ExecutionPath = "jupiter";

      const betaStakePct = (() => {
        const pctRaw = Number(flags?.betaStakePct ?? flags?.beta_stake_pct ?? NaN);
        if (Number.isFinite(pctRaw)) return String(Math.max(0, Math.min(100, pctRaw)));
        const multRaw = Number(flags?.beta_stake_mult ?? flags?.betaStakeMult ?? NaN);
        if (Number.isFinite(multRaw)) return String(Math.max(0, Math.min(100, multRaw * 100)));
        return DEFAULT_SETTINGS.betaStakePct;
      })();

      const rainBuybackRaw = Number(flags?.rain_buyback_pct ?? flags?.rainBuybackPct ?? NaN);
      const rainBuybackPct = Number.isFinite(rainBuybackRaw) ? String(Math.max(0, Math.min(100, rainBuybackRaw))) : "";

      setSettings({
        maxStake,
        betaStakePct,
        maxConcurrent,
        stopLoss,
        takeProfit,
        mode,
        modes,
        stopLossEnabled,
        coverage,
        coverageEnabled,
        turboMode,
        ultraEnabled,
        kageEnabled,
        selectedSports: sportsNorm.length > 0 ? sportsNorm : DEFAULT_SETTINGS.selectedSports,
        executionPath,
        rainBuybackPct,
      });

      const venue = String(config?.execution_venue || "kalshi").toLowerCase().trim();
      const selectedPlatforms: Platform[] =
        venue === "both"
          ? ["polymarket", "kalshi"]
          : venue === "polymarket"
            ? ["polymarket"]
            : ["kalshi"];
      setGlobalSettings({ selectedPlatforms });

      // UI preferences (follow across devices)
      const lastPlatformRaw = String(flags?.ui_last_platform ?? flags?.last_platform ?? "").toLowerCase().trim();
      const lastBalanceRaw = String(flags?.ui_balance_source ?? flags?.balance_source ?? "").toLowerCase().trim();

      const lastPlatform = (lastPlatformRaw === "kalshi" || lastPlatformRaw === "polymarket" || lastPlatformRaw === "novig")
        ? (lastPlatformRaw as Platform)
        : null;
      const lastBalance = (lastBalanceRaw === "kalshi" || lastBalanceRaw === "polymarket")
        ? (lastBalanceRaw as BalanceSource)
        : null;

      // Tab selection rules:
      // - If only one platform is selected for execution, default tab to that platform.
      // - If both are selected, default to last-used tab (if valid), otherwise kalshi.
      // - If only one key is configured, default tab to that configured platform.
      let nextPlatform: Platform = "kalshi";
      if (selectedPlatforms.length === 1) {
        nextPlatform = selectedPlatforms[0];
      } else if (pmConfigured && !kalshiConfigured) {
        nextPlatform = "polymarket";
      } else if (kalshiConfigured && !pmConfigured) {
        nextPlatform = "kalshi";
      } else if (pmConfigured && kalshiConfigured) {
        nextPlatform = (lastPlatform && selectedPlatforms.includes(lastPlatform)) ? lastPlatform : "kalshi";
      } else {
        nextPlatform = lastPlatform || "kalshi";
      }

      // Default balance source follows platform selection.
      let nextBalance: BalanceSource = nextPlatform === "kalshi" ? "kalshi" : "polymarket";
      if (selectedPlatforms.length === 1 && (selectedPlatforms[0] === "kalshi" || selectedPlatforms[0] === "polymarket")) {
        nextBalance = selectedPlatforms[0];
      } else if (pmConfigured && !kalshiConfigured) {
        nextBalance = "polymarket";
      } else if (kalshiConfigured && !pmConfigured) {
        nextBalance = "kalshi";
      } else if (pmConfigured && kalshiConfigured) {
        nextBalance = lastBalance || (nextPlatform === "kalshi" ? "kalshi" : "polymarket");
      } else {
        nextBalance = lastBalance || "kalshi";
      }

      setPlatform(nextPlatform);
      setBalanceSource(nextBalance);
      setHydrated(true);
    } catch {
      // If hydration fails, keep defaults
      setHydrated(true);
    }
  }, [config, hydrated, dirty, kalshiConfigured, pmConfigured, isLoadingConfig, disabledSports, turboAllowed]);

  // Debounced auto-save when settings change (only if dirty and callback provided)
  useEffect(() => {
    if (!dirty || !onSettingsChange || !hydrated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSettingsChange({
        ...settings,
        platform,
        selectedPlatforms: globalSettings.selectedPlatforms,
        balanceSource,
      });
      setDirty(false);
    }, 1500); // 1.5s debounce
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dirty, settings, platform, globalSettings.selectedPlatforms, balanceSource, onSettingsChange, hydrated]);

  const [sportsDropdownOpen, setSportsDropdownOpen] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSportsDropdownOpen(false);
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setModeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSport = (sport: Sport) => {
    setDirty(true);
    setSettings((prev) => {
      const cur = Array.isArray(prev.selectedSports) ? prev.selectedSports : [];
      const isSelected = cur.includes(sport);

      if (isSelected) {
        // Don't allow deselecting if it's the last one
        if (cur.length === 1) return prev;
        return { ...prev, selectedSports: cur.filter((s) => s !== sport) };
      }

      return { ...prev, selectedSports: [...cur, sport] };
    });
  };

  const getSelectedSportsLabel = () => {
    if (settings.selectedSports.length === 0) return "Select markets";
    if (settings.selectedSports.length <= 2) {
      return settings.selectedSports
        .map((s) => sportOptions.find((o) => o.value === s)?.label)
        .join(", ");
    }
    return `${settings.selectedSports.length} markets selected`;
  };

  const updateSetting = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => {
    if (key === "turboMode" && turboAllowed !== true) return;
    setDirty(true);
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMode = (mode: C9Mode) => {
    if (mode === "turbo" && turboAllowed !== true) return;
    setDirty(true);
    setSettings((prev) => {
      const cur = Array.isArray(prev.modes) && prev.modes.length ? prev.modes : [prev.mode];
      const isSelected = cur.includes(mode);

      if (isSelected) {
        // Don't allow deselecting if it's the last one
        if (cur.length === 1) return prev;
        const nextModes = cur.filter((m) => m !== mode);
        const nextPrimary = prev.mode === mode ? (nextModes[nextModes.length - 1] ?? nextModes[0]) : prev.mode;
        return {
          ...prev,
          modes: nextModes,
          mode: nextPrimary,
          turboMode: nextModes.includes("turbo"),
          ultraEnabled: false,
          kageEnabled: nextModes.includes("kage"),
          executionPath: "jupiter",
        };
      }

      const nextModes = [...cur, mode];
      return {
        ...prev,
        modes: nextModes,
        mode, // last-picked becomes the primary label
        turboMode: nextModes.includes("turbo"),
        ultraEnabled: false,
        kageEnabled: nextModes.includes("kage"),
        executionPath: "jupiter",
      };
    });
  };

  const getSelectedModeLabel = () => {
    const selected = Array.isArray(settings.modes) && settings.modes.length ? settings.modes : [settings.mode];
    if (selected.length === 0) return "Select modes";
    if (selected.length <= 2) {
      return selected
        .map((m) => strategyModeOptions.find((o) => o.value === m)?.label || String(m))
        .join(", ");
    }
    return `${selected.length} modes selected`;
  };

  const togglePlatform = (platformValue: Platform) => {
    setDirty(true);
    setGlobalSettings((prev) => {
      const isSelected = prev.selectedPlatforms.includes(platformValue);
      let nextSelected: Platform[] = prev.selectedPlatforms;
      if (isSelected) {
        // Don't allow deselecting if it's the last one
        if (prev.selectedPlatforms.length === 1) return prev;
        nextSelected = prev.selectedPlatforms.filter((p) => p !== platformValue);
      } else {
        nextSelected = [...prev.selectedPlatforms, platformValue];
      }

      // If user selects only one platform to execute on, default the tab + balance source to that platform.
      if (nextSelected.length === 1) {
        const only = nextSelected[0];
        setPlatform(only);
        if (only === "kalshi" || only === "polymarket") {
          setBalanceSource(only);
        }
      } else {
        // If current tab is no longer selected for execution, switch to a selected one (prefer polymarket).
        if (!nextSelected.includes(platform)) {
          const fallback = nextSelected.includes("polymarket")
            ? "polymarket"
            : nextSelected[0];
          setPlatform(fallback);
          if (fallback === "kalshi" || fallback === "polymarket") {
            setBalanceSource(fallback);
          }
        }
      }

      return { ...prev, selectedPlatforms: nextSelected };
    });
  };

  const getSelectedPlatformsLabel = () => {
    if (globalSettings.selectedPlatforms.length === 0) return "None";
    if (globalSettings.selectedPlatforms.length === PLATFORM_OPTIONS.length)
      return "All Platforms";
    return globalSettings.selectedPlatforms
      .map((p) => PLATFORM_OPTIONS.find((o) => o.value === p)?.label)
      .join(", ");
  };

  const handleActivate = () => {
    onActivate?.({
      ...settings,
      platform,
      selectedPlatforms: globalSettings.selectedPlatforms,
      balanceSource,
    });
  };

  // Show skeleton while config is loading or not yet hydrated
  if (isLoadingConfig || !hydrated) {
    return (
      <div
        className="w-full shrink-0 flex flex-col rounded-[12px] p-3 sm:rounded-2xl sm:p-4 lg:max-h-[85vh] xl:w-[320px] xl:h-full xl:max-h-none xl:p-5"
        style={{
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      >
        {/* Skeleton Tabs */}
        <div className="shrink-0 flex gap-1">
          <Skeleton className="h-10 flex-1 rounded-2xl bg-white/5" />
          <Skeleton className="h-10 flex-1 rounded-2xl bg-white/5" />
          <Skeleton className="h-10 flex-1 rounded-2xl bg-white/5" />
        </div>

        {/* Skeleton Content */}
        <div className="mt-3 flex min-h-0 flex-1 flex-col space-y-4 sm:mt-5 sm:space-y-6">
          {/* Title + settings row */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-32 rounded bg-white/5" />
            <Skeleton className="h-8 w-8 rounded-lg bg-white/5" />
          </div>

          {/* Max stake + Max concurrent */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20 rounded bg-white/5" />
              <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24 rounded bg-white/5" />
              <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
            </div>
          </div>

          {/* Coverage slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16 rounded bg-white/5" />
              <Skeleton className="h-5 w-10 rounded-full bg-white/5" />
            </div>
            <Skeleton className="h-8 w-full rounded bg-white/5" />
          </div>

          {/* Turbo mode */}
          <div className="flex items-center justify-between py-2">
            <Skeleton className="h-5 w-24 rounded bg-white/5" />
            <Skeleton className="h-5 w-10 rounded-full bg-white/5" />
          </div>

          {/* Sports dropdown */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded bg-white/5" />
            <Skeleton className="h-10 w-full rounded-xl bg-white/5" />
          </div>

          {/* Activate button */}
          <div className="mt-auto pt-3">
            <Skeleton className="h-12 w-full rounded-full bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full shrink-0 flex flex-col rounded-[12px] p-3 sm:rounded-2xl sm:p-4 lg:max-h-[85vh] xl:w-[320px] xl:h-full xl:max-h-none xl:p-5"
      style={{
        background:
          "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
      }}
    >
      {/* Settings Content */}
      <div className="flex min-h-0 flex-1 flex-col space-y-3 sm:space-y-4 lg:overflow-y-auto lg:[&::-webkit-scrollbar]:hidden lg:[-ms-overflow-style:none] lg:[scrollbar-width:none]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Activate C9
          </h2>
          <button
            onClick={() => setPlatformDialogOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            title="Platform Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3">
          <PercentageInputField
            label="Max stake (%)"
            value={settings.maxStake}
            onChange={(v) => updateSetting("maxStake", v)}
            rightHint={(() => {
              const pct = Number(settings.maxStake || NaN);
              const bal = Number(activeBalance ?? NaN);
              if (!(Number.isFinite(pct) && pct >= 0 && Number.isFinite(bal) && bal > 0)) return "";
              const usd = (bal * pct) / 100;
              return Number.isFinite(usd) ? fmtUsd(usd) : "";
            })()}
          />
          <PercentageInputField
            label="Buyback (%)"
            value={settings.rainBuybackPct}
            onChange={(v) => {
              if (v === "") { updateSetting("rainBuybackPct", ""); return; }
              const n = parseFloat(v);
              if (!isNaN(n) && n > 100) { updateSetting("rainBuybackPct", "100"); return; }
              updateSetting("rainBuybackPct", v);
            }}
          />
        </div>

        {/* Swap USDC → JupUSD */}
        {kalshiBalanceUsd != null && kalshiBalanceUsd > 0.01 && onSwapToJupUsd && (
          <SwapToJupUsd usdcBalance={kalshiBalanceUsd} onSwapToJupUsd={onSwapToJupUsd} />
        )}

        {/* Strategy Mode */}
        <div className="relative" ref={modeDropdownRef}>
          <label className="mb-1.5 flex items-center gap-2 text-xs text-white font-medium">
            <Settings className="h-4 w-4" />
            Strategies
          </label>
          <button
            type="button"
            onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
            className="flex h-10 w-full items-center justify-between px-3 text-sm text-white outline-none transition-all focus:ring-1 focus:ring-cyan-500/50"
            style={{
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.02)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
            }}
          >
            <span className="truncate text-zinc-300">{getSelectedModeLabel()}</span>
            <ChevronDown className={`h-4 w-4 text-[#757575] transition-transform ${modeDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {modeDropdownOpen && (() => {
            const visible = strategyModeOptions.filter((m) => m.tier !== "hidden");
            const verified = visible.filter((m) => m.tier === "verified");
            const beta = visible.filter((m) => m.tier === "beta");
            const selected = Array.isArray(settings.modes) && settings.modes.length ? settings.modes : [settings.mode];

            const renderRow = (mode: typeof visible[number]) => {
              const isChecked = selected.includes(mode.value);
              const isDisabled = mode.value === "turbo" && turboAllowed !== true;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => {
                    if (isDisabled) return;
                    toggleMode(mode.value);
                  }}
                  disabled={isDisabled}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                    isDisabled
                      ? "text-zinc-600 cursor-not-allowed opacity-60"
                      : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-left">
                    {mode.iconSrc ? (
                      <Image src={mode.iconSrc} alt="" width={20} height={20} className="rounded shrink-0" />
                    ) : mode.icon ? (
                      <mode.icon className="h-4 w-4" />
                    ) : null}
                    <span>
                      <span className="block">{mode.label}</span>
                      <span className="block text-[10px] text-zinc-500">{mode.description}</span>
                    </span>
                  </span>
                  <div
                    className="flex h-4 w-4 items-center justify-center transition-all"
                    style={
                      isChecked
                        ? { borderRadius: "4px", background: "rgba(14, 165, 233, 0.20)", boxShadow: "0 1px 0 0 rgba(14, 165, 233, 0.10) inset" }
                        : { borderRadius: "4px", background: "#0E0E10", border: "1.5px solid #262628", boxShadow: "0 2.4px 2.4px 0 rgba(27, 28, 29, 0.12)" }
                    }
                  >
                    {isChecked && <Check className="h-3 w-3 text-cyan-500" />}
                  </div>
                </button>
              );
            };

            return (
              <div
                className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border overflow-hidden px-1 border-zinc-800 py-1"
                style={{ background: "#141416", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)" }}
              >
                {verified.length > 0 && (
                  <>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#757575]">Verified</p>
                    {verified.map(renderRow)}
                  </>
                )}
                {beta.length > 0 && (
                  <>
                    <div className="mx-3 my-1 border-t border-white/[0.06]" />
                    <p className="px-3 pt-1 pb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#757575]">Beta</p>
                    {beta.map(renderRow)}
                  </>
                )}
              </div>
            );
          })()}
        </div>

        {/* Sport Multi-Select */}
        <div className="relative" ref={dropdownRef}>
          <label className="mb-1.5 flex items-center gap-2 text-xs text-white font-medium">
            <Trophy className="h-4 w-4" />
            Markets
          </label>
          <button
            type="button"
            onClick={() => setSportsDropdownOpen(!sportsDropdownOpen)}
            className="flex h-10 w-full items-center justify-between px-3 text-sm text-white outline-none transition-all focus:ring-1 focus:ring-cyan-500/50"
            style={{
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.02)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
            }}
          >
            <span className="truncate text-zinc-300">
              {getSelectedSportsLabel()}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-[#757575] transition-transform ${
                sportsDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {sportsDropdownOpen && (
            <div
              className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border overflow-hidden px-1 border-zinc-800 py-1"
              style={{
                background: "#141416",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
              }}
            >
              {sportOptions.map((option) => {
                const isSelected = settings.selectedSports.includes(
                  option.value
                );
                const isDisabled = option.disabled === true;
                const isComingSoon = option.comingSoon === true;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !isDisabled && toggleSport(option.value)}
                    disabled={isDisabled}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                      isDisabled
                        ? "text-zinc-600 cursor-not-allowed"
                        : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {SPORT_ICONS[option.value] && (
                        <Image
                          src={SPORT_ICONS[option.value]}
                          alt=""
                          width={20}
                          height={20}
                          className="rounded shrink-0"
                        />
                      )}
                      {option.label}
                      {isComingSoon && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 font-medium">
                          Coming Soon
                        </span>
                      )}
                    </span>
                    <div
                      className="flex h-4 w-4 items-center justify-center transition-all"
                      style={
                        isSelected
                          ? {
                              borderRadius: "4px",
                              background: "rgba(14, 165, 233, 0.20)",
                              boxShadow:
                                "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
                            }
                          : {
                              borderRadius: "4px",
                              background: isDisabled ? "#1a1a1c" : "#0E0E10",
                              border: "1.5px solid #262628",
                              boxShadow:
                                "0 2.4px 2.4px 0 rgba(27, 28, 29, 0.12)",
                              opacity: isDisabled ? 0.5 : 1,
                            }
                      }
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-cyan-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Stop Loss */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-zinc-300">Stop Loss</span>
          </div>
          <button
            type="button"
            onClick={() => updateSetting("stopLossEnabled", !settings.stopLossEnabled)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: settings.stopLossEnabled ? "#0EA5E9" : "#3f3f46" }}
          >
            <div
              className="absolute top-1 w-4 h-4 rounded-full transition-all"
              style={{
                left: settings.stopLossEnabled ? "23px" : "4px",
                background: settings.stopLossEnabled ? "#ffffff" : "#71717a",
              }}
            />
          </button>
        </div>

        {/* Coverage (Insurance) */}
        {settings.coverageEnabled ? (
          <CoverageSlider
            value={settings.coverage}
            onChange={(v) => updateSetting("coverage", v)}
            min={1.01}
            max={1.1}
            step={0.01}
            enabled
            onEnabledChange={(v) => updateSetting("coverageEnabled", v)}
            backtestInfo={{
              label: "Recent backtests at 1.10× clamp (light hedge)",
              trades: 87,
              pnlUsd: 0,
              avgRecoveredPctOnLosses: 26.83,
              avgRecoveredPctOnLossesMainOnly: 17.45,
            }}
          />
        ) : (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-500">Coverage Off</span>
            </div>
            <button
              type="button"
              onClick={() => updateSetting("coverageEnabled", true)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: "#3f3f46" }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full transition-all"
                style={{ left: "4px", background: "#71717a" }}
              />
            </button>
          </div>
        )}
      </div>

      {/* Activate Button - Fixed at bottom */}
      <button
        onClick={active ? onDeactivate : handleActivate}
        disabled={loading}
        className="mt-3 h-11 w-full shrink-0 text-sm font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100 sm:mt-5"
        style={{
          borderRadius: "124px",
          background: active ? "#FF0066" : "#0EA5E9",
          boxShadow: active
            ? "0 1px 0 0 rgba(255, 0, 102, 0.10) inset"
            : "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
        }}
      >
        {active ? "Deactivate" : "Activate now"}
      </button>

      {/* Note - Fixed at bottom */}
      <div className="mt-3 flex shrink-0 gap-2 text-[11px] text-[#757575] sm:mt-5 sm:text-xs">
        <BadgeInfo className="h-4 w-4 shrink-0 text-[#FF0066]" />
        <p>
          <span className="text-[#FF0066]">Note:</span> Low wallet balance will
          deactivate sniper.
        </p>
      </div>

      {/* Platform Selection Dialog */}
      <Dialog open={platformDialogOpen} onOpenChange={setPlatformDialogOpen}>
        <DialogContent
          className="max-w-[360px] border-0 p-0 gap-0"
          style={{
            borderRadius: "12px",
            background:
              "linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
            boxShadow: "0 0 0 1px #292929, 0 0 0 2px #0A0A0A",
          }}
          showCloseButton={false}
        >
          <div className="px-5 pt-4 pb-0">
            <DialogTitle className="text-lg font-semibold text-white">
              Settings
            </DialogTitle>
          </div>

          <div className="px-5 pb-5 pt-2">
            <p className="text-sm text-[#757575]">
              Select which platforms the agent should snipe from.
            </p>

            <div className="flex gap-2 space-y-1 py-4">
              {PLATFORM_OPTIONS.map((option) => {
                const isSelected = globalSettings.selectedPlatforms.includes(
                  option.value
                );
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => togglePlatform(option.value)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                    }}
                  >
                    <span className="text-sm font-medium text-white">
                      {option.label}
                    </span>
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded transition-all"
                      style={
                        isSelected
                          ? {
                              borderRadius: "4px",
                              background: `${option.color}20`,
                              boxShadow: `0 1px 0 0 ${option.color}15 inset`,
                            }
                          : {
                              borderRadius: "4px",
                              background: "#0E0E10",
                              border: "1.5px solid #262628",
                              boxShadow:
                                "0 2.4px 2.4px 0 rgba(27, 28, 29, 0.12)",
                            }
                      }
                    >
                      {isSelected && (
                        <Check
                          className="h-3 w-3"
                          style={{ color: option.color }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Max concurrent + Execution */}
            <div className="flex gap-3 pb-4">
              <InputField
                label="Max concurrent"
                value={settings.maxConcurrent}
                onChange={(v) => updateSetting("maxConcurrent", v)}
                suffix=""
              />
              <div className="flex-1">
                <label className="mb-1.5 block text-xs text-white font-medium">Execution</label>
                <div
                  className="flex h-10 items-center justify-center rounded-full text-xs font-medium"
                  style={{
                    background: "rgba(14, 165, 233, 0.12)",
                    boxShadow: "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
                    color: "#0EA5E9",
                  }}
                >
                  Jupiter Only
                </div>
              </div>
            </div>

            <div className="pb-4">
              <div className="flex gap-3">
                <PercentageInputField
                  label="Beta stake (%)"
                  value={settings.betaStakePct}
                  onChange={(v) => updateSetting("betaStakePct", v)}
                  rightHint={betaStakeUsdLabel}
                />
                <StaticValueField
                  label="Max stake (USD)"
                  value={maxStakeUsdLabel}
                />
              </div>
              <p className="mt-1 text-[10px] text-[#757575]">
                Applied to Beta strategies as a percentage of max stake.
              </p>
              {betaWinsPerLossWarning && (
                <div className="mt-2 flex gap-2 text-[11px] text-[#757575]">
                  <BadgeInfo className="h-4 w-4 shrink-0 text-[#FF0066]" />
                  <p>
                    <span className="text-[#FF0066]">Warning:</span> Your current Beta
                    Stake size will need {betaWinsPerLossWarning} Burst 2.0 model wins
                    for every 1 Beta model loss. Assumes an average Burst 2.0 profit
                    of 15%.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPlatformDialogOpen(false)}
                className="flex-1 rounded-full py-3 text-sm font-medium text-zinc-400 transition-all hover:text-white"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setPlatformDialogOpen(false)}
                className="flex-1 rounded-full py-3 text-sm font-medium text-white transition-all hover:brightness-110"
                style={{
                  background: "#0EA5E9",
                  boxShadow: "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
