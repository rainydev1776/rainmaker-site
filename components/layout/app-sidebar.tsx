"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  Crosshair,
  HelpCircle,
  BookOpenText,
  ShieldCheck,
  Sparkles,
  Coins,
  PiggyBank,
  LifeBuoy,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  displayName?: string;
}

// Rainmaker logo - double arc umbrella style
const RainmakerLogo = () => (
  <img src="/rainmaker-logo.svg" alt="Rainmaker Logo" className="h-4" />
);

// Social links component
const SocialLinks = ({ compact = false }: { compact?: boolean }) => (
  <div
    className={`flex ${
      compact ? "justify-center" : "justify-center lg:justify-start"
    }`}
  >
    <div className="flex w-full gap-1">
      {/* X (Twitter) */}
      <a
        href="https://x.com/rainmakerdotfun"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 items-center justify-center text-[#757575] transition-colors hover:text-white w-full"
        style={{
          borderRadius: "100px 24px 24px 100px",
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.05) 100%), #101010",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      >
        <Image
          src="/x-icon.svg"
          alt="X"
          width={16}
          height={16}
          className="opacity-60 hover:opacity-100 transition-opacity duration-200 ease-out"
        />
      </a>

      {/* Discord */}
      <a
        href="https://discord.gg/rainmakerdotfun"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 items-center justify-center text-[#757575] transition-colors hover:text-white w-full"
        style={{
          borderRadius: "4px",
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.05) 100%), #101010",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      >
        <Image
          src="/discord-icon.svg"
          alt="Discord"
          width={18}
          height={18}
          className="opacity-60 hover:opacity-100 transition-opacity duration-200 ease-out"
        />
      </a>

      {/* Dexscreener */}
      <a
        href="https://dexscreener.com/solana/69au8dkw4xxrza6hosi4fibmykjt6uefo9o4crus4vne"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 items-center justify-center text-[#757575] transition-colors hover:text-white w-full"
        style={{
          borderRadius: "24px 100px 100px 24px",
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.05) 100%), #101010",
          boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
        }}
      >
        <Image
          src="/dexscreener-icon.svg"
          alt="Dexscreener"
          width={14}
          height={14}
          className="opacity-60 hover:opacity-100 transition-opacity duration-200 ease-out"
        />
      </a>
    </div>
  </div>
);

interface NavItemExtended extends NavItem {
  disabled?: boolean;
  comingSoon?: boolean;
}

const mainNavItems: NavItemExtended[] = [
  { title: "C9", href: "/c9", icon: <Crosshair className="h-4 w-4" /> },
  {
    title: "Portfolio",
    href: "/portfolio",
    icon: <PiggyBank className="h-4 w-4" />,
  },
  {
    title: "Neo",
    href: "/neo",
    icon: <Coins className="h-4 w-4" />,
  },
];

const infoNavItems: NavItemExtended[] = [
  {
    title: "Terms & Conditions",
    href: "/terms",
    icon: <BookOpenText className="h-4 w-4" />,
  },
  {
    title: "Privacy Policy",
    href: "/privacy",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    title: "Help",
    href: "#",
    icon: <HelpCircle className="h-4 w-4" />,
    comingSoon: true,
  },
];

const NavContent = ({
  onItemClick,
  showLabels = true,
  displayName,
}: {
  onItemClick?: () => void;
  showLabels?: boolean;
  displayName?: string;
}) => {
  const pathname = usePathname();
  const [comingSoonFlash, setComingSoonFlash] = useState<string | null>(null);

  const handleComingSoon = (title: string) => {
    setComingSoonFlash(title);
    setTimeout(() => setComingSoonFlash(null), 2000);
  };

  return (
    <>
      <SidebarGroup className="p-0">
        {showLabels && (
          <SidebarGroupLabel className="mb-1 px-3 text-[11px] font-[#757575]">
            {displayName ? `Hi, ${displayName}` : "Rainmaker"}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent className="[&>button]:hidden">
          <SidebarMenu className="gap-2 ">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              const isDisabled = item.disabled;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild={!isDisabled}
                    isActive={isActive}
                    className={`gap-3 rounded-[60px] py-2 px-3 text-[13px] font-normal hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent duration-200 ease-out ${
                      isDisabled
                        ? "text-[#4a4a4a] cursor-not-allowed opacity-50"
                        : isActive
                        ? "text-[#F4F4F5]"
                        : "text-[#878787] hover:text-zinc-200"
                    }`}
                    style={
                      isActive && !isDisabled
                        ? {
                            background:
                              "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.05) 100%), rgba(255, 255, 255, 0.05)",
                            boxShadow:
                              "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                          }
                        : undefined
                    }
                  >
                    {isDisabled ? (
                      <div className="flex items-center gap-3">
                        <span className="text-[#4a4a4a]">{item.icon}</span>
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                    ) : (
                      <Link href={item.href} onClick={onItemClick}>
                        <span
                          className={isActive ? "text-white" : "text-[#757575]"}
                        >
                          {item.icon}
                        </span>
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="mt-6 p-0">
        {showLabels && (
          <SidebarGroupLabel className="mb-1 px-3 text-[11px] font-normal text-[#757575]">
            Info &amp; Legal
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {infoNavItems.map((item) => {
              const isActive = !item.comingSoon && pathname === item.href;
              const isFlashing = comingSoonFlash === item.title;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild={!item.comingSoon}
                    isActive={isActive}
                    className={`gap-3 rounded-[60px] py-2 px-3 text-[13px] font-normal hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent transition-colors ${
                      isActive
                        ? "text-[#F4F4F5]"
                        : "text-[#878787] hover:text-zinc-200"
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.05) 100%), rgba(255, 255, 255, 0.05)",
                            boxShadow:
                              "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                          }
                        : undefined
                    }
                  >
                    {item.comingSoon ? (
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => handleComingSoon(item.title)}
                      >
                        <span className="text-[#757575]">{item.icon}</span>
                        <span className="text-sm font-medium">
                          {isFlashing ? "Coming Soon" : item.title}
                        </span>
                      </div>
                    ) : (
                      <Link href={item.href} onClick={onItemClick}>
                        <span
                          className={isActive ? "text-white" : "text-[#757575]"}
                        >
                          {item.icon}
                        </span>
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
};

export const AppSidebar = ({
  mobileOpen,
  onMobileOpenChange,
  displayName,
}: AppSidebarProps) => {
  const pathname = usePathname();
  const [comingSoonFlash, setComingSoonFlash] = useState<string | null>(null);

  const handleComingSoon = (title: string) => {
    setComingSoonFlash(title);
    setTimeout(() => setComingSoonFlash(null), 2000);
  };

  return (
    <>
      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[280px] border-r-0 bg-[#08080B] p-0 [&>button]:hidden gap-0"
        >
          <SheetHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-white/5">
            <SheetTitle className="flex items-center gap-2">
              <RainmakerLogo />
              <span className="text-[15px] font-medium tracking-tight text-white">
                Rainmaker
              </span>
            </SheetTitle>
            <button
              onClick={() => onMobileOpenChange?.(false)}
              className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </SheetHeader>
          <div className="flex flex-1 flex-col px-3 pt-2">
            <NavContent onItemClick={() => onMobileOpenChange?.(false)} displayName={displayName} />
            <div className="mt-auto pb-6 pt-4">
              <SocialLinks compact />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - Hidden on mobile */}
      <Sidebar
        collapsible="none"
        className="hidden md:flex w-[72px] border-r-0 bg-[#08080B] lg:w-[240px]"
      >
        <SidebarHeader className="px-3 py-6 lg:py-5 lg:px-5">
          <Link
            href="/"
            className="flex items-center gap-2 justify-center lg:justify-start"
          >
            <RainmakerLogo />
            <span className="hidden text-[15px] font-medium tracking-tight text-white lg:inline">
              Rainmaker
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2 pt-2 lg:px-3">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="mb-1 hidden px-3 text-[11px] font-normal text-[#757575] lg:block">
              {displayName ? `Hi, ${displayName}` : "Rainmaker"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {mainNavItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href === "/c9" && pathname === "/");
                  const isDisabled = item.disabled;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild={!isDisabled}
                        isActive={isActive}
                        className={`gap-3 rounded-[60px] py-2 px-3 text-[13px] font-normal hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent duration-200 ease-out justify-center lg:justify-start ${
                          isDisabled
                            ? "text-[#4a4a4a] cursor-not-allowed opacity-50"
                            : isActive
                            ? "text-[#F4F4F5]"
                            : "text-[#878787] hover:text-zinc-200"
                        }`}
                        style={
                          isActive && !isDisabled
                            ? {
                                background:
                                  "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.05) 100%), rgba(255, 255, 255, 0.05)",
                                boxShadow:
                                  "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                              }
                            : undefined
                        }
                      >
                        {isDisabled ? (
                          <div className="flex items-center gap-3 justify-center lg:justify-start">
                            <span className="text-[#4a4a4a]">{item.icon}</span>
                            <span className="hidden text-sm font-medium lg:inline">
                              {item.title}
                            </span>
                          </div>
                        ) : (
                          <Link href={item.href}>
                            <span
                              className={
                                isActive ? "text-white" : "text-[#757575]"
                              }
                            >
                              {item.icon}
                            </span>
                            <span className="hidden text-sm font-medium lg:inline">
                              {item.title}
                            </span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-6 p-0">
            <SidebarGroupLabel className="mb-1 hidden px-3 text-[11px] font-normal text-[#757575] lg:block">
              Info &amp; Legal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {infoNavItems.map((item) => {
                  const isActive = !item.comingSoon && pathname === item.href;
                  const isFlashing = comingSoonFlash === item.title;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild={!item.comingSoon}
                        isActive={isActive}
                        className={`gap-3 rounded-[60px] py-2 px-3 text-[13px] font-normal hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent transition-colors justify-center lg:justify-start ${
                          isActive
                            ? "text-[#F4F4F5]"
                            : "text-[#878787] hover:text-zinc-200"
                        }`}
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.05) 100%), rgba(255, 255, 255, 0.05)",
                                boxShadow:
                                  "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                              }
                            : undefined
                        }
                      >
                        {item.comingSoon ? (
                          <div
                            className="flex items-center gap-3 cursor-pointer justify-center lg:justify-start"
                            onClick={() => handleComingSoon(item.title)}
                          >
                            <span className="text-[#757575]">{item.icon}</span>
                            <span className="hidden text-sm font-medium lg:inline">
                              {isFlashing ? "Coming Soon" : item.title}
                            </span>
                          </div>
                        ) : (
                          <Link href={item.href}>
                            <span
                              className={
                                isActive ? "text-white" : "text-[#757575]"
                              }
                            >
                              {item.icon}
                            </span>
                            <span className="hidden text-sm font-medium lg:inline">
                              {item.title}
                            </span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-2 pb-6 lg:px-3">
          <SocialLinks />
        </SidebarFooter>
      </Sidebar>
    </>
  );
};
