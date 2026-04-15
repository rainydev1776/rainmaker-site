"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { registry } from "@/lib/json-render/registry";

export interface AiRenderPositionData {
  id: string;
  ticker: string;
  sport: string;
  sportIcon: string;
  matchName: string;
  team: string;
  entryPrice: number;
  currentPrice: number;
  contracts: number;
  cost: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

interface AiRenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt: string;
  positionData: AiRenderPositionData | null;
}

interface UIComponent {
  type: string;
  props: Record<string, any>;
}

const presets = [
  { label: "Explain", prompt: "Explain this position" },
  { label: "Simulate", prompt: "Show what-if scenarios" },
  { label: "Risk", prompt: "Show risk analysis" },
];

export const AiRenderDialog = ({
  open,
  onOpenChange,
  initialPrompt,
  positionData,
}: AiRenderDialogProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [components, setComponents] = useState<UIComponent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setPrompt(initialPrompt);
      setComponents([]);
      setError(null);
    }
  }, [open, initialPrompt]);

  // Auto-generate on open if we have an initial prompt
  useEffect(() => {
    if (open && initialPrompt && positionData && components.length === 0 && !isLoading) {
      generate(initialPrompt);
    }
  }, [open, initialPrompt, positionData]);

  const generate = useCallback(
    async (userPrompt: string) => {
      if (!positionData || isLoading) return;

      // Cancel any existing request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);
      setComponents([]);

      try {
        const res = await fetch("/api/c9/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userPrompt,
            positionData,
            liveScore: null, // TODO: fetch live score
          }),
          signal: abortRef.current.signal,
        });

        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed to generate");
        if (j?.components && Array.isArray(j.components)) {
          setComponents(j.components);
        } else {
          throw new Error("Invalid AI response");
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Something went wrong");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [positionData, isLoading]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (prompt.trim()) generate(prompt);
    },
    [prompt, generate]
  );

  const handlePreset = useCallback(
    (presetPrompt: string) => {
      setPrompt(presetPrompt);
      generate(presetPrompt);
    },
    [generate]
  );

  if (!open || !positionData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-xl mx-4 rounded-xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          background: "linear-gradient(0deg, rgba(255,255,255,0) 34.52%, rgba(255,255,255,0.02) 100%), #0D0D0F",
          boxShadow: "0 1px 0 0 rgba(255,255,255,0.10) inset",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-medium text-white">AI Insights</h3>
          </div>
          <button onClick={() => onOpenChange(false)} className="text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Position context */}
        <div className="px-4 py-2 border-b border-[#1a1a1a] shrink-0">
          <p className="text-xs text-zinc-500">
            {positionData.matchName} • {positionData.team} • {positionData.contracts} contracts
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {isLoading && components.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            </div>
          )}

          {components.map((comp, idx) => {
            const Component = registry[comp.type];
            if (!Component) return null;
            return <Component key={idx} props={comp.props} />;
          })}

          {!isLoading && components.length === 0 && !error && (
            <div className="text-center py-8 text-sm text-zinc-500">
              Ask AI about this position
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[#1a1a1a] p-4 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask about this position..."
              disabled={isLoading}
              className="flex-1 h-9 rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 bg-white/[0.03] border border-[#2a2a2a] focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="h-9 px-4 rounded-lg text-sm font-medium text-white bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "..." : "Ask"}
            </button>
          </form>
          <div className="mt-3 flex gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p.prompt)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  boxShadow: "0 1px 0 0 rgba(255,255,255,0.06) inset",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


