"use client";

import { useState, useCallback } from "react";
import { X, ArrowUpDown, ArrowDownToLine, ArrowUpFromLine, CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NeoCommand } from "./neo-command-input";

interface CommandPanelProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// ============ SWAP PANEL ============
interface SwapPanelProps extends CommandPanelProps {
  initialFrom?: string;
  initialTo?: string;
  initialAmount?: number;
}

export const SwapPanel = ({ onClose, initialFrom, initialTo, initialAmount }: SwapPanelProps) => {
  const [fromToken, setFromToken] = useState(initialFrom || "USDC");
  const [toToken, setToToken] = useState(initialTo || "SOL");
  const [amount, setAmount] = useState(initialAmount?.toString() || "");
  const [loading, setLoading] = useState(false);

  const tokens = ["USDC", "SOL", "ETH", "BTC", "USDT"];

  const handleSwap = useCallback(async () => {
    setLoading(true);
    // TODO: Integrate with LiFi widget or backend swap
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    // For now, just close - in production this would open LiFi widget
  }, []);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <ArrowUpDown className="h-4 w-4 text-[#0EA5E9]" />
          Swap Tokens
        </div>
        <button onClick={onClose} className="text-[#757575] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label className="text-xs text-[#9a9a9a]">From</Label>
          <div className="mt-1 flex gap-2">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="h-10 flex-1 bg-white/[0.02]"
            />
            <Select value={fromToken} onValueChange={setFromToken}>
              <SelectTrigger className="h-10 w-24 bg-white/[0.02]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tokens.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => {
              const tmp = fromToken;
              setFromToken(toToken);
              setToToken(tmp);
            }}
            className="rounded-full p-2 text-[#757575] hover:text-white transition-colors"
            style={{ background: "rgba(255, 255, 255, 0.03)" }}
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        <div>
          <Label className="text-xs text-[#9a9a9a]">To</Label>
          <div className="mt-1 flex gap-2">
            <Input
              value="—"
              disabled
              className="h-10 flex-1 bg-white/[0.02] text-[#757575]"
            />
            <Select value={toToken} onValueChange={setToToken}>
              <SelectTrigger className="h-10 w-24 bg-white/[0.02]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tokens.filter((t) => t !== fromToken).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <button
          onClick={handleSwap}
          disabled={loading || !amount}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-[#0EA5E9] transition-all hover:brightness-125 disabled:opacity-50"
          style={{ background: "rgba(14, 165, 233, 0.12)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpDown className="h-4 w-4" />}
          {loading ? "Swapping..." : "Swap"}
        </button>
      </div>
    </div>
  );
};

// ============ DEPOSIT PANEL ============
interface DepositPanelProps extends CommandPanelProps {
  initialAmount?: number;
  initialToken?: string;
  depositAddress?: string;
}

export const DepositPanel = ({ onClose, initialAmount, initialToken, depositAddress }: DepositPanelProps) => {
  const [amount, setAmount] = useState(initialAmount?.toString() || "");
  const [token, setToken] = useState(initialToken || "USDC");
  const [copied, setCopied] = useState(false);

  const address = depositAddress || process.env.NEXT_PUBLIC_DEPOSIT_ADDRESS || "—";

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <ArrowDownToLine className="h-4 w-4 text-[#0EE957]" />
          Deposit
        </div>
        <button onClick={onClose} className="text-[#757575] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label className="text-xs text-[#9a9a9a]">Amount</Label>
          <div className="mt-1 flex gap-2">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              inputMode="decimal"
              className="h-10 flex-1 bg-white/[0.02]"
            />
            <Select value={token} onValueChange={setToken}>
              <SelectTrigger className="h-10 w-24 bg-white/[0.02]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="SOL">SOL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs text-[#9a9a9a]">Send {token} to</Label>
          <div
            className="mt-1 flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer hover:bg-white/[0.02]"
            style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)" }}
            onClick={handleCopy}
          >
            <span className="font-mono text-xs text-white truncate">{address}</span>
            <span className="text-xs text-[#0EA5E9] ml-2">{copied ? "Copied!" : "Copy"}</span>
          </div>
        </div>

        <p className="text-xs text-[#606060] text-center">
          Deposits are credited automatically within minutes.
        </p>
      </div>
    </div>
  );
};

// ============ WITHDRAW PANEL ============
interface WithdrawPanelProps extends CommandPanelProps {
  initialAmount?: number;
  initialToken?: string;
  balance?: number;
  onWithdraw?: (amount: number, token: string, address: string) => Promise<void>;
}

export const WithdrawPanel = ({ onClose, onSuccess, initialAmount, initialToken, balance, onWithdraw }: WithdrawPanelProps) => {
  const [amount, setAmount] = useState(initialAmount?.toString() || "");
  const [token, setToken] = useState(initialToken || "USDC");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleWithdraw = useCallback(async () => {
    if (!amount || !address) return;
    setLoading(true);
    try {
      if (onWithdraw) {
        await onWithdraw(parseFloat(amount), token, address);
      }
      setSuccess(true);
      onSuccess?.();
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [amount, token, address, onWithdraw, onSuccess]);

  if (success) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-[#0EE957] mx-auto" />
          <p className="mt-4 text-sm text-white">Withdrawal submitted!</p>
          <button
            onClick={onClose}
            className="mt-4 text-xs text-[#757575] hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <ArrowUpFromLine className="h-4 w-4 text-[#FF6B6B]" />
          Withdraw
        </div>
        <button onClick={onClose} className="text-[#757575] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {balance !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#9a9a9a]">Available</span>
            <span className="text-white">${balance.toFixed(2)}</span>
          </div>
        )}

        <div>
          <Label className="text-xs text-[#9a9a9a]">Amount</Label>
          <div className="mt-1 flex gap-2">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50"
              inputMode="decimal"
              className="h-10 flex-1 bg-white/[0.02]"
            />
            <Select value={token} onValueChange={setToken}>
              <SelectTrigger className="h-10 w-24 bg-white/[0.02]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="SOL">SOL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs text-[#9a9a9a]">To Address</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Solana address..."
            className="mt-1 h-10 bg-white/[0.02] font-mono text-xs"
          />
        </div>

        <button
          onClick={handleWithdraw}
          disabled={loading || !amount || !address}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition-all hover:brightness-125 disabled:opacity-50"
          style={{ background: "rgba(255, 107, 107, 0.15)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
          {loading ? "Processing..." : "Withdraw"}
        </button>
      </div>
    </div>
  );
};

// ============ FUND CARD PANEL ============
interface FundCardPanelProps extends CommandPanelProps {
  initialAmount?: number;
  onIssueCard?: (amount: number, cardType: string, email: string) => Promise<void>;
  defaultEmail?: string;
}

export const FundCardPanel = ({ onClose, onSuccess, initialAmount, onIssueCard, defaultEmail }: FundCardPanelProps) => {
  const [amount, setAmount] = useState(initialAmount?.toString() || "50");
  const [cardType, setCardType] = useState<"visa" | "mastercard">("visa");
  const [email, setEmail] = useState(defaultEmail || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleIssue = useCallback(async () => {
    if (!amount || !email) return;
    setLoading(true);
    try {
      if (onIssueCard) {
        await onIssueCard(parseFloat(amount), cardType, email);
      }
      setSuccess(true);
      onSuccess?.();
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [amount, cardType, email, onIssueCard, onSuccess]);

  if (success) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-[#0EE957] mx-auto" />
          <p className="mt-4 text-sm text-white">Card issued!</p>
          <p className="mt-1 text-xs text-[#757575]">Check your email for details.</p>
          <button
            onClick={onClose}
            className="mt-4 text-xs text-[#757575] hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <CreditCard className="h-4 w-4 text-[#0EA5E9]" />
          Fund Neo Card
        </div>
        <button onClick={onClose} className="text-[#757575] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-[#9a9a9a]">Amount (USD)</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50"
              inputMode="decimal"
              className="mt-1 h-10 bg-white/[0.02]"
            />
          </div>
          <div>
            <Label className="text-xs text-[#9a9a9a]">Card Type</Label>
            <Select value={cardType} onValueChange={(v) => setCardType(v as any)}>
              <SelectTrigger className="mt-1 h-10 w-full bg-white/[0.02]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visa">Visa</SelectItem>
                <SelectItem value="mastercard">Mastercard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs text-[#9a9a9a]">Delivery Email</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            className="mt-1 h-10 bg-white/[0.02]"
          />
        </div>

        <button
          onClick={handleIssue}
          disabled={loading || !amount || !email}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-[#0EA5E9] transition-all hover:brightness-125 disabled:opacity-50"
          style={{ background: "rgba(14, 165, 233, 0.12)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {loading ? "Issuing..." : "Issue Card"}
        </button>
      </div>
    </div>
  );
};

// ============ STATUS PANEL ============
interface StatusPanelProps extends CommandPanelProps {
  orderId?: string;
  orderStatus?: string;
  balance?: number;
  onRefresh?: () => Promise<void>;
}

export const StatusPanel = ({ onClose, orderId, orderStatus, balance, onRefresh }: StatusPanelProps) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const statusColor = orderStatus === "completed" ? "text-[#0EE957]" : 
                      (orderStatus === "failed" || orderStatus === "expired") ? "text-[#FF6B6B]" : 
                      "text-[#F59E0B]";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          Neo Status
        </div>
        <button onClick={onClose} className="text-[#757575] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {balance !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9a9a9a]">Balance</span>
            <span className="text-lg font-semibold text-white">${balance.toFixed(2)}</span>
          </div>
        )}

        {orderId && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9a9a9a]">Last Order</span>
            <span className="font-mono text-xs text-white">{orderId.slice(0, 8)}...</span>
          </div>
        )}

        {orderStatus && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9a9a9a]">Status</span>
            <span className={`text-sm font-medium capitalize ${statusColor}`}>{orderStatus}</span>
          </div>
        )}

        {!orderId && !balance && (
          <p className="text-center text-xs text-[#606060]">No active cards or balance.</p>
        )}

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full text-xs text-[#757575] transition-all hover:text-white disabled:opacity-50"
          style={{ background: "rgba(255, 255, 255, 0.03)" }}
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
};

