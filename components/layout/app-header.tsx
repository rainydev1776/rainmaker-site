"use client";

import { Search, Settings, LogOut, Menu, Copy, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useKeyboardShortcut } from "@/hooks";
import {
  ProfileSettingsDialog,
  SearchCommand,
  BiggestWinsDialog,
} from "@/components/features";
import { backendFetchJson } from "@/lib/backend";

interface AppHeaderProps {
  onConnectWallet?: () => void;
  onDisconnect?: () => void;
  isConnected?: boolean;
  walletAddress?: string;
  solBalance?: number | null;
  profileImage?: string;
  onMenuClick?: () => void;
  needsTradingWallet?: boolean;
  isEnablingTradingWallet?: boolean;
  onEnableTradingWallet?: () => void;
  displayName?: string;
  onDisplayNameChange?: (name: string) => void;
}

const formatAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// X (Twitter) Icon

// Solana Icon
const SolanaIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 397 311"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
      fill="url(#solana-gradient-1)"
    />
    <path
      d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
      fill="url(#solana-gradient-2)"
    />
    <path
      d="M332.1 120.9c-2.4-2.4-5.7-3.8-9.2-3.8H5.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
      fill="url(#solana-gradient-3)"
    />
    <defs>
      <linearGradient
        id="solana-gradient-1"
        x1="360.879"
        y1="-37.4553"
        x2="141.213"
        y2="383.294"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient
        id="solana-gradient-2"
        x1="264.829"
        y1="-87.6014"
        x2="45.163"
        y2="333.147"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient
        id="solana-gradient-3"
        x1="312.548"
        y1="-62.6883"
        x2="92.8822"
        y2="358.061"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
    </defs>
  </svg>
);

export const AppHeader = ({
  onConnectWallet,
  onDisconnect,
  isConnected,
  walletAddress,
  solBalance = null,
  profileImage,
  onMenuClick,
  needsTradingWallet = false,
  isEnablingTradingWallet = false,
  onEnableTradingWallet,
  displayName: displayNameProp = "",
  onDisplayNameChange,
}: AppHeaderProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBiggestWinsOpen, setIsBiggestWinsOpen] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState(profileImage);
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = useCallback(() => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  const handleSearchClick = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  useKeyboardShortcut({
    key: "k",
    modifiers: ["meta", "ctrl"],
    callback: handleSearchClick,
  });

  const handleDisconnect = () => {
    setIsPopoverOpen(false);
    onDisconnect?.();
  };

  const handleProfileSave = useCallback(async (data: {
    displayName: string;
    croppedImage?: string;
  }) => {
    const name = data.displayName.slice(0, 9).trim();
    onDisplayNameChange?.(name);
    const img = data.croppedImage ? String(data.croppedImage) : null;
    if (img) setUserProfileImage(img);
    try {
      await backendFetchJson("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name }),
      });
    } catch (e: any) {
      // Throw so the dialog can display an error and stay open.
      throw e;
    }
  }, [onDisplayNameChange]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-3 bg-[#08080B] sm:h-16 sm:px-4 lg:px-6">
      {/* Left side - Menu button, Logo and Search (on lg) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile Logo */}
        <img
          src="/rainmaker-logo.svg"
          alt="Rainmaker"
          className="h-4 md:hidden"
        />

        {/* Search Bar - Left side on lg+ */}
        <button
          onClick={handleSearchClick}
          className="hidden h-9 w-[280px] items-center gap-2 rounded-[150px] cursor-pointer px-3 text-sm transition-colors hover:bg-white/4 lg:flex"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
          }}
        >
          <Search className="h-4 w-4 shrink-0 text-[#757575]" />
          <span className="flex-1 text-left text-[13px] text-[#757575]">
            Search market
          </span>
          <kbd className="flex h-5 items-center gap-0.5 rounded border border-none px-1.5 font-mono text-[10px] text-zinc-400">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
        {/* Search Bar - Right side on mobile/tablet only */}
        <button
          onClick={handleSearchClick}
          className="flex h-8 items-center gap-2 rounded-[150px] px-2.5 text-sm transition-colors hover:bg-white/4 sm:h-9 sm:w-[200px] sm:px-3 lg:hidden"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
          }}
        >
          <Search className="h-4 w-4 shrink-0 text-[#757575]" />
          <span className="hidden flex-1 text-left text-[13px] text-[#757575] sm:block">
            Search market
          </span>
          <kbd className="hidden h-5 items-center gap-0.5 rounded border border-none px-1.5 font-mono text-[10px] text-zinc-400 sm:flex">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>

        {isConnected ? (
          <>
            {needsTradingWallet && (
              <button
                onClick={onEnableTradingWallet}
                disabled={isEnablingTradingWallet}
                className="hidden h-9 items-center justify-center rounded-[95px] px-4 text-[13px] font-medium text-cyan-300 transition-all hover:brightness-125 disabled:opacity-60 lg:flex"
                style={{
                  background: "rgba(14, 165, 233, 0.10)",
                  boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                }}
              >
                {isEnablingTradingWallet ? "Enabling…" : "Enable trading wallet"}
              </button>
            )}
            {/* Biggest Wins Button - Hidden on smaller screens */}
            <button
              onClick={() => setIsBiggestWinsOpen(true)}
              className="hidden h-9 items-center gap-2 rounded-[95px] px-4 cursor-pointer text-[14px] font-medium text-white transition-all hover:brightness-110 lg:flex"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
              }}
            >
              Best Wins
            </button>

            {/* Profile with Address - Popover */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Profile Button */}
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="flex h-8 items-center cursor-pointer gap-1.5 rounded-r-[20px] rounded-l-[50px] pl-1 pr-2.5 text-[11px] font-medium text-white transition-all hover:brightness-110 sm:h-9 sm:gap-2 sm:rounded-r-[24px] sm:rounded-l-[70px] sm:pl-1.5 sm:pr-4 sm:text-[13px]"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                    }}
                  >
                    <div className="relative h-5 w-5 overflow-hidden rounded-full sm:h-6 sm:w-6">
                      <Image
                        src={userProfileImage || "/rainmaker-pfp.png"}
                        alt="Profile"
                        fill
                        sizes="24px"
                        quality={100}
                        className="object-cover"
                      />
                    </div>
                    <span>
                      {walletAddress
                        ? formatAddress(walletAddress)
                        : "Connected"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-44 p-1 border-0"
                  style={{
                    background: "#0D0D0F",
                    boxShadow:
                      "0 4px 24px rgba(0, 0, 0, 0.5), 0 1px 0 0 rgba(255, 255, 255, 0.05) inset",
                    borderRadius: "12px",
                  }}
                  align="end"
                  sideOffset={8}
                >
                  {needsTradingWallet && (
                    <button
                      onClick={() => {
                        setIsPopoverOpen(false);
                        onEnableTradingWallet?.();
                      }}
                      disabled={isEnablingTradingWallet}
                      className="flex w-full items-center justify-center gap-2 font-medium rounded-lg px-3 py-2 text-sm text-cyan-300 transition-colors hover:bg-white/5 hover:text-cyan-200 disabled:opacity-60"
                      style={{
                        background: "rgba(14, 165, 233, 0.10)",
                        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                      }}
                    >
                      {isEnablingTradingWallet ? "Enabling…" : "Enable trading wallet"}
                    </button>
                  )}
                  <button
                    onClick={handleCopyAddress}
                    className="flex w-full items-center gap-3 font-medium rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied!" : "Copy Address"}
                  </button>
                  <button
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setIsProfileDialogOpen(true);
                    }}
                    className="flex w-full items-center gap-3 font-medium rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex w-full items-center gap-3 font-medium rounded-lg px-3 py-2 text-sm text-[#FF0066] transition-colors hover:bg-[#FF0066]/10 hover:text-[#FF0066]"
                  >
                    <LogOut className="h-4 w-4 min-w-4" />
                    Disconnect
                  </button>
                </PopoverContent>
              </Popover>
              {/* SOL Balance - Links to Withdraw */}
              {typeof solBalance === "number" && Number.isFinite(solBalance) && (
                <Link
                  href="/withdraw"
                  className="flex h-8 items-center gap-1.5 rounded-l-[20px] rounded-r-[50px] px-2.5 text-[11px] font-medium text-white transition-all hover:brightness-125 sm:h-9 sm:gap-2 sm:rounded-l-[24px] sm:rounded-r-[70px] sm:px-4 sm:text-[13px]"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                  }}
                >
                  <SolanaIcon />
                  <span className="text-xs font-medium text-white sm:text-sm">
                    {solBalance.toFixed(2)}
                  </span>
                </Link>
              )}
            </div>
          </>
        ) : (
          /* Connect Wallet Button */
          <button
            onClick={onConnectWallet}
            className="h-8 rounded-[95px] px-3 text-[12px] font-medium text-cyan-400 transition-all hover:brightness-125 sm:h-9 sm:px-5 sm:text-[14px]"
            style={{
              background:
                "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.05) 100%), rgba(14, 165, 233, 0.10)",
            }}
          >
            <span className="hidden sm:inline">Connect wallet</span>
            <span className="sm:hidden">Connect</span>
          </button>
        )}
      </div>

      {/* Profile Settings Dialog */}
      <ProfileSettingsDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        currentImage={userProfileImage}
        currentDisplayName={displayNameProp}
        onSave={handleProfileSave}
      />

      {/* Search Command */}
      <SearchCommand open={isSearchOpen} onOpenChange={setIsSearchOpen} />

      {/* Biggest Wins Dialog */}
      <BiggestWinsDialog
        open={isBiggestWinsOpen}
        onOpenChange={setIsBiggestWinsOpen}
        displayName={displayNameProp || "rainmaker_user"}
        profileImage={userProfileImage}
      />
    </header>
  );
};
