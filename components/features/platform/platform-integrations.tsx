"use client";

import { useState } from "react";
import {
  Key,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  Shield,
  Server,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Types
interface PolymarketSettings {
  privateKey: string;
  isConnected: boolean;
}

interface KalshiSettings {
  email: string;
  password: string;
  apiKeyId: string;
  apiKeySecret: string;
  isConnected: boolean;
}

// Input component with show/hide toggle for sensitive data
const SecretInput = ({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) => {
  const [showValue, setShowValue] = useState(false);

  return (
    <div className="relative">
      <input
        type={showValue ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-12 w-full rounded-xl pl-4 pr-12 text-sm text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      />
      <button
        type="button"
        onClick={() => setShowValue(!showValue)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#757575] hover:text-zinc-300 transition-colors"
        disabled={disabled}
      >
        {showValue ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};

// Alert banner component
const SetupRequiredBanner = ({
  title,
  description,
  variant = "warning",
}: {
  title: string;
  description: string;
  variant?: "warning" | "success";
}) => {
  const isSuccess = variant === "success";

  return (
    <div
      className="flex items-start gap-3 rounded-xl p-4"
      style={{
        background: isSuccess
          ? "rgba(14, 233, 87, 0.08)"
          : "rgba(234, 179, 8, 0.08)",
        border: `1px solid ${
          isSuccess ? "rgba(14, 233, 87, 0.2)" : "rgba(234, 179, 8, 0.2)"
        }`,
      }}
    >
      {isSuccess ? (
        <Check className="h-5 w-5 shrink-0 text-[#0EE957]" />
      ) : (
        <AlertCircle className="h-5 w-5 shrink-0 text-yellow-500" />
      )}
      <div>
        <p
          className={`text-sm font-medium ${
            isSuccess ? "text-[#0EE957]" : "text-yellow-500"
          }`}
        >
          {title}
        </p>
        <p className="text-sm text-zinc-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
};

// Section card wrapper
const IntegrationCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) => (
  <div
    className="rounded-xl p-5"
    style={{
      background:
        "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
      boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
    }}
  >
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-5 w-5 text-[#A855F7]" />
      <h3 className="text-base font-semibold text-white">{title}</h3>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

// Kalshi Setup Dialog
const KalshiSetupDialog = ({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: Omit<KalshiSettings, "isConnected">) => void;
}) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiKeyId, setApiKeyId] = useState("");
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onSave({ email, password, apiKeyId, apiKeySecret });
    setIsLoading(false);
    onOpenChange(false);
    // Reset state
    setStep(1);
  };

  const resetAndClose = () => {
    setStep(1);
    setEmail("");
    setPassword("");
    setApiKeyId("");
    setApiKeySecret("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent
        className="sm:max-w-[500px] border-zinc-800"
        style={{
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.04) 100%), #0D0D0F",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Key className="h-5 w-5 text-[#A855F7]" />
            Kalshi Integration Setup
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Step {step} of 3 &mdash; {step === 1 && "Account Credentials"}
            {step === 2 && "API Configuration"}
            {step === 3 && "Confirm & Connect"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 my-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-all"
              style={{
                background: s <= step ? "#A855F7" : "rgba(255, 255, 255, 0.1)",
              }}
            />
          ))}
        </div>

        <div className="py-4 space-y-4">
          {step === 1 && (
            <>
              <div
                className="flex items-start gap-3 rounded-lg p-3"
                style={{
                  background: "rgba(168, 85, 247, 0.08)",
                  border: "1px solid rgba(168, 85, 247, 0.2)",
                }}
              >
                <Shield className="h-4 w-4 shrink-0 text-[#A855F7] mt-0.5" />
                <p className="text-xs text-zinc-400">
                  Your credentials are encrypted using AES-256 encryption and
                  stored securely. We never store plain-text credentials.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Kalshi Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-11 w-full rounded-lg px-4 text-sm text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-[#A855F7]/50"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Kalshi Password
                  </label>
                  <SecretInput
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••••••"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div
                className="flex items-start gap-3 rounded-lg p-3"
                style={{
                  background: "rgba(168, 85, 247, 0.08)",
                  border: "1px solid rgba(168, 85, 247, 0.2)",
                }}
              >
                <Server className="h-4 w-4 shrink-0 text-[#A855F7] mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs text-zinc-400">
                    Create API keys from your Kalshi dashboard for programmatic
                    trading access.
                  </p>
                  <a
                    href="https://kalshi.com/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#A855F7] hover:underline inline-flex items-center gap-1"
                  >
                    Open Kalshi API Settings{" "}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    API Key ID
                  </label>
                  <input
                    type="text"
                    value={apiKeyId}
                    onChange={(e) => setApiKeyId(e.target.value)}
                    placeholder="Enter your API Key ID"
                    className="h-11 w-full rounded-lg px-4 text-sm text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-[#A855F7]/50"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    API Key Secret
                  </label>
                  <SecretInput
                    value={apiKeySecret}
                    onChange={setApiKeySecret}
                    placeholder="Enter your API Key Secret"
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div
                className="rounded-lg p-4 space-y-3"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                }}
              >
                <h4 className="text-sm font-medium text-white">
                  Configuration Summary
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#757575]">Email</span>
                    <span className="text-white">{email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#757575]">Password</span>
                    <span className="text-white">••••••••</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#757575]">API Key ID</span>
                    <span className="text-white font-mono text-xs">
                      {apiKeyId.slice(0, 8)}...{apiKeyId.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#757575]">API Secret</span>
                    <span className="text-white">••••••••</span>
                  </div>
                </div>
              </div>

              <div
                className="flex items-start gap-3 rounded-lg p-3"
                style={{
                  background: "rgba(14, 233, 87, 0.08)",
                  border: "1px solid rgba(14, 233, 87, 0.2)",
                }}
              >
                <Check className="h-4 w-4 shrink-0 text-[#0EE957] mt-0.5" />
                <p className="text-xs text-zinc-400">
                  By connecting, you authorize Rainmaker to execute trades on
                  your behalf. You can revoke access at any time.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="h-10 px-4 rounded-lg text-sm font-medium text-zinc-300 transition-colors hover:text-white hover:bg-zinc-800"
            >
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && (!email || !password)) ||
                (step === 2 && (!apiKeyId || !apiKeySecret))
              }
              className="h-10 px-6 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #A855F7 0%, #9333EA 100%)",
              }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="h-10 px-6 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50 inline-flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #A855F7 0%, #9333EA 100%)",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Connect Kalshi
                </>
              )}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export const PlatformIntegrations = () => {
  const [polymarket, setPolymarket] = useState<PolymarketSettings>({
    privateKey: "",
    isConnected: false,
  });
  const [kalshi, setKalshi] = useState<KalshiSettings>({
    email: "",
    password: "",
    apiKeyId: "",
    apiKeySecret: "",
    isConnected: false,
  });
  const [kalshiDialogOpen, setKalshiDialogOpen] = useState(false);
  const [isSavingPolymarket, setIsSavingPolymarket] = useState(false);

  const handleSavePolymarket = async () => {
    if (!polymarket.privateKey) return;
    setIsSavingPolymarket(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setPolymarket((prev) => ({ ...prev, isConnected: true }));
    setIsSavingPolymarket(false);
  };

  const handleDisconnectPolymarket = () => {
    setPolymarket({ privateKey: "", isConnected: false });
  };

  const handleSaveKalshi = (settings: Omit<KalshiSettings, "isConnected">) => {
    setKalshi({ ...settings, isConnected: true });
  };

  const handleDisconnectKalshi = () => {
    setKalshi({
      email: "",
      password: "",
      apiKeyId: "",
      apiKeySecret: "",
      isConnected: false,
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Polymarket Section */}
      <IntegrationCard icon={Key} title="Polymarket Wallet">
        {polymarket.isConnected ? (
          <SetupRequiredBanner
            title="Polymarket Connected"
            description="Your Polygon wallet is connected and ready for trading."
            variant="success"
          />
        ) : (
          <SetupRequiredBanner
            title="Polymarket Setup Required"
            description="Import your Polygon private key to enable direct Polymarket trading. Your key is encrypted at rest."
          />
        )}

        {!polymarket.isConnected ? (
          <>
            <SecretInput
              value={polymarket.privateKey}
              onChange={(value) =>
                setPolymarket((prev) => ({ ...prev, privateKey: value }))
              }
              placeholder="0x... private key (Polygon)"
              disabled={isSavingPolymarket}
            />

            <button
              onClick={handleSavePolymarket}
              disabled={!polymarket.privateKey || isSavingPolymarket}
              className="h-11 w-full rounded-lg text-sm font-medium text-black transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
              }}
            >
              {isSavingPolymarket ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Polymarket Key"
              )}
            </button>
          </>
        ) : (
          <div
            className="flex items-center justify-between rounded-xl p-4"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#0EE957]/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-[#0EE957]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Wallet Connected
                </p>
                <p className="text-xs text-[#757575] font-mono">
                  {polymarket.privateKey.slice(0, 6)}...
                  {polymarket.privateKey.slice(-4)}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnectPolymarket}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </IntegrationCard>

      {/* Kalshi Section */}
      <IntegrationCard icon={Key} title="Kalshi Integration">
        {kalshi.isConnected ? (
          <SetupRequiredBanner
            title="Kalshi Connected"
            description="Your Kalshi account is connected and ready for autonomous trading."
            variant="success"
          />
        ) : (
          <SetupRequiredBanner
            title="Kalshi Setup Required"
            description="Connect your Kalshi account to enable autonomous prediction market trading"
          />
        )}

        {!kalshi.isConnected ? (
          <button
            onClick={() => setKalshiDialogOpen(true)}
            className="h-12 w-full rounded-xl text-sm font-medium text-white transition-all hover:brightness-110 inline-flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #A855F7 0%, #9333EA 100%)",
            }}
          >
            <Key className="h-4 w-4" />
            Setup Kalshi Integration
          </button>
        ) : (
          <div
            className="flex items-center justify-between rounded-xl p-4"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#A855F7]/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-[#A855F7]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Account Connected
                </p>
                <p className="text-xs text-[#757575]">{kalshi.email}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnectKalshi}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </IntegrationCard>

      {/* Kalshi Setup Dialog */}
      <KalshiSetupDialog
        open={kalshiDialogOpen}
        onOpenChange={setKalshiDialogOpen}
        onSave={handleSaveKalshi}
      />
    </div>
  );
};
