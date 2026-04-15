"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { m } from "framer-motion";

/* ── Countdown ── */
function Countdown({ target, label }: { target: string; label: string }) {
  const calc = () => {
    const diff = Math.max(0, new Date(target).getTime() - Date.now());
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff / 3_600_000) % 24),
      mins: Math.floor((diff / 60_000) % 60),
      secs: Math.floor((diff / 1_000) % 60),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-white/30">{label}</span>
      <div className="flex items-center gap-2 sm:gap-3">
        {[
          { v: t.days, l: "D" },
          { v: t.hours, l: "H" },
          { v: t.mins, l: "M" },
          { v: t.secs, l: "S" },
        ].map((b) => (
          <div key={b.l} className="flex items-baseline gap-0.5">
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold tabular-nums text-white">{String(b.v).padStart(2, "0")}</span>
            <span className="text-[10px] text-white/30 font-medium">{b.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Fade ── */
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <m.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, delay }} className={className}>
      {children}
    </m.div>
  );
}

/* ── Effort badge ── */
function EffortBadge({ level }: { level: "low" | "medium" | "high" }) {
  const c = { low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", medium: "text-amber-400 bg-amber-400/10 border-amber-400/20", high: "text-rose-400 bg-rose-400/10 border-rose-400/20" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider border ${c[level]}`}>{level}</span>;
}

/* ══════════════════════════════════════════════════════════════════════ */

const MLB_SEASON_END = "2026-09-28T00:00:00-04:00";

/*
 * ── Real Model Performance ──
 *
 * Burst 2.0 (Favorite Dip):  95% WR, +$96/win, -$58/loss per $1k → ~$353/day
 * Burst (Comeback Underdog):  ~60% settle WR, +$2,250/win, -$750/loss per $1k → variable
 *
 * Combined daily PnL per $1k flat stake:
 *   Conservative: $364/day  |  Mid: $600/day  |  Aggressive: $829/day
 *
 * Formula: $1M/day ÷ $600/day per unit = 1,667 units of $1k stake needed
 */

const MODEL_STATS = {
  burst2: {
    name: "Burst 2.0 — Favorite Dip",
    strategy: "Buy pregame favorite when it dips mid-game",
    entry: "86–92¢ | Inning 5+ | Lead 1–2 runs | TP at 95¢",
    winRate: "94–96%",
    tradesPerDay: "3–5",
    avgWinner: "+$96 / $1k stake (+9.6%)",
    avgLoser: "−$58 / $1k stake (−5.8%)",
    dailyPnl: "$250–$400 / $1k stake",
    weeklyPnl: "$1,750–$2,800 / $1k stake",
  },
  burst: {
    name: "Burst — Comeback Underdog",
    strategy: "Buy underdog when favorite surges past 72–74¢",
    entry: "28–34¢ | Inning 4+ | Lead 1–2 runs | −75% SL",
    winRate: "47–77% (settle, varies by week)",
    tradesPerDay: "1–2",
    avgWinner: "+$2,000–$2,500 / $1k stake (settle to 100¢)",
    avgLoser: "−$750 / $1k stake (hard SL)",
    dailyPnl: "$115–$430 / $1k stake",
    weeklyPnl: "$800–$3,000 / $1k stake",
  },
};

const PROFIT_LADDER = [
  {
    month: 1,
    dates: "Apr 14 – May 14",
    dailyProfit: "$1,000",
    monthlyProfit: "$30K",
    unitsNeeded: 1.7,
    activeUsers: 10,
    avgStake: "$170",
    totalStakePerDay: "$1.7K",
    tradesPerDay: "4–7",
  },
  {
    month: 2,
    dates: "May 15 – Jun 14",
    dailyProfit: "$10,000",
    monthlyProfit: "$300K",
    unitsNeeded: 17,
    activeUsers: 50,
    avgStake: "$340",
    totalStakePerDay: "$17K",
    tradesPerDay: "4–7",
  },
  {
    month: 3,
    dates: "Jun 15 – Jul 14",
    dailyProfit: "$50,000",
    monthlyProfit: "$1.5M",
    unitsNeeded: 84,
    activeUsers: 200,
    avgStake: "$420",
    totalStakePerDay: "$84K",
    tradesPerDay: "4–7",
  },
  {
    month: 4,
    dates: "Jul 15 – Aug 14",
    dailyProfit: "$100,000",
    monthlyProfit: "$3M",
    unitsNeeded: 167,
    activeUsers: 400,
    avgStake: "$420",
    totalStakePerDay: "$167K",
    tradesPerDay: "4–7",
  },
  {
    month: 5,
    dates: "Aug 15 – Sep 14",
    dailyProfit: "$500,000",
    monthlyProfit: "$15M",
    unitsNeeded: 834,
    activeUsers: 1500,
    avgStake: "$556",
    totalStakePerDay: "$834K",
    tradesPerDay: "4–7",
  },
  {
    month: 5.5,
    dates: "Sep 15 – Sep 28",
    dailyProfit: "$1,000,000",
    monthlyProfit: "$14M",
    unitsNeeded: 1667,
    activeUsers: 2500,
    avgStake: "$667",
    totalStakePerDay: "$1.67M",
    tradesPerDay: "4–7",
  },
];

const USER_TIERS = [
  { name: "Starter", stake: "$100 – $250", pctOfUsers: "50%", dailyPnl: "+$36–$83", description: "New users testing the models. 1–2 trades/day." },
  { name: "Pro", stake: "$250 – $1,000", pctOfUsers: "30%", dailyPnl: "+$150–$830", description: "Daily grinders. Running both Burst 2.0 + Comeback." },
  { name: "Whale", stake: "$1,000 – $5,000", pctOfUsers: "15%", dailyPnl: "+$600–$4.1K", description: "High conviction. Max sizing every signal." },
  { name: "Institutional", stake: "$5,000+", pctOfUsers: "5%", dailyPnl: "+$3K–$20K+", description: "Funds, syndicates. Moving real capital." },
];

const MONTHLY_ROADMAP = [
  {
    month: 1,
    label: "April 14 – May 14",
    title: "Foundation",
    subtitle: "Ship it. Prove it. Start the drumbeat.",
    accent: "#0ea5e9",
    endStateTargets: {
      activeUsers: "10",
      totalStake: "$1.7K/day",
      dailyProfit: "$1K",
      monthlyProfit: "$30K",
    },
    actions: [
      { title: "iPhone fixes + app release", effort: "high" as const },
      { title: "Coverage 2.0 article published", effort: "medium" as const },
      { title: "Announce MLB model on all socials", effort: "low" as const },
      { title: "Release video — MLB launch + NBA/NHL win streaks", effort: "medium" as const },
      { title: "Nightly KPIs start posting on X", effort: "medium" as const },
      { title: "Gold checkmark + @RainmakerSports page live", effort: "medium" as const },
      { title: "Auger begins using Rainmaker publicly", effort: "medium" as const },
      { title: "Rainmaker song release + campaign", effort: "high" as const },
      { title: "Social challenge goes live (TikTok / IG Reels)", effort: "medium" as const },
    ],
    kpis: [
      { metric: "Active Users (daily)", target: "10" },
      { metric: "Avg Stake", target: "$170" },
      { metric: "Total Stake/Day", target: "$1.7K" },
      { metric: "Daily Profit", target: "$1K" },
      { metric: "Monthly Profit", target: "$30K" },
      { metric: "X Followers", target: "10K" },
    ],
  },
  {
    month: 2,
    label: "May 15 – June 14",
    title: "Amplify",
    subtitle: "Streets. Screens. Venues. Press. Everywhere.",
    accent: "#06b6d4",
    endStateTargets: {
      activeUsers: "50",
      totalStake: "$17K/day",
      dailyProfit: "$10K",
      monthlyProfit: "$300K",
    },
    actions: [
      { title: "Wild posting deployed — NYC, LA, Miami, Atlanta", effort: "high" as const },
      { title: "Auger handing out gift cards at every show + Ye events", effort: "medium" as const },
      { title: "Clippers partnership / activation secured", effort: "high" as const },
      { title: "Merch drop on rainmaker.fun", effort: "high" as const },
      { title: "New York Times article goes live ($1-2K)", effort: "medium" as const },
      { title: "Social challenge hitting viral tiers", effort: "low" as const },
      { title: "Second press wave — sports / tech media pickups", effort: "medium" as const },
      { title: "Referral program launched (gift card → signup funnel)", effort: "medium" as const },
    ],
    kpis: [
      { metric: "Active Users (daily)", target: "50" },
      { metric: "Avg Stake", target: "$340" },
      { metric: "Total Stake/Day", target: "$17K" },
      { metric: "Daily Profit", target: "$10K" },
      { metric: "Monthly Profit", target: "$300K" },
      { metric: "X Followers", target: "50K" },
    ],
  },
  {
    month: 3,
    label: "June 15 – July 14",
    title: "Scale",
    subtitle: "MLB All-Star Break. Product-market fit locked in.",
    accent: "#22d3ee",
    endStateTargets: {
      activeUsers: "200",
      totalStake: "$84K/day",
      dailyProfit: "$50K",
      monthlyProfit: "$1.5M",
    },
    actions: [
      { title: "MLB All-Star Game content blitz", effort: "medium" as const },
      { title: "Enterprise / whale tier launched for high-volume users", effort: "high" as const },
      { title: "Second merch collection drop", effort: "medium" as const },
      { title: "Podcast tour — 5+ appearances on sports / tech pods", effort: "medium" as const },
      { title: "Athlete / influencer partnerships (2-3 signed)", effort: "high" as const },
      { title: "Wild posting second wave — expand to Chicago, Houston", effort: "medium" as const },
      { title: "Series A conversations begin", effort: "high" as const },
    ],
    kpis: [
      { metric: "Active Users (daily)", target: "200" },
      { metric: "Avg Stake", target: "$420" },
      { metric: "Total Stake/Day", target: "$84K" },
      { metric: "Daily Profit", target: "$50K" },
      { metric: "Monthly Profit", target: "$1.5M" },
      { metric: "X Followers", target: "150K" },
    ],
  },
  {
    month: 4,
    label: "July 15 – August 14",
    title: "Dominate",
    subtitle: "MLB trade deadline. Volume ramps.",
    accent: "#67e8f9",
    endStateTargets: {
      activeUsers: "400",
      totalStake: "$167K/day",
      dailyProfit: "$100K",
      monthlyProfit: "$3M",
    },
    actions: [
      { title: "MLB trade deadline content + model updates", effort: "medium" as const },
      { title: "Major brand partnership signed (sportsbook, media co)", effort: "high" as const },
      { title: "TV / streaming ad placement (one major buy)", effort: "high" as const },
      { title: "Community-driven content program (power users)", effort: "medium" as const },
      { title: "Second round of press — Forbes, Bloomberg, TechCrunch", effort: "medium" as const },
      { title: "Whale onboarding — dedicated support for $5K+ stakers", effort: "high" as const },
    ],
    kpis: [
      { metric: "Active Users (daily)", target: "400" },
      { metric: "Avg Stake", target: "$420" },
      { metric: "Total Stake/Day", target: "$167K" },
      { metric: "Daily Profit", target: "$100K" },
      { metric: "Monthly Profit", target: "$3M" },
      { metric: "X Followers", target: "300K" },
    ],
  },
  {
    month: 5,
    label: "August 15 – September 14",
    title: "Mainstream",
    subtitle: "Peak MLB stretch run. Pennant race volatility.",
    accent: "#a78bfa",
    endStateTargets: {
      activeUsers: "1,500",
      totalStake: "$834K/day",
      dailyProfit: "$500K",
      monthlyProfit: "$15M",
    },
    actions: [
      { title: "National ad campaign (digital + OOH)", effort: "high" as const },
      { title: "Celebrity endorsement secured", effort: "high" as const },
      { title: "Rainmaker app featured on App Store / Play Store", effort: "medium" as const },
      { title: "Institutional onboarding — funds & syndicates", effort: "high" as const },
      { title: "Hiring sprint — 10+ key roles filled", effort: "high" as const },
    ],
    kpis: [
      { metric: "Active Users (daily)", target: "1,500" },
      { metric: "Avg Stake", target: "$556" },
      { metric: "Total Stake/Day", target: "$834K" },
      { metric: "Daily Profit", target: "$500K" },
      { metric: "Monthly Profit", target: "$15M" },
      { metric: "X Followers", target: "500K" },
    ],
  },
  {
    month: 5.5,
    label: "September 15 – September 28",
    title: "$1M / Night",
    subtitle: "MLB playoffs begin. Maximum edge. The target.",
    accent: "#f59e0b",
    endStateTargets: {
      activeUsers: "2,500",
      totalStake: "$1.67M/day",
      dailyProfit: "$1M",
      monthlyProfit: "$14M",
    },
    actions: [
      { title: "MLB playoff model — highest accuracy, highest stakes", effort: "high" as const },
      { title: "Major media feature — \"The AI That Beats the Sportsbooks\"", effort: "high" as const },
      { title: "Institutional capital fully deployed", effort: "medium" as const },
      { title: "Auto-compounding users hitting 5–9× returns", effort: "low" as const },
    ],
    kpis: [
      { metric: "Active Users (daily)", target: "2,500" },
      { metric: "Avg Stake", target: "$667" },
      { metric: "Total Stake/Day", target: "$1.67M" },
      { metric: "Daily Profit", target: "$1M" },
      { metric: "Monthly Profit", target: "$14M" },
      { metric: "5.5-Month Total Profit", target: "$36.8M" },
    ],
  },
];

const MONTH1_ITEMS = [
  { id: 1, title: "iPhone Fixes + App Release", desc: "Fix remaining iPhone bugs and push the app live. This unblocks everything.", effort: "high" as const, category: "product" },
  { id: 2, title: "Coverage 2.0 Article", desc: "Explains new model coverage, expanded sports, and what's changed. PR + SEO.", effort: "medium" as const, category: "content" },
  { id: 3, title: "Announce MLB Model on Socials", desc: "Short-form clips, graphics, and threads across X, TikTok, and IG.", effort: "low" as const, category: "social" },
  { id: 4, title: "Release Video — MLB + NBA/NHL Win Streaks", desc: "Proof-of-performance reel. Show receipts.", effort: "medium" as const, category: "content" },
  { id: 5, title: "Nightly KPIs on X", desc: "Every night: bets filled, nightly volume, nightly PnL. Trust + FOMO.", effort: "medium" as const, category: "social" },
  { id: 6, title: "Gold Checkmark + @RainmakerSports", desc: "Verified sports page. Posts KPIs, biggest wins, news. Reposts Auger.", effort: "medium" as const, category: "social" },
  { id: 7, title: "Auger Ambassador Program", desc: "Uses Rainmaker publicly. Gift cards at every show including Ye.", effort: "medium" as const, category: "partnerships" },
  { id: 8, title: "Rainmaker Song + Campaign", desc: "Official track on all streaming platforms. Soundtrack for the social challenge.", effort: "high" as const, category: "content" },
  { id: 9, title: "Social Challenge — TikTok / IG Reels", desc: "Post with the song. #RainmakerChallenge. Discount tiers by engagement.", effort: "medium" as const, category: "social" },
  { id: 10, title: "Wild Posting", desc: "Wheat-paste posters across NYC, LA, Miami, Atlanta.", effort: "high" as const, category: "marketing" },
  { id: 11, title: "Clippers Partnership", desc: "Court-side visibility, content collab, or event presence.", effort: "high" as const, category: "partnerships" },
  { id: 12, title: "Merch Drop on Site", desc: "Hoodies, tees, caps, windbreakers on rainmaker.fun.", effort: "high" as const, category: "product" },
  { id: 13, title: "NYT Article ($1-2K)", desc: "Feature or sponsored placement. AI x Sports Prediction Markets.", effort: "medium" as const, category: "press" },
];

export default function RampUpPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  const categories = ["all", "product", "content", "social", "partnerships", "marketing", "press"];
  const filtered = filterCat === "all" ? MONTH1_ITEMS : MONTH1_ITEMS.filter((i) => i.category === filterCat);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white overflow-x-hidden scroll-smooth">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/5">
        <nav className="max-w-[1440px] mx-auto px-6">
          <div className="flex items-center justify-between h-[70px]">
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/rainmaker-logo-white.svg" alt="Rainmaker" width={28} height={28} className="w-7 h-7" />
              <span className="text-base font-medium text-white group-hover:text-[#0ea5e9] transition-colors">Rainmaker</span>
            </Link>
            <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              <Link href="/" className="text-white/70 hover:text-white transition-colors text-sm px-3 py-2">Home</Link>
              <Link href="#ladder" className="text-white/70 hover:text-white transition-colors text-sm px-3 py-2">Ladder</Link>
              <Link href="#roadmap" className="text-white/70 hover:text-white transition-colors text-sm px-3 py-2">Roadmap</Link>
              <Link href="#month1" className="text-white/70 hover:text-white transition-colors text-sm px-3 py-2">Month 1</Link>
              <Link href="#kpis" className="text-white/70 hover:text-white transition-colors text-sm px-3 py-2">KPIs</Link>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <a href="https://rainmaker-waitlist.vercel.app/waitlist" target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white font-medium px-5 py-2 h-9 rounded-full text-sm">Join the Movement</Button>
              </a>
            </div>
            <button className="md:hidden text-white p-2 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[100]" style={{ backgroundColor: "#0a0a0c" }}>
            <div className="flex items-center justify-between h-[70px] px-6 border-b border-white/10 bg-[#0a0a0c]">
              <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Image src="/rainmaker-logo-white.svg" alt="Rainmaker" width={28} height={28} className="w-7 h-7" />
                <span className="text-base font-medium text-white">Rainmaker</span>
              </Link>
              <button className="text-white p-2 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(false)} aria-label="Close"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex flex-col h-[calc(100vh-70px)] px-6 py-8 bg-[#0a0a0c]">
              <nav className="flex flex-col gap-1">
                {[{ href: "/", label: "Home" }, { href: "#ladder", label: "Ladder" }, { href: "#roadmap", label: "Roadmap" }, { href: "#month1", label: "Month 1" }, { href: "#kpis", label: "KPIs" }].map((l) => (
                  <Link key={l.href} href={l.href} className="text-white/80 text-lg font-medium py-4 border-b border-white/5 hover:text-[#0ea5e9] transition-colors" onClick={() => setMobileMenuOpen(false)}>{l.label}</Link>
                ))}
              </nav>
              <div className="mt-auto pt-8">
                <a href="https://rainmaker-waitlist.vercel.app/waitlist" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white font-medium py-3 h-auto text-base rounded-full">Join the Movement</Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative pt-16">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-6">
          <div className="relative bg-black rounded-[24px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#f59e0b]/8 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(245,158,11,0.12),transparent_60%)] pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center pt-12 sm:pt-16 md:pt-20 pb-12 sm:pb-16 md:pb-20 px-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#141415] border border-[#202022] rounded-full mb-6">
                <span className="h-2 w-2 rounded-full bg-[#f59e0b] animate-pulse" />
                <span className="text-sm text-white tracking-[-0.48px]">5.5 Months &middot; April → September &middot; MLB Season</span>
              </div>
              <h1
                className="text-5xl sm:text-6xl md:text-[80px] font-bold text-center leading-[1.05] tracking-[-0.04em] mb-2 max-w-[900px]"
                style={{ background: "linear-gradient(180deg, #FFF 40%, #f59e0b 100%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                $1M / NIGHT
              </h1>
              <p className="text-white/30 text-sm font-mono mb-6">April 14, 2026 → September 28, 2026</p>
              <p className="text-[#afafb6] text-base md:text-lg text-center leading-relaxed mb-10 max-w-[600px]">
                $1K/night to $1M/night in 5.5 months. MLB season.
                Every month has a profit target, a user count, and a stake size. The math is real.
              </p>
              <Countdown target={MLB_SEASON_END} label="Time remaining until end of MLB season" />
              <div className="flex items-center gap-3 mt-10">
                <a href="https://rainmaker-waitlist.vercel.app/waitlist" target="_blank" rel="noopener noreferrer">
                  <Button className="bg-[#f59e0b] hover:bg-[#f59e0b]/90 text-black font-semibold px-6 py-2.5 h-auto text-sm rounded-full">Get Early Access</Button>
                </a>
                <Link href="#roadmap">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/5 font-medium px-6 py-2.5 h-auto text-sm rounded-full">See the Roadmap</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ THE DESTINATION ══════════════ */}
      <section className="py-16 md:py-24 bg-[#0a0a0c]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn>
            <h2
              className="text-[32px] md:text-[40px] lg:text-[47px] font-medium text-center mb-4 tracking-[-0.8px]"
              style={{ background: "linear-gradient(180deg, #FFF 63.12%, #A7A7A8 88.74%, #1B1B1E 104.3%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              The Destination
            </h2>
            <p className="text-center text-[#afafb6] text-sm md:text-base mb-12 max-w-lg mx-auto">
              Where Rainmaker stands on September 28, 2026 — the day MLB regular season ends.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="relative bg-gradient-to-br from-[#f59e0b]/10 via-[#111113] to-[#111113] border border-[#f59e0b]/20 rounded-[24px] p-8 md:p-12 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(245,158,11,0.1),transparent_60%)] pointer-events-none" />
              <div className="relative z-10">
                <div className="text-center mb-10">
                  <span className="text-[#f59e0b] text-6xl sm:text-7xl md:text-[96px] font-bold tracking-tight">$1M</span>
                  <p className="text-white/40 text-sm mt-2">Per Night — Only 2,500 Active Users Needed</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { value: "2,500", label: "Active Users / Day" },
                    { value: "$667", label: "Avg Stake / Trade" },
                    { value: "$1.67M", label: "Total Stake / Day" },
                    { value: "$1M", label: "Daily Profit" },
                    { value: "$36.8M", label: "5.5-Month Total" },
                    { value: "500K+", label: "X Followers" },
                  ].map((s) => (
                    <div key={s.label} className="bg-black/30 border border-white/[0.06] rounded-[12px] p-4 text-center">
                      <span className="text-lg md:text-xl font-bold text-white block">{s.value}</span>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════ PROFIT LADDER + UNIT ECONOMICS ══════════════ */}
      <section id="ladder" className="py-16 md:py-24 bg-[#0a0a0c] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn>
            <h2
              className="text-[32px] md:text-[40px] lg:text-[47px] font-medium text-center mb-4 tracking-[-0.8px]"
              style={{ background: "linear-gradient(180deg, #FFF 63.12%, #A7A7A8 88.74%, #1B1B1E 104.3%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              The Profit Ladder
            </h2>
            <p className="text-center text-[#afafb6] text-sm md:text-base mb-12 max-w-lg mx-auto">
              Dates. Daily profit. Users needed. Average stake required. The math behind $1M/night.
            </p>
          </FadeIn>

          {/* Model Performance Cards */}
          <FadeIn delay={0.08}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {[MODEL_STATS.burst2, MODEL_STATS.burst].map((m, i) => {
                const accent = i === 0 ? "#22d3ee" : "#a78bfa";
                return (
                  <div key={m.name} className="bg-[#111113] border border-[#1e1e20] rounded-[16px] p-5 md:p-6">
                    <h3 className="text-base font-semibold text-white mb-1">{m.name}</h3>
                    <p className="text-xs text-white/40 mb-4">{m.strategy}</p>
                    <div className="space-y-2">
                      {[
                        { l: "Entry", v: m.entry },
                        { l: "Win Rate", v: m.winRate },
                        { l: "Trades/Day", v: m.tradesPerDay },
                        { l: "Avg Winner", v: m.avgWinner },
                        { l: "Avg Loser", v: m.avgLoser },
                        { l: "Daily PnL", v: m.dailyPnl },
                        { l: "Weekly PnL", v: m.weeklyPnl },
                      ].map((r) => (
                        <div key={r.l} className="flex items-center justify-between text-xs">
                          <span className="text-white/40">{r.l}</span>
                          <span className="text-white/70 font-mono" style={r.l === "Win Rate" || r.l === "Daily PnL" || r.l === "Weekly PnL" ? { color: accent } : undefined}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </FadeIn>

          {/* Combined projection */}
          <FadeIn delay={0.09}>
            <div className="bg-[#111113] border border-[#1e1e20] rounded-[16px] p-5 md:p-6 mb-8">
              <h3 className="text-sm font-semibold text-white mb-4">Combined MLB — Per $1K Flat Stake</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { l: "Weekly PnL", v: "$2,550–$5,800", accent: "#22d3ee" },
                  { l: "Monthly PnL", v: "$10,200–$23,200", accent: "#06b6d4" },
                  { l: "5.5-Month PnL", v: "$56,100–$127,600", accent: "#a78bfa" },
                  { l: "5.5-Month ROI", v: "56×–128×", accent: "#f59e0b" },
                ].map((s) => (
                  <div key={s.l} className="text-center">
                    <span className="text-lg md:text-xl font-bold font-mono block" style={{ color: s.accent }}>{s.v}</span>
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Ladder table */}
          <FadeIn delay={0.1}>
            <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Month", "Dates", "Daily Profit", "Active Users", "Avg Stake", "Total Stake/Day", "Trades/Day"].map((h) => (
                        <th key={h} className="text-[10px] uppercase tracking-widest text-white/30 font-medium text-left px-4 md:px-6 py-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PROFIT_LADDER.map((row, i) => {
                      const accents = ["#0ea5e9", "#06b6d4", "#22d3ee", "#67e8f9", "#a78bfa", "#f59e0b"];
                      return (
                        <tr key={row.month} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 md:px-6 py-4">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold" style={{ borderColor: accents[i], color: accents[i] }}>
                              {row.month % 1 === 0 ? row.month : "5½"}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-white/50 font-mono text-xs whitespace-nowrap">{row.dates}</td>
                          <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap" style={{ color: accents[i] }}>{row.dailyProfit}</td>
                          <td className="px-4 md:px-6 py-4 text-white/70 font-medium">{row.activeUsers.toLocaleString()}</td>
                          <td className="px-4 md:px-6 py-4 text-white/70">{row.avgStake}</td>
                          <td className="px-4 md:px-6 py-4 text-white/50">{row.totalStakePerDay}</td>
                          <td className="px-4 md:px-6 py-4 text-white/40">{row.tradesPerDay}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 md:px-6 py-4 border-t border-white/[0.04] bg-white/[0.01]">
                <p className="text-xs text-white/30">Based on combined model PnL of ~$600/day per $1K flat stake (mid estimate). Burst 2.0: 95% WR, +$96 avg win. Comeback: ~60% settle WR, +$2,250 avg win.</p>
              </div>
            </div>
          </FadeIn>

          {/* User Tiers */}
          <FadeIn delay={0.2}>
            <div className="mt-8">
              <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-4">User Tiers — Who Makes Up the Volume</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {USER_TIERS.map((tier, i) => {
                  const accents = ["#0ea5e9", "#06b6d4", "#a78bfa", "#f59e0b"];
                  return (
                    <div key={tier.name} className="bg-[#111113] border border-[#1e1e20] rounded-[16px] p-5 hover:border-white/10 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-white">{tier.name}</h3>
                        <span className="text-xs font-bold" style={{ color: accents[i] }}>{tier.pctOfUsers}</span>
                      </div>
                      <span className="text-sm font-mono font-medium block mb-1" style={{ color: accents[i] }}>{tier.stake}</span>
                      <span className="text-xs font-mono text-emerald-400/70 block mb-2">{tier.dailyPnl}/day</span>
                      <p className="text-xs text-white/40 leading-relaxed">{tier.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeIn>

          {/* $1M/night breakdown */}
          <FadeIn delay={0.3}>
            <div className="mt-8 bg-gradient-to-r from-[#f59e0b]/10 via-[#f59e0b]/5 to-transparent border border-[#f59e0b]/20 rounded-[16px] p-6 md:p-8">
              <h3 className="text-white font-semibold text-lg mb-4">$1M/Night Breakdown — Month 5.5</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-white/30 block">The Formula</span>
                  {[
                    { l: "Combined model PnL / $1K stake / day", v: "~$600" },
                    { l: "Units of $1K needed for $1M/day", v: "1,667" },
                    { l: "Active users needed", v: "2,500" },
                    { l: "Avg stake per trade", v: "$667" },
                    { l: "Total stake deployed per day", v: "$1,667,000" },
                    { l: "Trades per user per day (combined)", v: "4–7" },
                    { l: "Daily profit", v: "$1,000,000" },
                  ].map((r) => (
                    <div key={r.l} className="flex items-center justify-between border-b border-white/[0.04] pb-2 last:border-0">
                      <span className="text-sm text-white/50">{r.l}</span>
                      <span className="text-sm text-white font-bold font-mono">{r.v}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-white/30 block">User Mix at 2,500 Active</span>
                  {[
                    { tier: "Starter (50%)", users: "1,250", stake: "$175 avg", pnl: "$131K" },
                    { tier: "Pro (30%)", users: "750", stake: "$600 avg", pnl: "$270K" },
                    { tier: "Whale (15%)", users: "375", stake: "$2,000 avg", pnl: "$450K" },
                    { tier: "Institutional (5%)", users: "125", stake: "$6,000 avg", pnl: "$450K" },
                  ].map((r) => (
                    <div key={r.tier} className="flex items-center justify-between border-b border-white/[0.04] pb-2 last:border-0 text-xs">
                      <span className="text-white/50">{r.tier}</span>
                      <span className="text-white/40">{r.users}</span>
                      <span className="text-white/50">{r.stake}</span>
                      <span className="text-emerald-400/70 font-mono font-medium">{r.pnl}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[#f59e0b] font-medium">Total Daily Profit</span>
                    <span className="text-white/40">2,500</span>
                    <span className="text-white/50">$667 avg</span>
                    <span className="text-[#f59e0b] font-mono font-bold">~$1,000,000</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════ MONTHLY ROADMAP ══════════════ */}
      <section id="roadmap" className="py-16 md:py-24 bg-[#0a0a0c] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn>
            <h2
              className="text-[32px] md:text-[40px] lg:text-[47px] font-medium text-center mb-4 tracking-[-0.8px]"
              style={{ background: "linear-gradient(180deg, #FFF 63.12%, #A7A7A8 88.74%, #1B1B1E 104.3%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Month-by-Month Roadmap
            </h2>
            <p className="text-center text-[#afafb6] text-sm md:text-base mb-12 md:mb-16 max-w-lg mx-auto">
              6 phases. Escalating targets every 30 days. Each month builds on the last.
            </p>
          </FadeIn>

          {/* Growth trajectory bar */}
          <FadeIn delay={0.05}>
            <div className="mb-12 bg-[#111113] border border-[#1e1e20] rounded-[16px] p-6">
              <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-4">Daily Profit Trajectory</span>
              <div className="flex items-end gap-2 h-24">
                {[
                  { label: "M1", val: 1, display: "$1K", color: "#0ea5e9" },
                  { label: "M2", val: 10, display: "$10K", color: "#06b6d4" },
                  { label: "M3", val: 50, display: "$50K", color: "#22d3ee" },
                  { label: "M4", val: 100, display: "$100K", color: "#67e8f9" },
                  { label: "M5", val: 500, display: "$500K", color: "#a78bfa" },
                  { label: "M5.5", val: 1000, display: "$1M", color: "#f59e0b" },
                ].map((bar) => (
                  <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono text-white/50">{bar.display}</span>
                    <div className="w-full rounded-t-md transition-all" style={{ backgroundColor: bar.color, height: `${(bar.val / 1000) * 100}%`, minHeight: "4px" }} />
                    <span className="text-[10px] text-white/30">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <div className="space-y-6">
            {MONTHLY_ROADMAP.map((mo, mi) => (
              <FadeIn key={mo.month} delay={mi * 0.06}>
                <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] overflow-hidden">
                  {/* Month header */}
                  <div className="p-6 md:p-8 border-b border-white/[0.04]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full border-2 text-sm font-bold shrink-0" style={{ borderColor: mo.accent, color: mo.accent }}>
                          {mo.month % 1 === 0 ? mo.month : "5½"}
                        </span>
                        <div>
                          <h3 className="text-xl font-semibold text-white">Month {mo.month % 1 === 0 ? mo.month : "5.5"}: {mo.title}</h3>
                          <p className="text-sm text-white/40">{mo.subtitle}</p>
                          <p className="text-xs text-white/20 font-mono mt-0.5">{mo.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <div className="text-right">
                          <span className="text-2xl font-bold block" style={{ color: mo.accent }}>{mo.endStateTargets.dailyProfit}/day</span>
                          <span className="text-[10px] text-white/30 uppercase tracking-wider">Daily Profit</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* End-of-month targets strip */}
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.04] border-b border-white/[0.04]">
                    {[
                      { label: "Active Users", value: mo.endStateTargets.activeUsers },
                      { label: "Total Stake/Day", value: mo.endStateTargets.totalStake },
                      { label: "Daily Profit", value: mo.endStateTargets.dailyProfit },
                      { label: "Monthly Profit", value: mo.endStateTargets.monthlyProfit },
                    ].map((t) => (
                      <div key={t.label} className="p-4 text-center">
                        <span className="text-base font-bold text-white block">{t.value}</span>
                        <span className="text-[10px] text-white/30 uppercase tracking-wider">{t.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-white/[0.04]">
                    {/* Actions */}
                    <div className="md:col-span-3 p-6 md:p-8">
                      <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-4">What Gets Done</span>
                      <ul className="space-y-2.5">
                        {mo.actions.map((a) => (
                          <li key={a.title} className="flex items-start gap-3 text-sm text-white/60 leading-relaxed">
                            <span className="mt-1 h-4 w-4 rounded border border-white/10 bg-white/[0.02] shrink-0 flex items-center justify-center">
                              <span className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: mo.accent, opacity: 0.5 }} />
                            </span>
                            <span className="flex-1">{a.title}</span>
                            <EffortBadge level={a.effort} />
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* KPIs */}
                    <div className="md:col-span-2 p-6 md:p-8">
                      <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-4">Target KPIs</span>
                      <div className="space-y-4">
                        {mo.kpis.map((kpi) => (
                          <div key={kpi.metric}>
                            <span className="text-lg font-bold block" style={{ color: mo.accent }}>{kpi.target}</span>
                            <span className="text-xs text-white/40">{kpi.metric}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ MONTH 1 DETAIL — ACTION ITEMS ══════════════ */}
      <section id="month1" className="py-16 md:py-24 bg-[#0a0a0c] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn>
            <h2
              className="text-[32px] md:text-[40px] lg:text-[47px] font-medium text-center mb-4 tracking-[-0.8px]"
              style={{ background: "linear-gradient(180deg, #FFF 63.12%, #A7A7A8 88.74%, #1B1B1E 104.3%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Month 1 — Every Action Item
            </h2>
            <p className="text-center text-[#afafb6] text-sm md:text-base mb-8 max-w-lg mx-auto">
              13 items. This is where everything starts. Filter by category.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setFilterCat(cat)} className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wider border transition-colors ${filterCat === cat ? "bg-[#0ea5e9]/10 border-[#0ea5e9]/30 text-[#0ea5e9]" : "bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/20"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </FadeIn>

          <div className="space-y-3">
            {filtered.map((item, i) => (
              <FadeIn key={item.id} delay={i * 0.03}>
                <div className="bg-[#111113] border border-[#1e1e20] rounded-[16px] p-5 hover:border-[#0ea5e9]/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <span className="text-white/20 font-mono text-sm w-6 text-right shrink-0 pt-0.5">{String(item.id).padStart(2, "0")}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-base font-semibold text-white">{item.title}</h3>
                        <EffortBadge level={item.effort} />
                      </div>
                      <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ NIGHTLY KPIs ══════════════ */}
      <section id="kpis" className="py-16 md:py-24 bg-[#0a0a0c] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FadeIn>
              <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-8 md:p-10 h-full">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/20 w-fit">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" />Every Night
                </span>
                <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-white">Nightly KPIs on X</h3>
                <p className="text-sm font-medium text-[#0ea5e9]/70 mt-1">@RainmakerSports &middot; Gold Verified</p>
                <p className="mt-4 text-sm md:text-base leading-relaxed text-white/50">Every night for 5.5 months straight. The heartbeat of the brand.</p>
                <div className="mt-6 space-y-2">
                  {["Bets filled tonight", "Nightly volume ($)", "Nightly PnL (+/-)", "Biggest win of the night", "Running win rate"].map((s) => (
                    <div key={s} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]/60" />
                      <span className="text-sm text-white/70">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-8 md:p-10 h-full">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/20 w-fit">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" />Verified
                </span>
                <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-white">@RainmakerSports</h3>
                <p className="text-sm font-medium text-[#0ea5e9]/70 mt-1">Gold checkmark. The sports AI page.</p>
                <p className="mt-4 text-sm md:text-base leading-relaxed text-white/50">
                  Dedicated X account. Posts KPIs, biggest wins, sports news, reposts Auger. The badge = legitimacy at scale.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  {[{ l: "Handle", v: "@RainmakerSports" }, { l: "Badge", v: "Gold Checkmark" }, { l: "Content", v: "KPIs, Wins, News, Reposts" }, { l: "Goal", v: "500K followers by Sept" }].map((r) => (
                    <div key={r.l} className="flex items-center justify-between border-b border-white/[0.04] pb-2 last:border-0">
                      <span className="text-xs text-white/40">{r.l}</span>
                      <span className="text-sm text-white/70 font-medium">{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════════ SOCIAL CHALLENGE ══════════════ */}
      <section id="challenge" className="py-16 md:py-24 bg-[#0a0a0c] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn>
            <h2
              className="text-[32px] md:text-[40px] lg:text-[47px] font-medium text-center mb-4 tracking-[-0.8px]"
              style={{ background: "linear-gradient(180deg, #FFF 63.12%, #A7A7A8 88.74%, #1B1B1E 104.3%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              The Rainmaker Challenge
            </h2>
            <p className="text-center text-[#afafb6] text-sm md:text-base mb-12 max-w-lg mx-auto">Post with the Rainmaker song. Tag us. Get rewarded.</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Use the Song", desc: "Add the official Rainmaker track as the sound on your TikTok or IG Reel." },
              { step: "2", title: "Tag @rainmakerdotfun", desc: "Tag us and use #RainmakerChallenge so we can find you." },
              { step: "3", title: "Unlock Your Discount", desc: "Verified posts get a discounted rate — bigger engagement = bigger reward." },
            ].map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.08}>
                <div className="bg-[#111113] border border-[#1e1e20] rounded-[16px] p-6 h-full hover:border-[#0ea5e9]/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 flex items-center justify-center mb-4">
                    <span className="text-[#0ea5e9] font-bold text-sm">{s.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.3}>
            <div className="mt-8 bg-gradient-to-r from-[#0ea5e9]/10 via-[#0ea5e9]/5 to-transparent border border-[#0ea5e9]/20 rounded-[16px] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg mb-1">Discount Tiers</h3>
                <p className="text-white/50 text-sm leading-relaxed">More engagement = bigger discount. Top creators earn free access for life.</p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                {[{ p: "10%", l: "Post" }, { p: "25%", l: "1K+ Views" }, { p: "50%", l: "10K+ Views" }, { p: "FREE", l: "100K+" }].map((t) => (
                  <div key={t.l} className="rounded-xl bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 px-4 py-2 text-center">
                    <span className="text-[#0ea5e9] font-bold text-lg block">{t.p}</span>
                    <span className="text-white/40 text-[10px] uppercase tracking-wider">{t.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════ AUGER + WILD POSTING + PRESS ══════════════ */}
      <section className="py-16 md:py-24 bg-[#0a0a0c]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 space-y-4">
          <FadeIn>
            <div className="relative bg-[#111113] border border-[#1e1e20] rounded-[20px] overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_70%_50%,rgba(14,165,233,0.1),transparent_60%)] pointer-events-none" />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 p-8 md:p-12">
                <div className="flex flex-col justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/20 w-fit">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" />Ambassador
                  </span>
                  <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-white">Auger x Rainmaker</h3>
                  <p className="text-sm font-medium text-[#0ea5e9]/70 mt-1">On the ground. In the crowd. At every show.</p>
                  <p className="mt-4 text-sm md:text-base leading-relaxed text-white/50 max-w-md">
                    Uses Rainmaker publicly. Hands out gift cards at every show including Ye events. @RainmakerSports reposts all of it.
                  </p>
                  <div className="mt-6 space-y-2">
                    {["Uses Rainmaker live (proof-of-use)", "Gift cards at every show + Ye", "Reposted by @RainmakerSports", "Each card = free access"].map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0ea5e9] shrink-0" />
                        <span className="text-sm text-white/60">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-full max-w-[340px]">
                    <div className="rounded-[16px] bg-gradient-to-br from-[#0ea5e9]/10 to-transparent border border-white/[0.08] p-5">
                      <span className="text-[10px] uppercase tracking-widest text-[#0ea5e9] font-medium">Rainmaker Gift Card</span>
                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <span className="text-white font-semibold text-lg block">Free Access</span>
                          <span className="text-white/40 text-xs">Full platform unlock</span>
                        </div>
                        <Image src="/rainmaker-logo-white.svg" alt="" width={32} height={32} className="opacity-40" />
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                        <span className="text-white/30 text-xs font-mono">RAIN-XXXX-XXXX</span>
                        <span className="text-[#0ea5e9] text-xs font-medium">rainmaker.fun</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FadeIn>
              <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6 md:p-8 h-full">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/20 w-fit">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" />Streets
                </span>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">Wild Posting</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">Wheat-paste posters. NYC, LA, Miami, Atlanta. Expanding monthly.</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["NYC", "LA", "Miami", "ATL", "Chicago", "Houston"].map((c) => (
                    <span key={c} className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[10px] text-white/50">{c}</span>
                  ))}
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.08}>
              <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6 md:p-8 h-full">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/20 w-fit">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" />Press
                </span>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">NYT Article</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">$1–2K. AI x Sports angle. Month 2 timing for peak momentum.</p>
                <div className="mt-4 space-y-1.5">
                  {[{ l: "Budget", v: "$1K–$2K" }, { l: "Timing", v: "Month 2" }, { l: "Angle", v: "AI x Sports" }].map((r) => (
                    <div key={r.l} className="flex justify-between text-xs"><span className="text-white/30">{r.l}</span><span className="text-white/60 font-medium">{r.v}</span></div>
                  ))}
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.16}>
              <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6 md:p-8 h-full">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/20 w-fit">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" />Partnership
                </span>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">Clippers</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">Court-side, content collab, or event presence. High-profile sports crossover.</p>
                <div className="mt-4"><EffortBadge level="high" /></div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════════ MERCH ══════════════ */}
      <section className="py-16 md:py-24 bg-[#0a0a0c]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn>
            <h2
              className="text-[32px] md:text-[40px] lg:text-[47px] font-medium text-center mb-4 tracking-[-0.8px]"
              style={{ background: "linear-gradient(180deg, #FFF 63.12%, #A7A7A8 88.74%, #1B1B1E 104.3%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Merch Drop
            </h2>
            <p className="text-center text-[#afafb6] text-sm md:text-base mb-12 max-w-md mx-auto">Limited Rainmaker collection. Multiple drops across the 5.5 months.</p>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{ name: "Rainmaker Hoodie", price: "$85" }, { name: "Logo Tee", price: "$45" }, { name: "Fitted Cap", price: "$35" }, { name: "Windbreaker", price: "$120" }].map((item, i) => (
              <FadeIn key={item.name} delay={i * 0.06}>
                <div className="bg-[#111113] border border-[#1e1e20] rounded-[16px] overflow-hidden hover:border-[#0ea5e9]/30 transition-colors group">
                  <div className="aspect-square bg-gradient-to-br from-[#141416] to-[#0d0d0f] flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:border-[#0ea5e9]/20 transition-colors">
                      <Image src="/rainmaker-logo-white.svg" alt="" width={28} height={28} className="opacity-30 group-hover:opacity-50 transition-opacity" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                    <span className="text-xs text-white/40 mt-1 block">{item.price}</span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.3}>
            <div className="mt-8 text-center">
              <Button className="bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white font-medium px-8 py-2.5 h-auto text-sm rounded-full" disabled>Shop Coming Soon</Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section className="py-16 md:py-24 bg-[#0a0a0c]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="relative bg-gradient-to-br from-[#f59e0b]/10 via-[#111113] to-[#111113] border border-[#f59e0b]/20 rounded-[24px] p-10 md:p-16 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(245,158,11,0.12),transparent_60%)] pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">$1M / Night by September.</h2>
                <p className="text-white/50 text-sm md:text-base max-w-lg mx-auto mb-8 leading-relaxed">
                  Early adopters get in at ground zero. The model is live, the math is real, and the ladder starts now.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <a href="https://rainmaker-waitlist.vercel.app/waitlist" target="_blank" rel="noopener noreferrer">
                    <Button className="bg-[#f59e0b] hover:bg-[#f59e0b]/90 text-black font-semibold px-8 py-3 h-auto text-base rounded-full">Get Early Access</Button>
                  </a>
                  <a href="https://x.com/rainmakerdotfun" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/5 font-medium px-8 py-3 h-auto text-base rounded-full">Follow @rainmakerdotfun</Button>
                  </a>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0a0a0c] border-t border-white/5 py-12">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/rainmaker-logo-white.svg" alt="Rainmaker" width={24} height={24} className="w-6 h-6" />
              <span className="text-sm font-medium text-white/60">Rainmaker</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-white/40 hover:text-white transition-colors text-sm">Home</Link>
              <Link href="/terms" className="text-white/40 hover:text-white transition-colors text-sm">Terms</Link>
              <a href="https://x.com/rainmakerdotfun" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors text-sm">Twitter</a>
              <a href="https://discord.gg/rainmakerdotfun" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors text-sm">Discord</a>
            </div>
            <p className="text-white/30 text-xs">&copy; Rainmaker 2026. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
