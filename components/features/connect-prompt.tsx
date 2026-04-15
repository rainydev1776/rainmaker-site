"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Key,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Upload,
  ChevronRight,
  Shield,
  Settings,
  Power,
} from "lucide-react";
import { MOTION_VARIANTS, MOTION_TRANSITION } from "@/lib/constants";

type SetupFlow = null | "polymarket" | "kalshi";
type KalshiStep = 1 | 2 | 3;

interface PlatformConnection {
  isConnected: boolean;
  keyId?: string;
  privateKey?: string;
  maskedKey?: string;
  walletAddr?: string;
}

interface ConnectPromptProps {
  polymarketConnection?: PlatformConnection;
  kalshiConnection?: PlatformConnection;
  onConnectPolymarket?: () => Promise<string | null> | void;
  onConnectKalshi?: (keyId: string, privateKey: string) => void;
  onDisconnectPolymarket?: () => void;
  onDisconnectKalshi?: () => void;
  /** True while keys are being loaded from backend — prevents premature "Generate Wallet" display */
  isLoadingKeys?: boolean;
}

export const ConnectPrompt = ({
  polymarketConnection = { isConnected: false },
  kalshiConnection = { isConnected: false },
  onConnectPolymarket,
  onConnectKalshi,
  onDisconnectPolymarket,
  onDisconnectKalshi,
  isLoadingKeys = false,
}: ConnectPromptProps) => {
  const [activeFlow, setActiveFlow] = useState<SetupFlow>(null);
  const [kalshiStep, setKalshiStep] = useState<KalshiStep>(1);
  const [isReconfiguring, setIsReconfiguring] = useState<
    "polymarket" | "kalshi" | null
  >(null);

  // Polymarket state
  const [pmWalletAddr, setPmWalletAddr] = useState<string | null>(null);
  const [isPmGenerating, setIsPmGenerating] = useState(false);
  const [pmError, setPmError] = useState<string | null>(null);
  const effectivePmAddr = pmWalletAddr || polymarketConnection.walletAddr || null;

  // Kalshi state
  const [kalshiKeyId, setKalshiKeyId] = useState("");
  const [kalshiPrivateKey, setKalshiPrivateKey] = useState("");
  const [copied, setCopied] = useState(false);

  const showPolymarket =
    polymarketConnection.isConnected || typeof onConnectPolymarket === "function";
  const showKalshi =
    kalshiConnection.isConnected || typeof onConnectKalshi === "function";

  const isAnyConnected =
    (showPolymarket && polymarketConnection.isConnected) ||
    (showKalshi && kalshiConnection.isConnected);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText("https://kalshi.com/sign-up/");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setKalshiPrivateKey((event.target?.result as string).trim());
      };
      reader.readAsText(file);
    }
  };

  const handlePolymarketSubmit = async () => {
    if (isPmGenerating) return;
    setIsPmGenerating(true);
    setPmError(null);
    try {
      const out = await onConnectPolymarket?.();
      if (typeof out === "string" && out) {
        setPmWalletAddr(out);
      } else {
        // If the backend didn't return an address, show error
        setPmError("Failed to generate wallet. Please try again.");
      }
    } catch (e) {
      setPmError((e as Error)?.message || "Failed to generate wallet");
    } finally {
      setIsPmGenerating(false);
    }
  };

  const handleKalshiSubmit = () => {
    if (kalshiKeyId && kalshiPrivateKey) {
      onConnectKalshi?.(kalshiKeyId, kalshiPrivateKey);
      resetFlow();
    }
  };

  const startReconfigure = (platform: "polymarket" | "kalshi") => {
    setIsReconfiguring(platform);
    setActiveFlow(platform);
    if (platform === "polymarket") setPmWalletAddr(null);
    if (platform === "kalshi") {
      setKalshiStep(3); // Skip to step 3 (enter keys) when reconfiguring
      if (kalshiConnection.keyId) {
        setKalshiKeyId(kalshiConnection.keyId);
      }
      if (kalshiConnection.privateKey) {
        setKalshiPrivateKey(kalshiConnection.privateKey);
      }
    }
  };

  const resetFlow = () => {
    setActiveFlow(null);
    setKalshiStep(1);
    setPmWalletAddr(null);
    setKalshiKeyId("");
    setKalshiPrivateKey("");
    setIsReconfiguring(null);
  };

  // Connected platform card
  const [cardCopied, setCardCopied] = useState(false);
  
  const ConnectedCard = ({
    platform,
    connection,
    onReconfigure,
    onDisconnect,
    color,
  }: {
    platform: string;
    connection: PlatformConnection;
    onReconfigure: () => void;
    onDisconnect?: () => void;
    color: "cyan" | "emerald";
  }) => {
    const colorClasses = {
      cyan: {
        bg: "rgba(14, 165, 233, 0.08)",
        border: "rgba(14, 165, 233, 0.15)",
        icon: "text-cyan-400",
        iconBg: "bg-cyan-400/10",
      },
      emerald: {
        bg: "rgba(14, 233, 87, 0.08)",
        border: "rgba(14, 233, 87, 0.15)",
        icon: "text-emerald-400",
        iconBg: "bg-emerald-400/10",
      },
    };

    const colors = colorClasses[color];
    const hasWalletAddr = !!connection.walletAddr;

    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${colors.iconBg}`}
            >
              <Shield className={`h-5 w-5 ${colors.icon}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{platform}</p>
              <p className="text-xs text-[#757575]">
                {connection.maskedKey || "Connected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Copy wallet address button (Polymarket) */}
            {hasWalletAddr && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(connection.walletAddr!);
                  setCardCopied(true);
                  setTimeout(() => setCardCopied(false), 1500);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#757575] transition-colors hover:bg-white/5 hover:text-white"
                title="Copy wallet address"
              >
                {cardCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={onReconfigure}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#757575] transition-colors hover:bg-white/5 hover:text-white"
              title="Reconfigure"
            >
              <Settings className="h-4 w-4" />
            </button>
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#757575] transition-colors hover:bg-red-500/10 hover:text-red-400"
                title="Disconnect"
              >
                <Power className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {/* Show full wallet address for Polymarket */}
        {hasWalletAddr && (
          <div className="mt-3 rounded-lg bg-black/20 p-2">
            <p className="break-all text-[10px] text-[#757575] font-mono">
              {connection.walletAddr}
            </p>
            <p className="mt-1 text-[9px] text-[#555]">
              Fund with USDC on Polygon
            </p>
          </div>
        )}
      </div>
    );
  };

  // Main selection view (when no platform is connected or showing config)
  if (!activeFlow) {
    // If any platform is connected, show the connected state with option to add more
    if (isAnyConnected) {
      return (
        <div className="flex h-full w-full items-center justify-center px-4">
          <m.div
            key="integrations-view"
            className="flex w-full max-w-sm flex-col gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div>
              <h1 className="text-lg font-semibold text-white">
                Your Integrations
              </h1>
              <p className="mt-1 text-sm text-[#757575]">
                Manage your connected trading accounts
              </p>
            </div>

            {/* Connected platforms */}
            <div className="flex flex-col gap-3">
              {showPolymarket &&
                (polymarketConnection.isConnected ? (
                  <ConnectedCard
                    platform="Polymarket"
                    connection={polymarketConnection}
                    onReconfigure={() => startReconfigure("polymarket")}
                    onDisconnect={onDisconnectPolymarket}
                    color="cyan"
                  />
                ) : (
                  <button
                    onClick={() => setActiveFlow("polymarket")}
                    className="flex h-14 w-full items-center justify-between rounded-xl px-4 text-sm font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-white"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
                    }}
                  >
                    <span>Connect Polymarket</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}

              {showKalshi &&
                (kalshiConnection.isConnected ? (
                  <ConnectedCard
                    platform="Kalshi"
                    connection={kalshiConnection}
                    onReconfigure={() => startReconfigure("kalshi")}
                    onDisconnect={onDisconnectKalshi}
                    color="emerald"
                  />
                ) : (
                  <button
                    onClick={() => setActiveFlow("kalshi")}
                    className="flex h-14 w-full items-center justify-between rounded-xl px-4 text-sm font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-white"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
                    }}
                  >
                    <span>Connect Kalshi</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
            </div>
          </m.div>
        </div>
      );
    }

    // Default: no connections
    return (
      <div className="flex h-full w-full items-center justify-center px-4">
        <m.div
          key="connect-view"
          className="flex flex-col items-center gap-5 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            Connect to start
          </h1>

          <p className="max-w-[280px] text-[13px] leading-relaxed text-[#757575] sm:text-[14px] font-medium">
            We couldn&apos;t find your Polymarket or
            <br />
            Kalshi account, please connect
          </p>

          <div className="flex w-full flex-col gap-2 pt-2 sm:w-auto sm:flex-row sm:gap-3">
            <button
              onClick={() => setActiveFlow("polymarket")}
              className="h-10 w-full rounded-[28px] px-5 text-[13px] font-medium text-cyan-400 transition-all hover:brightness-125 sm:w-auto"
              style={{
                background: "rgba(14, 165, 233, 0.10)",
                boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
              }}
            >
              Connect Polymarket
            </button>
            <button
              onClick={() => setActiveFlow("kalshi")}
              className="h-10 w-full rounded-[28px] px-5 text-[13px] font-medium text-emerald-400 transition-all hover:brightness-125 sm:w-auto"
              style={{
                background: "rgba(14, 233, 87, 0.10)",
                boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
              }}
            >
              Connect Kalshi
            </button>
          </div>
        </m.div>
      </div>
    );
  }

  // Polymarket setup flow
  if (activeFlow === "polymarket") {
    return (
      <div className="flex h-full w-full items-center justify-center px-4">
        <AnimatePresence mode="wait">
          <m.div
            key="polymarket"
            className="flex w-full max-w-sm flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Back button */}
            <button
              onClick={resetFlow}
              className="mb-6 flex items-center gap-2 text-sm text-[#757575] transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">
                {isReconfiguring === "polymarket"
                  ? "Reconfigure Polymarket"
                  : "Connect Polymarket"}
              </h2>
              <p className="mt-2 text-sm text-[#757575]">
                Generate a dedicated Polymarket trading wallet for your C9 bot.
              </p>
            </div>

            {/* Info */}
            {effectivePmAddr ? (
              <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs font-medium text-zinc-200">Bot wallet address</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="break-all text-xs text-[#9f9f9f]">{effectivePmAddr}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(effectivePmAddr);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#757575] transition-colors hover:bg-white/5 hover:text-white"
                    title="Copy"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-[#757575]">
                  Fund this address with USDC.e on Polygon for Polymarket trading. If you sent native USDC by mistake, use the Recover tokens tool in Wallet.
                </p>
                {typeof onConnectPolymarket === "function" && (
                  <button
                    type="button"
                    onClick={handlePolymarketSubmit}
                    disabled={isPmGenerating || isLoadingKeys}
                    className="mt-3 text-[11px] font-medium text-cyan-400 transition-all hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Refresh wallet address
                  </button>
                )}
              </div>
            ) : (
              <p className="mb-6 text-xs text-[#757575]">
                We generate a unique wallet per user and store the private key encrypted at rest.
              </p>
            )}

            {/* Error message */}
            {pmError && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                {pmError}
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={effectivePmAddr ? resetFlow : handlePolymarketSubmit}
              onTouchEnd={(e) => {
                // Mobile fix: ensure touch events trigger the handler
                if (!effectivePmAddr && !isPmGenerating && !isLoadingKeys) {
                  e.preventDefault();
                  handlePolymarketSubmit();
                }
              }}
              disabled={isPmGenerating || isLoadingKeys}
              className="h-12 min-h-[48px] w-full rounded-[124px] text-sm font-medium text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: (isPmGenerating || isLoadingKeys) ? "#0284c7" : "#0EA5E9",
                boxShadow: "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {effectivePmAddr ? "Done" : isLoadingKeys ? "Checking wallet..." : isPmGenerating ? "Generating..." : "Generate Wallet"}
            </button>
          </m.div>
        </AnimatePresence>
      </div>
    );
  }

  // Kalshi setup flow
  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <AnimatePresence mode="wait">
        <m.div
          key={`kalshi-${kalshiStep}`}
          className="flex w-full max-w-sm flex-col"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Back button */}
          <button
            onClick={
              kalshiStep === 1
                ? resetFlow
                : () => setKalshiStep((s) => (s - 1) as KalshiStep)
            }
            className="mb-6 flex items-center gap-2 text-sm text-[#757575] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {kalshiStep === 1 ? "Back" : "Previous step"}
          </button>

          {/* Step indicator */}
          <div className="mb-4 flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className="h-1 flex-1 rounded-full transition-all"
                style={{
                  background:
                    step <= kalshiStep
                      ? "#0EE957"
                      : "rgba(255, 255, 255, 0.08)",
                }}
              />
            ))}
          </div>

          {/* Step 1: Create Account */}
          {kalshiStep === 1 && (
            <>
              <div className="mb-6">
                <p className="mb-1 text-xs font-medium text-emerald-400">
                  Step 1 of 3
                </p>
                <h2 className="text-xl font-semibold text-white">
                  {isReconfiguring === "kalshi"
                    ? "Reconfigure Kalshi"
                    : "Create Kalshi Account"}
                </h2>
                <p className="mt-2 text-sm text-[#757575]">
                  Sign up and complete KYC verification
                </p>
              </div>

              {/* Referral link */}
              <div
                className="mb-4 flex items-center justify-between rounded-xl p-4"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    Referral Link
                  </p>
                  <p className="truncate text-xs text-[#757575]">
                    kalshi.com/sign-up/
                  </p>
                </div>
                <button
                  onClick={handleCopyReferral}
                  className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-zinc-400" />
                  )}
                </button>
              </div>

              <a
                href="https://kalshi.com/sign-up/"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-emerald-400 transition-all hover:brightness-125"
                style={{
                  background: "rgba(14, 233, 87, 0.10)",
                  boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
                }}
              >
                Open Kalshi
                <ExternalLink className="h-4 w-4" />
              </a>

              <button
                onClick={() => setKalshiStep(2)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[124px] text-sm font-medium text-white transition-all hover:brightness-110"
                style={{
                  background: "#0EE957",
                  boxShadow: "0 1px 0 0 rgba(14, 233, 87, 0.10) inset",
                }}
              >
                {isReconfiguring === "kalshi"
                  ? "Continue"
                  : "I've created my account"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Step 2: Generate API Key */}
          {kalshiStep === 2 && (
            <>
              <div className="mb-6">
                <p className="mb-1 text-xs font-medium text-emerald-400">
                  Step 2 of 3
                </p>
                <h2 className="text-xl font-semibold text-white">
                  Generate API Key
                </h2>
                <p className="mt-2 text-sm text-[#757575]">
                  Create an API key in your Kalshi settings
                </p>
              </div>

              {/* Steps */}
              <div
                className="mb-6 rounded-xl p-4"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
                }}
              >
                <ol className="space-y-2.5 text-sm text-[#757575]">
                  <li className="flex gap-3">
                    <span className="text-emerald-400 min-w-3">1.</span>
                    Go to Account Settings
                  </li>
                  <li className="flex gap-3">
                    <span className="text-emerald-400 min-w-3">2.</span>
                    Navigate to API Keys
                  </li>
                  <li className="flex gap-3">
                    <span className="text-emerald-400 min-w-3">3.</span>
                    Click Create New API Key
                  </li>
                  <li className="flex gap-3">
                    <span className="text-emerald-400 min-w-3">4.</span>
                    Download the private key file
                  </li>
                </ol>
              </div>

              <p className="mb-6 text-sm text-[#757575]">
                <Key className="mr-1.5 inline h-3 w-3 text-[#757575" />
                Save your private key immediately — Kalshi won&apos;t show it
                again
              </p>

              <button
                onClick={() => setKalshiStep(3)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[124px] text-sm font-medium text-white transition-all hover:brightness-110"
                style={{
                  background: "#0EE957",
                  boxShadow: "0 1px 0 0 rgba(14, 233, 87, 0.10) inset",
                }}
              >
                I&apos;ve got my keys
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Step 3: Enter Keys */}
          {kalshiStep === 3 && (
            <>
              <div className="mb-6">
                <p className="mb-1 text-xs font-medium text-emerald-400">
                  Step 3 of 3
                </p>
                <h2 className="text-xl font-semibold text-white">
                  Enter Your Keys
                </h2>
                <p className="mt-2 text-sm text-[#757575]">
                  Paste your API credentials to connect
                </p>
              </div>

              {/* Key ID */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  API Key ID
                </label>
                <input
                  type="text"
                  value={kalshiKeyId}
                  onChange={(e) => setKalshiKeyId(e.target.value)}
                  placeholder="Enter key ID"
                  className="h-11 w-full rounded-xl px-4 text-sm text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-emerald-500/50"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
                  }}
                />
              </div>

              {/* Private Key */}
              <div className="mb-2">
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Private Key
                </label>
                <textarea
                  value={kalshiPrivateKey}
                  onChange={(e) => setKalshiPrivateKey(e.target.value)}
                  placeholder="Paste private key"
                  rows={3}
                  className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-emerald-500/50"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.06) inset",
                  }}
                />
              </div>

              <label className="mb-6 flex cursor-pointer items-center gap-2 text-xs text-[#757575] transition-colors hover:text-zinc-300">
                <Upload className="h-3.5 w-3.5" />
                Upload .pem file
                <input
                  type="file"
                  accept=".pem,.txt,.key"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleKalshiSubmit}
                disabled={!kalshiKeyId || !kalshiPrivateKey}
                className="h-11 w-full rounded-[124px] text-sm font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "#0EE957",
                  boxShadow: "0 1px 0 0 rgba(14, 233, 87, 0.10) inset",
                }}
              >
                {isReconfiguring === "kalshi"
                  ? "Update Kalshi"
                  : "Connect Kalshi"}
              </button>
            </>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
};
