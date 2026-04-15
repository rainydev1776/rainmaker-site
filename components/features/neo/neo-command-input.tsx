"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Sparkles, ArrowUpDown, ArrowDownToLine, ArrowUpFromLine, CreditCard, Info } from "lucide-react";

export type NeoCommand =
  | { type: "swap"; from?: string; to?: string; amount?: number }
  | { type: "deposit"; amount?: number; token?: string }
  | { type: "withdraw"; amount?: number; token?: string }
  | { type: "fund_card"; amount?: number }
  | { type: "status" }
  | { type: "unknown"; query: string };

interface NeoCommandInputProps {
  onCommand: (cmd: NeoCommand) => void;
  disabled?: boolean;
}

const presets: { label: string; icon: React.ReactNode; query: string }[] = [
  { label: "Swap", icon: <ArrowUpDown className="h-3.5 w-3.5" />, query: "swap" },
  { label: "Deposit", icon: <ArrowDownToLine className="h-3.5 w-3.5" />, query: "deposit" },
  { label: "Withdraw", icon: <ArrowUpFromLine className="h-3.5 w-3.5" />, query: "withdraw" },
  { label: "Fund Card", icon: <CreditCard className="h-3.5 w-3.5" />, query: "fund card $50" },
  { label: "Status", icon: <Info className="h-3.5 w-3.5" />, query: "card status" },
];

function parseCommand(input: string): NeoCommand {
  const q = input.toLowerCase().trim();

  // Swap: "swap 50 usdc to sol", "swap btc to usdc", "swap"
  if (q.includes("swap")) {
    const swapMatch = q.match(/swap\s*(\d+\.?\d*)?\s*(\w+)?\s*(?:to|for|->|→)?\s*(\w+)?/i);
    if (swapMatch) {
      const amount = swapMatch[1] ? parseFloat(swapMatch[1]) : undefined;
      const from = swapMatch[2]?.toUpperCase();
      const to = swapMatch[3]?.toUpperCase();
      return { type: "swap", from, to, amount };
    }
    return { type: "swap" };
  }

  // Deposit: "deposit 100 usdc", "deposit $50", "deposit"
  if (q.includes("deposit") || q.includes("add funds") || q.includes("top up")) {
    const depositMatch = q.match(/(?:deposit|add|top\s*up)\s*\$?(\d+\.?\d*)?\s*(\w+)?/i);
    const amount = depositMatch?.[1] ? parseFloat(depositMatch[1]) : undefined;
    const token = depositMatch?.[2]?.toUpperCase();
    return { type: "deposit", amount, token };
  }

  // Withdraw: "withdraw 50 usdc", "withdraw all", "withdraw"
  if (q.includes("withdraw") || q.includes("cash out")) {
    const withdrawMatch = q.match(/(?:withdraw|cash\s*out)\s*\$?(\d+\.?\d*)?\s*(\w+)?/i);
    const amount = withdrawMatch?.[1] ? parseFloat(withdrawMatch[1]) : undefined;
    const token = withdrawMatch?.[2]?.toUpperCase();
    return { type: "withdraw", amount, token };
  }

  // Fund card: "fund card $100", "issue card 50", "fund neo card"
  if (q.includes("fund") || q.includes("issue") || q.includes("card")) {
    if (q.includes("status") || q.includes("check")) {
      return { type: "status" };
    }
    const fundMatch = q.match(/(?:fund|issue|card)\s*(?:card|neo)?\s*\$?(\d+\.?\d*)?/i);
    const amount = fundMatch?.[1] ? parseFloat(fundMatch[1]) : undefined;
    return { type: "fund_card", amount };
  }

  // Status: "status", "check status", "card status"
  if (q.includes("status") || q.includes("check")) {
    return { type: "status" };
  }

  return { type: "unknown", query: input };
}

export const NeoCommandInput = ({ onCommand, disabled }: NeoCommandInputProps) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    const cmd = parseCommand(q);
    onCommand(cmd);
    setQuery("");
  }, [query, onCommand]);

  const handlePreset = useCallback((presetQuery: string) => {
    const cmd = parseCommand(presetQuery);
    onCommand(cmd);
  }, [onCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="w-full">
      {/* Input */}
      <div
        className={`relative flex items-center rounded-xl transition-all ${focused ? "ring-1 ring-[#0EA5E9]/30" : ""}`}
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
        }}
      >
        <Sparkles className="absolute left-3 h-4 w-4 text-[#0EA5E9]/60" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="swap usdc to sol, deposit $100, fund card..."
          className="h-11 w-full bg-transparent pl-10 pr-10 text-sm text-white placeholder:text-[#606060] focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !query.trim()}
          className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-lg text-[#757575] transition-colors hover:text-white disabled:opacity-30"
          style={{
            background: query.trim() ? "rgba(14, 165, 233, 0.15)" : "transparent",
          }}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Presets */}
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.query)}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[#9a9a9a] transition-colors hover:text-white disabled:opacity-50"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
            }}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};









