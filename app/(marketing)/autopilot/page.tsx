"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { m } from "framer-motion";

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <m.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, delay }} className={className}>
      {children}
    </m.div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h2
        className="text-[32px] md:text-[40px] font-medium text-center mb-4 tracking-[-0.8px]"
        style={{ background: "linear-gradient(180deg, #FFF 63%, #A7A7A8 89%, #1B1B1E 104%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
      >
        {title}
      </h2>
      <p className="text-center text-[#afafb6] text-sm md:text-base mb-12 max-w-xl mx-auto">{subtitle}</p>
    </>
  );
}

function DataRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5 last:border-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-sm font-mono font-bold" style={accent ? { color: accent } : { color: "#fff" }}>{value}</span>
    </div>
  );
}

export default function AutoPilotPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <m.div initial="hidden" animate="visible" className="min-h-screen bg-[#09090b] text-white selection:bg-cyan-500/20">
      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#09090b]/80 border-b border-white/[0.04]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-white font-bold tracking-tight text-lg">Rainmaker</Link>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: "#overview", label: "Overview" },
              { href: "#shield", label: "Shield" },
              { href: "#fees", label: "Fees" },
              { href: "#buyback", label: "Buyback" },
              { href: "#walkthrough", label: "Walkthrough" },
              { href: "#funding", label: "Funding" },
              { href: "#numbers", label: "Numbers" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="text-white/70 hover:text-white transition-colors text-sm px-3 py-2">{l.label}</Link>
            ))}
          </nav>
          <button className="md:hidden text-white/70" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.04] bg-[#09090b]/95 backdrop-blur-xl px-4 py-3 space-y-2">
            {[
              { href: "#overview", label: "Overview" },
              { href: "#shield", label: "Shield" },
              { href: "#fees", label: "Fees" },
              { href: "#buyback", label: "Buyback" },
              { href: "#walkthrough", label: "Walkthrough" },
              { href: "#funding", label: "Funding" },
              { href: "#numbers", label: "Numbers" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="block text-white/70 hover:text-white transition-colors text-sm py-1.5" onClick={() => setMobileMenuOpen(false)}>{l.label}</Link>
            ))}
          </div>
        )}
      </header>

      <div className="h-14" />

      {/* ═══════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative max-w-[1440px] mx-auto px-4 md:px-6 text-center">
          <FadeIn>
            <span className="inline-block text-[10px] uppercase tracking-[0.25em] text-emerald-400/60 font-medium mb-4 border border-emerald-400/20 rounded-full px-4 py-1.5">
              Internal Proposal — Cofounder Review
            </span>
          </FadeIn>
          <FadeIn delay={0.05}>
            <h1
              className="text-[48px] sm:text-[60px] md:text-[72px] lg:text-[88px] font-bold tracking-[-2px] leading-[0.95]"
              style={{ background: "linear-gradient(180deg, #FFF 40%, #34d399 100%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Rainmaker AutoPilot
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-white/40 text-base md:text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
              A system where users deposit money, flip one switch, and the platform handles everything —
              stake sizing, loss protection, fee collection, and RAIN accumulation. This document explains
              exactly how it works, where the money comes from, and what Rainmaker earns.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10">
              {[
                { v: "10%", l: "Auto-Stake Per Trade" },
                { v: "95%", l: "Model Win Rate" },
                { v: "$0", l: "Shield Cost to Rainmaker" },
                { v: "400K RAIN", l: "Treasury Backs the Shield" },
              ].map((s) => (
                <div key={s.l} className="text-center min-w-[120px]">
                  <span className="text-2xl md:text-3xl font-bold text-emerald-400 block">{s.v}</span>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">{s.l}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          1. OVERVIEW — What Is AutoPilot?
      ═══════════════════════════════════════════════════════════════ */}
      <section id="overview" className="py-16 md:py-24 bg-[#0a0a0c] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn><SectionHeading title="What Is AutoPilot?" subtitle="Three systems that remove every decision from the user. They deposit, flip the switch, and walk away." /></FadeIn>

          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  num: "1",
                  title: "Smart Stake",
                  color: "#34d399",
                  what: "Every trade is automatically sized at 10% of the user's balance. No manual input.",
                  why: "Prevents emotional sizing. A loss only hits 10% of the balance. Recoverable in ~1 winning trade.",
                  example: "$10,000 balance → $1,000 per trade. Win → balance grows → stake grows. Proportional. Automatic.",
                },
                {
                  num: "2",
                  title: "Recovery Shield",
                  color: "#22d3ee",
                  what: "When a user loses, the platform issues them locked RAIN credits equal to the loss. Their balance looks unchanged.",
                  why: "Compounding never breaks. The user's next trade is the same size as if the loss never happened.",
                  example: "User loses $1,000 → receives $1,000 in locked RAIN → next trade still stakes $1,000 → credit repays over 2-3 wins.",
                },
                {
                  num: "3",
                  title: "Circuit Breaker",
                  color: "#f59e0b",
                  what: "If a user's balance drops 15% from its peak, stake cuts to 5%. At 25% drop, trading pauses 24h.",
                  why: "Catches regime changes (NBA play-ins, model recalibration) before they cause cascading losses.",
                  example: "Model has 2 losses in a row → breaker cuts stake in half → 3rd loss does half damage → model recalibrates → auto-resumes.",
                },
              ].map((layer) => (
                <div key={layer.title} className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-bold" style={{ borderColor: layer.color, color: layer.color }}>{layer.num}</span>
                    <h3 className="text-lg font-semibold text-white">{layer.title}</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-1">What</span>
                      <p className="text-sm text-white/60 leading-relaxed">{layer.what}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-1">Why</span>
                      <p className="text-sm text-white/60 leading-relaxed">{layer.why}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                      <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-1">Example</span>
                      <p className="text-xs text-white/50 leading-relaxed">{layer.example}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          2. RECOVERY SHIELD — Deep Dive
      ═══════════════════════════════════════════════════════════════ */}
      <section id="shield" className="py-16 md:py-24 bg-[#09090b] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn><SectionHeading title="Recovery Shield" subtitle="The core innovation. Users who deposit $10K+ ($1K/stake) get 100% loss coverage. Everyone else gets 50%. Shield is backed by our RAIN treasury — costs Rainmaker $0 in USD." /></FadeIn>

          {/* Tiered coverage */}
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 text-xs font-bold">50%</div>
                  <div>
                    <h3 className="text-white font-semibold">Standard Shield</h3>
                    <p className="text-xs text-white/40">Under $1K/stake (under $10K deposit)</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <DataRow label="User loses $100 (10% of $1K)" value="−$100" />
                  <DataRow label="Shield covers 50%" value="+$50 credit" accent="#22d3ee" />
                  <DataRow label="Actual damage to balance" value="−$50" />
                  <DataRow label="Trades to recover" value="~1 win" />
                </div>
                <p className="text-xs text-white/30 mt-4 leading-relaxed">Loss stings, but it&apos;s halved. User stays on platform. Doesn&apos;t rage quit.</p>
              </div>

              <div className="bg-[#111113] border border-cyan-500/20 rounded-[20px] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-xs font-bold">100%</div>
                  <div>
                    <h3 className="text-white font-semibold">Pro Shield</h3>
                    <p className="text-xs text-cyan-400/60">$1K+/stake ($10K+ deposit) — the incentive</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <DataRow label="User loses $1,000 (10% of $10K)" value="−$1,000" />
                  <DataRow label="Shield covers 100%" value="+$1,000 in RAIN (locked)" accent="#22d3ee" />
                  <DataRow label="Actual damage to balance" value="$0" accent="#34d399" />
                  <DataRow label="Dashboard shows" value="$10,000 (unchanged)" accent="#34d399" />
                  <DataRow label="Credit repays over" value="2-3 winning trades" />
                </div>
                <p className="text-xs text-cyan-400/60 mt-4 leading-relaxed">Loss disappears completely. This is the incentive to deposit $10K. Compounding never breaks.</p>
              </div>
            </div>
          </FadeIn>

          {/* How the credit works */}
          <FadeIn delay={0.15}>
            <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6 md:p-8 mb-8">
              <h3 className="text-white font-semibold text-lg mb-2">How the RAIN Credit Works</h3>
              <p className="text-sm text-white/40 mb-6">Step by step, what happens when a Pro user loses a trade.</p>
              <div className="space-y-4">
                {[
                  { step: "1", title: "User loses $1,000", desc: "Burst 2.0 trade goes wrong. 10% stake is lost.", color: "#ef4444" },
                  { step: "2", title: "Platform issues $1,000 worth of RAIN from our treasury (400K RAIN)", desc: "This RAIN is deposited into the user's account as a LOCKED credit. They cannot withdraw or sell it.", color: "#22d3ee" },
                  { step: "3", title: "User's dashboard still shows $10,000 effective balance", desc: "Under the hood: $9,000 real USDC + $1,000 in locked RAIN credit. But the user sees $10,000.", color: "#34d399" },
                  { step: "4", title: "The locked RAIN also counts toward their RAIN tier (500K, 3M, 6M)", desc: "Getting a Shield credit can actually push a user closer to their next fee discount tier. Losing a trade = closer to Bronze.", color: "#f59e0b" },
                  { step: "5", title: "Next trade stakes $1,000 (10% of effective balance)", desc: "The USDC for this trade comes from the idle deposit pool (see 'Where the Money Comes From' section below). Stake size did NOT shrink.", color: "#a78bfa" },
                  { step: "6", title: "User wins. 50% of net profit repays the credit.", desc: "Win $960 gross → $691 net after fees → $346 goes to repayment (buys RAIN back for treasury) → $345 to user.", color: "#34d399" },
                  { step: "7", title: "1-2 more wins → credit fully repaid → RAIN returns to treasury", desc: "Treasury is whole again. User's balance is all real USDC. Compounding resumes at full speed. Total time with credit: ~48 hours.", color: "#34d399" },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold shrink-0 mt-0.5" style={{ borderColor: s.color, color: s.color }}>{s.step}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{s.title}</h4>
                      <p className="text-xs text-white/40 leading-relaxed mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Why everyone pays 3% */}
          <FadeIn delay={0.2}>
            <div className="bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-500/20 rounded-[20px] p-6 md:p-8">
              <h3 className="text-white font-semibold text-lg mb-2">Everyone Pays 3% — Not Everyone Gets the Same Coverage</h3>
              <p className="text-sm text-white/40 mb-6">The 3% Shield fee on every winning trade is the same for all users. The difference is what you get back.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white/60">The Pool Math (at 95% win rate)</h4>
                  <DataRow label="Wins paying 3% into pool" value="95 out of 100 trades" />
                  <DataRow label="Losses drawing from pool" value="5 out of 100 trades" />
                  <DataRow label="Ratio of inflow to outflow" value="19:1" accent="#34d399" />
                  <DataRow label="Pool net per day (100 users)" value="+$600 surplus" accent="#34d399" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white/60">The Incentive</h4>
                  <DataRow label="Under $10K deposit" value="50% loss coverage" />
                  <DataRow label="$10K+ deposit (Pro)" value="100% loss coverage" accent="#22d3ee" />
                  <DataRow label="Compounding impact (5.5 mo)" value="+$150K more at Pro" accent="#22d3ee" />
                  <DataRow label="This is the nudge to deposit $10K" value="↑" accent="#22d3ee" />
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. FEE STRUCTURE
      ═══════════════════════════════════════════════════════════════ */}
      <section id="fees" className="py-16 md:py-24 bg-[#0a0a0c] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn><SectionHeading title="Fee Structure" subtitle="Three fees on every winning trade. Fees are ONLY on profit — never on deposits, never on losses. All three serve a purpose." /></FadeIn>

          {/* Three fees */}
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                {
                  title: "Platform Fee",
                  rate: "10–20%",
                  who: "Everyone",
                  goesTo: "Rainmaker revenue",
                  color: "#a78bfa",
                  details: [
                    "Retail (no RAIN): 20%",
                    "Bronze (500K RAIN): 15%",
                    "Silver (3M RAIN): 12%",
                    "Gold (6M RAIN): 10%",
                  ],
                },
                {
                  title: "RAIN Auto-Buyback",
                  rate: "5%",
                  who: "Retail users only",
                  goesTo: "Auto-buys RAIN token",
                  color: "#f59e0b",
                  details: [
                    "Retail users' profit auto-buys RAIN",
                    "RAIN accumulates in their account",
                    "Pro stakers ($1K+) get 1.5× rate",
                    "Stops when user hits 500K RAIN (Bronze)",
                  ],
                },
                {
                  title: "Recovery Shield",
                  rate: "3%",
                  who: "Everyone",
                  goesTo: "Self-funding loss protection pool",
                  color: "#22d3ee",
                  details: [
                    "Funds the Shield pool",
                    "Standard users: 50% loss coverage",
                    "Pro users ($1K+/stake): 100% coverage",
                    "Pool is self-sustaining at 95% WR",
                  ],
                },
              ].map((fee) => (
                <div key={fee.title} className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-semibold">{fee.title}</h3>
                    <span className="text-xl font-bold font-mono" style={{ color: fee.color }}>{fee.rate}</span>
                  </div>
                  <p className="text-xs text-white/30 mb-1">Paid by: {fee.who}</p>
                  <p className="text-xs text-white/30 mb-4">Goes to: {fee.goesTo}</p>
                  <div className="space-y-2">
                    {fee.details.map((d, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-white/20 text-xs mt-0.5">•</span>
                        <span className="text-xs text-white/50 leading-relaxed">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Full tier matrix */}
          <FadeIn delay={0.15}>
            <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] overflow-hidden mb-8">
              <div className="px-4 md:px-6 py-4 border-b border-white/[0.04]">
                <h3 className="text-white font-semibold">Complete Tier Matrix — What Each User Pays</h3>
                <p className="text-xs text-white/30 mt-1">Pro = $1K+/stake ($10K+ deposit). RAIN tier determined by holdings.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Tier", "RAIN Held", "Deposit", "Platform", "Buyback", "Shield", "Total Fees", "Net PnL / $1K / day", "Shield Coverage"].map((h) => (
                        <th key={h} className="text-[10px] uppercase tracking-widest text-white/30 font-medium text-left px-3 md:px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { tier: "Retail", rain: "0", deposit: "<$10K", platform: "20%", buyback: "5%", shield: "3%", total: "28%", net: "$432", coverage: "50%", accent: "#ffffff60" },
                      { tier: "Retail Pro", rain: "0", deposit: "$10K+", platform: "20%", buyback: "5% (1.5×)", shield: "3%", total: "28%", net: "$432", coverage: "100%", accent: "#22d3ee" },
                      { tier: "Bronze", rain: "500K", deposit: "<$10K", platform: "15%", buyback: "0%", shield: "3%", total: "18%", net: "$492", coverage: "50%", accent: "#f59e0b80" },
                      { tier: "Bronze Pro", rain: "500K", deposit: "$10K+", platform: "15%", buyback: "0%", shield: "3%", total: "18%", net: "$492", coverage: "100%", accent: "#f59e0b" },
                      { tier: "Silver Pro", rain: "3M", deposit: "$10K+", platform: "12%", buyback: "0%", shield: "3%", total: "15%", net: "$510", coverage: "100%", accent: "#a78bfa" },
                      { tier: "Gold Pro", rain: "6M", deposit: "$10K+", platform: "10%", buyback: "0%", shield: "3%", total: "13%", net: "$522", coverage: "100%", accent: "#34d399" },
                    ].map((row) => (
                      <tr key={row.tier} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 md:px-4 py-3 font-medium text-xs" style={{ color: row.accent }}>{row.tier}</td>
                        <td className="px-3 md:px-4 py-3 text-white/40 font-mono text-xs">{row.rain}</td>
                        <td className="px-3 md:px-4 py-3 text-white/40 font-mono text-xs">{row.deposit}</td>
                        <td className="px-3 md:px-4 py-3 text-white/50 text-xs">{row.platform}</td>
                        <td className="px-3 md:px-4 py-3 text-white/50 text-xs">{row.buyback}</td>
                        <td className="px-3 md:px-4 py-3 text-white/50 text-xs">{row.shield}</td>
                        <td className="px-3 md:px-4 py-3 text-white font-mono font-bold text-xs">{row.total}</td>
                        <td className="px-3 md:px-4 py-3 text-emerald-400 font-mono font-medium text-xs">{row.net}</td>
                        <td className="px-3 md:px-4 py-3 text-xs font-bold" style={{ color: row.coverage === "100%" ? "#22d3ee" : "#ffffff40" }}>{row.coverage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 md:px-6 py-3 border-t border-white/[0.04] bg-white/[0.01]">
                <p className="text-xs text-white/30">Net PnL based on $600/day gross per $1K stake (MLB Burst 2.0 + Comeback combined). Fees only on profit.</p>
              </div>
            </div>
          </FadeIn>

          {/* Key point */}
          <FadeIn delay={0.2}>
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-[16px] p-6">
              <h3 className="text-white font-semibold mb-2">Even at 28% total fees, a user still makes 30-46× their money in 5.5 months.</h3>
              <p className="text-sm text-white/40">The model edge ($600/day per $1K) is so large that fees barely dent compounding. A retail user turns $10K into $460K. A Gold Pro turns $10K into $1.08M. Same model. Different fee load.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          4. RAIN AUTO-BUYBACK — Dedicated Section
      ═══════════════════════════════════════════════════════════════ */}
      <section id="buyback" className="py-16 md:py-24 bg-[#09090b] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn><SectionHeading title="RAIN Auto-Buyback" subtitle="5% of every retail user's profit automatically buys RAIN. That RAIN is LOCKED in their account until they hit 500K — the first fee discount tier. They cannot sell it, withdraw it, or move it." /></FadeIn>

          {/* The mechanic explained */}
          <FadeIn delay={0.1}>
            <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6 md:p-8 mb-8">
              <h3 className="text-white font-semibold text-lg mb-2">How It Works — Step by Step</h3>
              <p className="text-sm text-white/40 mb-6">Every time a retail user (someone who doesn&apos;t yet hold 500K RAIN) wins a trade, this happens automatically:</p>
              <div className="space-y-4">
                {[
                  { step: "1", title: "User wins a trade — gross profit: $960", desc: "Burst 2.0 fires. $1,000 stake returns $1,960. Gross profit = $960.", color: "#34d399" },
                  { step: "2", title: "Fees are calculated on the $960 profit", desc: "20% platform fee ($192) + 5% RAIN buyback ($48) + 3% Shield ($29) = $269 total fees. User keeps $691.", color: "#f59e0b" },
                  { step: "3", title: "The 5% ($48) immediately buys RAIN at market price", desc: "This happens automatically on every winning trade settlement. The user doesn't click anything. It just happens.", color: "#f59e0b" },
                  { step: "4", title: "The purchased RAIN is deposited into the user's account — LOCKED", desc: "The user can see their RAIN balance growing on their dashboard. But they CANNOT sell it, withdraw it, or transfer it. It is locked.", color: "#ef4444" },
                  { step: "5", title: "RAIN keeps accumulating trade after trade", desc: "Every winning trade adds more locked RAIN. The balance grows daily. The user watches it approach the 500K threshold.", color: "#a78bfa" },
                  { step: "6", title: "User hits 500K RAIN → auto-promotes to Bronze tier", desc: "The moment their locked RAIN hits 500K, they are promoted. Platform fee drops from 20% to 15%. The 5% buyback STOPS — they no longer pay it.", color: "#34d399" },
                  { step: "7", title: "RAIN unlocks at Bronze", desc: "Once promoted, their RAIN is unlocked. They can hold it (to maintain Bronze), sell some, or keep accumulating toward Silver (3M) and Gold (6M).", color: "#34d399" },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold shrink-0 mt-0.5" style={{ borderColor: s.color, color: s.color }}>{s.step}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{s.title}</h4>
                      <p className="text-xs text-white/40 leading-relaxed mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Locked vs Unlocked visual */}
          <FadeIn delay={0.15}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-[#111113] border border-red-500/20 rounded-[20px] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold">🔒</div>
                  <div>
                    <h3 className="text-white font-semibold">Locked RAIN (Under 500K)</h3>
                    <p className="text-xs text-white/40">Retail users before reaching Bronze</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <DataRow label="Can withdraw?" value="NO" accent="#ef4444" />
                  <DataRow label="Can sell?" value="NO" accent="#ef4444" />
                  <DataRow label="Can transfer?" value="NO" accent="#ef4444" />
                  <DataRow label="Visible on dashboard?" value="YES — user sees it growing" accent="#34d399" />
                  <DataRow label="Counts toward Shield credits?" value="YES — locked RAIN from Shield also counts" accent="#34d399" />
                  <DataRow label="Counts toward 500K goal?" value="YES — every RAIN token counts" accent="#34d399" />
                </div>
                <p className="text-xs text-white/30 mt-4">The user is accumulating RAIN whether they want to or not. It is mandatory for retail. They are slowly building toward their first fee discount.</p>
              </div>

              <div className="bg-[#111113] border border-emerald-500/20 rounded-[20px] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold">🔓</div>
                  <div>
                    <h3 className="text-white font-semibold">Unlocked RAIN (500K+ Bronze)</h3>
                    <p className="text-xs text-white/40">After hitting the first tier</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <DataRow label="Can withdraw?" value="YES" accent="#34d399" />
                  <DataRow label="Can sell?" value="YES (but drops tier if below 500K)" accent="#f59e0b" />
                  <DataRow label="5% buyback still active?" value="NO — stops at Bronze" accent="#34d399" />
                  <DataRow label="Platform fee" value="15% (down from 20%)" accent="#34d399" />
                  <DataRow label="Extra profit kept per trade" value="+$48 per $960 win" accent="#34d399" />
                  <DataRow label="Net effect" value="More compounding, lower fees" accent="#34d399" />
                </div>
                <p className="text-xs text-white/30 mt-4">The carrot: reach 500K RAIN and your fees drop permanently (as long as you hold). The buyback stops. You keep more of every win. Compounding accelerates.</p>
              </div>
            </div>
          </FadeIn>

          {/* Accumulation timeline */}
          <FadeIn delay={0.2}>
            <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] overflow-hidden mb-8">
              <div className="px-4 md:px-6 py-4 border-b border-white/[0.04]">
                <h3 className="text-white font-semibold">How Fast Does a Retail User Hit 500K RAIN?</h3>
                <p className="text-xs text-white/30 mt-1">Depends on RAIN price and stake size. Pro stakers (1.5× rate) get there faster.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Deposit", "Stake", "Daily Gross Profit", "5% Buyback/Day", "Pro (1.5×)", "RAIN @ $0.005", "RAIN @ $0.01", "RAIN @ $0.05"].map((h) => (
                        <th key={h} className="text-[10px] uppercase tracking-widest text-white/30 font-medium text-left px-3 md:px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { dep: "$1,000", stake: "$100", gross: "$600", buy: "$30/day", pro: "$45/day", p1: "~11 days", p2: "~22 days", p3: "~111 days", accent: "#ffffff60" },
                      { dep: "$5,000", stake: "$500", gross: "$3,000", buy: "$150/day", pro: "$225/day", p1: "~2 days", p2: "~4 days", p3: "~22 days", accent: "#ffffff80" },
                      { dep: "$10,000", stake: "$1,000", gross: "$6,000", buy: "$300/day", pro: "$450/day", p1: "~1 day", p2: "~2 days", p3: "~11 days", accent: "#22d3ee" },
                      { dep: "$25,000", stake: "$2,500", gross: "$15,000", buy: "$750/day", pro: "$1,125/day", p1: "<1 day", p2: "~1 day", p3: "~4 days", accent: "#f59e0b" },
                    ].map((row) => (
                      <tr key={row.dep} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 md:px-4 py-3 text-xs font-medium" style={{ color: row.accent }}>{row.dep}</td>
                        <td className="px-3 md:px-4 py-3 text-white/50 font-mono text-xs">{row.stake}</td>
                        <td className="px-3 md:px-4 py-3 text-white/50 font-mono text-xs">{row.gross}</td>
                        <td className="px-3 md:px-4 py-3 text-white/50 font-mono text-xs">{row.buy}</td>
                        <td className="px-3 md:px-4 py-3 text-[#f59e0b] font-mono text-xs">{row.pro}</td>
                        <td className="px-3 md:px-4 py-3 text-emerald-400 font-mono text-xs">{row.p1}</td>
                        <td className="px-3 md:px-4 py-3 text-emerald-400/70 font-mono text-xs">{row.p2}</td>
                        <td className="px-3 md:px-4 py-3 text-white/50 font-mono text-xs">{row.p3}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 md:px-6 py-3 border-t border-white/[0.04] bg-white/[0.01]">
                <p className="text-xs text-white/30">Pro stakers ($10K+ deposit) get 1.5× accumulation rate. Days to 500K depend on RAIN market price at time of purchase.</p>
              </div>
            </div>
          </FadeIn>

          {/* What it means for RAIN token + platform */}
          <FadeIn delay={0.25}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-r from-[#f59e0b]/10 via-[#f59e0b]/5 to-transparent border border-[#f59e0b]/20 rounded-[20px] p-6">
                <h3 className="text-white font-semibold mb-4">What This Means for RAIN Token</h3>
                <div className="space-y-2.5">
                  <DataRow label="Every retail win = automatic buy pressure" value="Mandatory" accent="#f59e0b" />
                  <DataRow label="RAIN is locked = cannot be sold" value="No sell pressure" accent="#34d399" />
                  <DataRow label="New users join = more buyers" value="Flywheel" accent="#f59e0b" />
                  <DataRow label="Users promote to Bronze = buyback stops" value="But they HOLD (to keep tier)" accent="#f59e0b" />
                  <DataRow label="Month 1 aggregate buy pressure" value="$300/day" />
                  <DataRow label="Month 3 aggregate buy pressure" value="$4,500/day" accent="#f59e0b" />
                  <DataRow label="Month 5 aggregate buy pressure" value="$15,000/day" accent="#f59e0b" />
                  <DataRow label="5.5-month total" value="$900K+ in buys" accent="#f59e0b" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-[20px] p-6">
                <h3 className="text-white font-semibold mb-4">The Flywheel</h3>
                <div className="space-y-4">
                  {[
                    { step: "01", title: "User profits → 5% auto-buys RAIN", desc: "Mandatory. Automatic. Every winning trade.", color: "#0ea5e9" },
                    { step: "02", title: "RAIN locked → no sell pressure", desc: "Tokens can't hit the market. Only buy pressure exists.", color: "#f59e0b" },
                    { step: "03", title: "RAIN price rises from constant buys", desc: "More users = more buys = price goes up.", color: "#a78bfa" },
                    { step: "04", title: "User hits 500K → promotes to Bronze", desc: "Fees drop. Buyback stops. User keeps more profit.", color: "#34d399" },
                    { step: "05", title: "User holds RAIN to maintain tier", desc: "If they sell below 500K, they lose Bronze and go back to 20% fees + 5% buyback.", color: "#ef4444" },
                    { step: "06", title: "New users replace promoted users' buy pressure", desc: "Constant inflow of new retail users keeps the buyback engine running.", color: "#0ea5e9" },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <span className="text-xs font-bold font-mono mt-0.5 shrink-0" style={{ color: s.color }}>{s.step}</span>
                      <div>
                        <h4 className="text-xs font-semibold text-white">{s.title}</h4>
                        <p className="text-[11px] text-white/40 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Key callout */}
          <FadeIn delay={0.3}>
            <div className="bg-[#111113] border border-[#1e1e20] rounded-[16px] p-6">
              <h3 className="text-white font-semibold mb-3">Why Locking Matters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-2">Without locking</span>
                  <p className="text-xs text-white/50 leading-relaxed">User receives RAIN → immediately sells it → no price impact → token goes nowhere → tier system is meaningless.</p>
                </div>
                <div className="p-4 rounded-lg bg-[#f59e0b]/5 border border-[#f59e0b]/10">
                  <span className="text-[10px] uppercase tracking-widest text-[#f59e0b]/60 block mb-2">With locking</span>
                  <p className="text-xs text-white/50 leading-relaxed">User receives RAIN → locked until 500K → only buy pressure on the market → price goes up → reaching 500K costs less in dollar terms over time → more users can afford tiers.</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 block mb-2">After unlocking (Bronze+)</span>
                  <p className="text-xs text-white/50 leading-relaxed">User CAN sell — but won&apos;t. Selling below 500K means going back to 20% fees + 5% mandatory buyback. The economic incentive to hold is stronger than the incentive to sell.</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          5. FULL TRADE WALKTHROUGH
      ═══════════════════════════════════════════════════════════════ */}
      <section id="walkthrough" className="py-16 md:py-24 bg-[#0a0a0c] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn><SectionHeading title="Full Trade Walkthrough" subtitle="Pro user. $10,000 balance. AutoPilot ON. Four trades: win, loss, win, win. Exactly what happens to every dollar." /></FadeIn>

          <FadeIn delay={0.1}>
            <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Trade", "Balance", "Stake (10%)", "Result", "Fees (28%)", "Shield", "Real Balance", "Credit", "Effective Balance"].map((h) => (
                        <th key={h} className="text-[10px] uppercase tracking-widest text-white/30 font-medium text-left px-3 md:px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { trade: "Start", bal: "$10,000", stake: "—", result: "—", fees: "—", shield: "—", real: "$10,000", credit: "$0", eff: "$10,000", color: "#ffffff" },
                      { trade: "Trade 1", bal: "$10,000", stake: "$1,000", result: "Win +$960", fees: "−$269", shield: "—", real: "$10,691", credit: "$0", eff: "$10,691", color: "#34d399" },
                      { trade: "Trade 2", bal: "$10,691", stake: "$1,069", result: "Loss −$620", fees: "$0", shield: "+$620 RAIN", real: "$10,071", credit: "$620", eff: "$10,691", color: "#ef4444" },
                      { trade: "Trade 3", bal: "$10,691", stake: "$1,069", result: "Win +$1,026", fees: "−$287", shield: "Repay $370", real: "$10,440", credit: "$250", eff: "$10,690", color: "#34d399" },
                      { trade: "Trade 4", bal: "$10,690", stake: "$1,069", result: "Win +$1,026", fees: "−$287", shield: "Repay $250", real: "$10,929", credit: "$0", eff: "$10,929", color: "#34d399" },
                    ].map((row) => (
                      <tr key={row.trade} className="border-b border-white/[0.03] last:border-0">
                        <td className="px-3 md:px-4 py-3 text-xs font-semibold" style={{ color: row.color }}>{row.trade}</td>
                        <td className="px-3 md:px-4 py-3 text-white/70 font-mono text-xs">{row.bal}</td>
                        <td className="px-3 md:px-4 py-3 text-white/50 font-mono text-xs">{row.stake}</td>
                        <td className="px-3 md:px-4 py-3 font-mono text-xs font-medium" style={{ color: row.color }}>{row.result}</td>
                        <td className="px-3 md:px-4 py-3 text-amber-400/60 font-mono text-xs">{row.fees}</td>
                        <td className="px-3 md:px-4 py-3 text-cyan-400 font-mono text-xs">{row.shield}</td>
                        <td className="px-3 md:px-4 py-3 text-white/50 font-mono text-xs">{row.real}</td>
                        <td className="px-3 md:px-4 py-3 font-mono text-xs" style={{ color: row.credit !== "$0" ? "#22d3ee" : "#ffffff20" }}>{row.credit}</td>
                        <td className="px-3 md:px-4 py-3 text-white font-mono text-xs font-bold">{row.eff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 md:px-6 py-4 border-t border-white/[0.04] bg-white/[0.01] space-y-2">
                <p className="text-xs text-white/50"><span className="text-white font-medium">Key line — Trade 2 (the loss):</span> Effective balance stays at $10,691. Stake on Trade 3 is still $1,069 — same as if the loss never happened. This is the Shield.</p>
                <p className="text-xs text-white/50"><span className="text-white font-medium">Key line — Trade 4:</span> Credit fully repaid. RAIN back in treasury. User&apos;s entire $10,929 balance is real. Took 2 trades (~48 hours) to clear.</p>
                <p className="text-xs text-white/50"><span className="text-white font-medium">What the user sees:</span> $10,000 → $10,691 → $10,691 → $10,690 → $10,929. A smooth upward curve. The loss is invisible.</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          6. WHERE THE MONEY COMES FROM
      ═══════════════════════════════════════════════════════════════ */}
      <section id="funding" className="py-16 md:py-24 bg-[#09090b] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn><SectionHeading title="Where the Money Comes From" subtitle="Rainmaker doesn't need to put in any USD. The Shield is backed by two things we already have: our RAIN treasury and our users' idle deposits." /></FadeIn>

          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#f59e0b]/10 flex items-center justify-center text-[#f59e0b] text-xs font-bold">R</div>
                  <h3 className="text-white font-semibold">RAIN Treasury (the credit)</h3>
                </div>
                <p className="text-xs text-white/40 mb-4">When a user loses, we issue RAIN from our treasury as a locked credit. This is the IOU.</p>
                <div className="space-y-2.5">
                  <DataRow label="Our RAIN treasury" value="~400K RAIN" accent="#f59e0b" />
                  <DataRow label="Max outstanding credits (worst case)" value="~5% of treasury" />
                  <DataRow label="Average time credit is outstanding" value="~48 hours" />
                  <DataRow label="RAIN always returns to treasury" value="Yes — via repayments" accent="#34d399" />
                  <DataRow label="Net RAIN spent" value="$0 over time" accent="#34d399" />
                </div>
              </div>

              <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold">$</div>
                  <h3 className="text-white font-semibold">Idle Deposits (the USDC)</h3>
                </div>
                <p className="text-xs text-white/40 mb-4">Users only stake 10% per trade. The other 90% sits idle. That idle USDC is the float for the next trade.</p>
                <div className="space-y-2.5">
                  <DataRow label="User deposits $10K" value="$1K staked, $9K idle" />
                  <DataRow label="Total deposits (100 users)" value="$1M" />
                  <DataRow label="Total staked at any moment (10%)" value="$100K" />
                  <DataRow label="Total idle USDC available" value="$900K" accent="#34d399" />
                  <DataRow label="Max Shield credit needed" value="~$20K" />
                  <DataRow label="Coverage ratio" value="45:1" accent="#34d399" />
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] p-6 md:p-8 mb-8">
              <h3 className="text-white font-semibold text-lg mb-2">The Full Money Flow</h3>
              <p className="text-xs text-white/40 mb-6">What happens on every trade, where every dollar goes.</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.02]">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-3">On a WIN ($960 gross profit)</h4>
                  <div className="space-y-2">
                    {[
                      { l: "20% platform fee", v: "$192 → Rainmaker" },
                      { l: "5% RAIN buyback", v: "$48 → buys RAIN" },
                      { l: "3% Shield pool", v: "$29 → Shield pool" },
                      { l: "User keeps (72%)", v: "$691 → balance" },
                    ].map((r) => (
                      <div key={r.l} className="flex items-center justify-between text-xs">
                        <span className="text-white/40">{r.l}</span>
                        <span className="text-white/60 font-mono">{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-red-500/10 bg-red-500/[0.02]">
                  <h4 className="text-sm font-semibold text-red-400 mb-3">On a LOSS ($620 lost, Pro user)</h4>
                  <div className="space-y-2">
                    {[
                      { l: "Platform fee", v: "$0 (no profit)" },
                      { l: "RAIN buyback", v: "$0 (no profit)" },
                      { l: "Shield fee", v: "$0 (no profit)" },
                      { l: "Shield credit issued", v: "$620 in RAIN (locked)" },
                      { l: "USDC for next trade", v: "From idle deposit pool" },
                    ].map((r) => (
                      <div key={r.l} className="flex items-center justify-between text-xs">
                        <span className="text-white/40">{r.l}</span>
                        <span className="text-white/60 font-mono">{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-cyan-500/10 bg-cyan-500/[0.02]">
                  <h4 className="text-sm font-semibold text-cyan-400 mb-3">CREDIT REPAYMENT (next 2-3 wins)</h4>
                  <div className="space-y-2">
                    {[
                      { l: "50% of net profit", v: "Buys RAIN at market" },
                      { l: "RAIN returned to treasury", v: "Treasury restored" },
                      { l: "Locked RAIN in user account", v: "Burned/cleared" },
                      { l: "Time to full repayment", v: "~48 hours" },
                      { l: "Net cost to Rainmaker", v: "$0" },
                    ].map((r) => (
                      <div key={r.l} className="flex items-center justify-between text-xs">
                        <span className="text-white/40">{r.l}</span>
                        <span className="text-white/60 font-mono">{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-[16px] p-6">
              <h3 className="text-white font-semibold mb-2">Bottom Line</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Rainmaker puts in <span className="text-emerald-400 font-bold">$0 USD</span>. The RAIN treasury backs the credits — RAIN goes out, RAIN comes back within 48 hours.
                The actual USDC for trades comes from the 90% of user deposits sitting idle. At 95% win rate, the system is self-funding from Day 1.
                The only scenario where this breaks is if every user withdraws simultaneously AND the model starts losing — which is why Circuit Breaker exists.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          7. THE NUMBERS
      ═══════════════════════════════════════════════════════════════ */}
      <section id="numbers" className="py-16 md:py-24 bg-[#0a0a0c] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn><SectionHeading title="The Numbers" subtitle="What users make. What Rainmaker earns. Same model, different tiers." /></FadeIn>

          {/* User compounding by tier */}
          <FadeIn delay={0.1}>
            <div className="bg-[#111113] border border-[#1e1e20] rounded-[20px] overflow-hidden mb-8">
              <div className="px-4 md:px-6 py-4 border-b border-white/[0.04]">
                <h3 className="text-white font-semibold">$10K Deposit → 5.5 Months (AutoPilot, all fees paid)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Tier", "Total Fees", "Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 5.5", "Return"].map((h) => (
                        <th key={h} className="text-[10px] uppercase tracking-widest text-white/30 font-medium text-left px-3 md:px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { tier: "Retail Pro", fees: "28%", m1: "$38K", m2: "$86K", m3: "$155K", m4: "$250K", m5: "$380K", m55: "$460K", ret: "46×", accent: "#22d3ee" },
                      { tier: "Bronze Pro", fees: "18%", m1: "$44K", m2: "$110K", m3: "$220K", m4: "$385K", m5: "$620K", m55: "$780K", ret: "78×", accent: "#f59e0b" },
                      { tier: "Silver Pro", fees: "15%", m1: "$46K", m2: "$120K", m3: "$250K", m4: "$450K", m5: "$740K", m55: "$940K", ret: "94×", accent: "#a78bfa" },
                      { tier: "Gold Pro", fees: "13%", m1: "$48K", m2: "$130K", m3: "$275K", m4: "$500K", m5: "$840K", m55: "$1.08M", ret: "108×", accent: "#34d399" },
                    ].map((row) => (
                      <tr key={row.tier} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 md:px-4 py-3 font-medium text-xs" style={{ color: row.accent }}>{row.tier}</td>
                        <td className="px-3 md:px-4 py-3 text-white/50 font-mono text-xs">{row.fees}</td>
                        <td className="px-3 md:px-4 py-3 text-white/70 font-mono text-xs">{row.m1}</td>
                        <td className="px-3 md:px-4 py-3 text-white/70 font-mono text-xs">{row.m2}</td>
                        <td className="px-3 md:px-4 py-3 text-white/70 font-mono text-xs">{row.m3}</td>
                        <td className="px-3 md:px-4 py-3 text-white/70 font-mono text-xs">{row.m4}</td>
                        <td className="px-3 md:px-4 py-3 text-white/70 font-mono text-xs">{row.m5}</td>
                        <td className="px-3 md:px-4 py-3 font-mono font-bold text-xs" style={{ color: row.accent }}>{row.m55}</td>
                        <td className="px-3 md:px-4 py-3 text-emerald-400 font-mono font-bold text-xs">{row.ret}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>

          {/* Rainmaker revenue */}
          <FadeIn delay={0.15}>
            <div className="bg-gradient-to-r from-[#a78bfa]/10 via-[#a78bfa]/5 to-transparent border border-[#a78bfa]/20 rounded-[20px] p-6 md:p-8 mb-8">
              <h3 className="text-white font-semibold text-lg mb-2">Rainmaker Platform Revenue</h3>
              <p className="text-xs text-white/40 mb-6">Platform fee only (10-20% of user profit). Shield costs $0. RAIN buyback goes to token, not Rainmaker.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { users: "10 users (Month 1)", daily: "$1,200/day", monthly: "$36K/mo", accent: "#0ea5e9" },
                  { users: "100 users (Month 3)", daily: "$12,000/day", monthly: "$360K/mo", accent: "#a78bfa" },
                  { users: "400 users (Month 5.5)", daily: "$48,000/day", monthly: "$1.44M/mo", accent: "#f59e0b" },
                ].map((s) => (
                  <div key={s.users} className="text-center p-5 rounded-lg border border-white/[0.04]">
                    <span className="text-xs text-white/40 block mb-2">{s.users}</span>
                    <span className="text-xl font-bold font-mono block" style={{ color: s.accent }}>{s.daily}</span>
                    <span className="text-sm font-mono text-white/50 block mt-1">{s.monthly}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <span className="text-xs text-white/40 block mb-1">5.5-month total platform revenue</span>
                  <span className="text-2xl font-bold text-[#f59e0b] font-mono">$3.6M+</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <span className="text-xs text-white/40 block mb-1">USD invested by Rainmaker</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono">$0</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <span className="text-xs text-white/40 block mb-1">RAIN token buy pressure</span>
                  <span className="text-2xl font-bold text-[#f59e0b] font-mono">$900K+</span>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Side by side comparison */}
          <FadeIn delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111113] border border-red-500/20 rounded-[20px] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <h3 className="text-white font-semibold">Without AutoPilot</h3>
                </div>
                <div className="space-y-2.5">
                  {[
                    "User picks their own stake — emotional, inconsistent",
                    "Loss → panic → reduces stake → misses next 10 wins",
                    "No Shield → every loss is permanent damage to compounding",
                    "No auto-buyback → never accumulates RAIN → stays at highest fee tier",
                    "No Circuit Breaker → regime change wipes weeks of gains",
                    "$10K → $40K in 5.5 months (4× return)",
                  ].map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-red-400 text-xs mt-0.5 shrink-0">✗</span>
                      <span className="text-xs text-white/50 leading-relaxed">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#111113] border border-emerald-500/20 rounded-[20px] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <h3 className="text-white font-semibold">With AutoPilot (Pro, $10K deposit)</h3>
                </div>
                <div className="space-y-2.5">
                  {[
                    "10% auto-stake every trade — consistent, automatic",
                    "Loss → Shield covers 100% → next trade same size → compounding intact",
                    "RAIN credit keeps balance whole → user doesn't even notice the loss",
                    "5% auto-buyback → hits Bronze in ~55 days → fees drop automatically",
                    "Circuit Breaker catches regime changes → limits damage → auto-resumes",
                    "$10K → $460K in 5.5 months (46× return, all fees paid)",
                  ].map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 text-xs mt-0.5 shrink-0">✓</span>
                      <span className="text-xs text-white/50 leading-relaxed">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          8. IMPLEMENTATION
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 bg-[#09090b]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <FadeIn><SectionHeading title="What Needs to Be Built" subtitle="Four systems. Estimated effort for each." /></FadeIn>
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Smart Stake Engine",
                  effort: "Medium",
                  effortColor: "#f59e0b",
                  items: [
                    "Auto-size trades at 10% of balance",
                    "Pro threshold detection ($10K+ deposit)",
                    "Single UI toggle: AutoPilot ON/OFF",
                    "Balance tracking per user in real-time",
                  ],
                },
                {
                  title: "Recovery Shield",
                  effort: "High",
                  effortColor: "#ef4444",
                  items: [
                    "RAIN credit issuance from treasury on loss",
                    "Tiered coverage: 50% (standard) / 100% (Pro)",
                    "Locked credit tracking per user",
                    "Auto-repayment (50% of net wins until clear)",
                    "RAIN buyback on repayment → return to treasury",
                    "Pool health dashboard",
                  ],
                },
                {
                  title: "Fee Engine + RAIN Buyback",
                  effort: "High",
                  effortColor: "#ef4444",
                  items: [
                    "Tiered platform fee by RAIN holdings",
                    "5% auto-buyback on retail user profits",
                    "1.5× accelerated rate for Pro stakers",
                    "Auto-promote at 500K RAIN → stop buyback",
                    "Real-time fee calc per trade settlement",
                  ],
                },
                {
                  title: "Circuit Breaker",
                  effort: "Low",
                  effortColor: "#34d399",
                  items: [
                    "Track ATH balance per user",
                    "15% drawdown → 5% stake",
                    "25% drawdown → pause 24h",
                    "Auto-resume within 10% of ATH",
                    "Notification system for events",
                  ],
                },
              ].map((section) => (
                <div key={section.title} className="bg-[#111113] border border-[#1e1e20] rounded-[16px] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-sm">{section.title}</h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border" style={{ color: section.effortColor, borderColor: `${section.effortColor}40`, backgroundColor: `${section.effortColor}10` }}>
                      {section.effort}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-white/20 text-xs mt-0.5 shrink-0">•</span>
                        <span className="text-xs text-white/50 leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CTA
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 bg-[#0a0a0c]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 text-center">
          <FadeIn>
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-[20px] p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">The model prints. AutoPilot compounds. Shield protects. Rainmaker earns.</h2>
              <p className="text-white/50 text-sm md:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
                Users deposit, flip the switch, and their money grows. Losses are invisible. RAIN accumulates automatically.
                Fees are only on profit. Rainmaker collects platform fees on every winning trade with zero capital at risk.
                The RAIN treasury backs the Shield and comes back within 48 hours. The system funds itself from Day 1.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded-full">
                  <Link href="/rampup">View Ramp Up Plan</Link>
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-8 bg-[#09090b]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white/20 text-xs">Rainmaker AutoPilot — Internal Proposal</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/30 hover:text-white/60 text-xs transition-colors">Home</Link>
            <Link href="/rampup" className="text-white/30 hover:text-white/60 text-xs transition-colors">Ramp Up</Link>
          </div>
        </div>
      </footer>
    </m.div>
  );
}
