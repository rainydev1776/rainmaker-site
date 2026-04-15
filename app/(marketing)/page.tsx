"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { m, useInView } from "framer-motion";

/* ── Sequential KPI row (earned → win rate → waitlist) ── */
function KpiRow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-40px" });
  // which KPI is currently animating / done: -1 = not started, 0/1/2 = that index done
  const [done, setDone] = useState(-1);
  const startedRef = useRef(false);

  const kpis = [
    { value: 10000, prefix: "$", suffix: "+", label: "Earned for Users" },
    { value: 90, prefix: "", suffix: "%", label: "Win Rate" },
    { value: 2000, prefix: "", suffix: "+", label: "On Waitlist" },
  ];

  // single counting animation
  const countUp = useCallback(
    (index: number) => {
      const kpi = kpis[index];
      const duration = 1400;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplays((d) => {
          const next = [...d];
          next[index] = Math.round(eased * kpi.value);
          return next;
        });
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          setDone(index);
        }
      };
      requestAnimationFrame(tick);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [displays, setDisplays] = useState([0, 0, 0]);

  // kick off the first one after a short delay when visible
  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;
    const timer = setTimeout(() => {
      setDone(-0.5 as never); // trigger visibility of index 0
      countUp(0);
    }, 600);
    return () => clearTimeout(timer);
  }, [inView, countUp]);

  // chain: when one finishes, start the next after a short pause
  useEffect(() => {
    if (typeof done !== "number" || done < 0 || done >= kpis.length - 1) return;
    const timer = setTimeout(() => countUp(done + 1), 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // visibility: index 0 visible once started, others visible once previous is done
  const isVisible = (i: number) => {
    if (i === 0) return startedRef.current && inView;
    return done >= i - 1;
  };

  return (
    <div
      ref={containerRef}
      className="mt-10 w-full max-w-[640px] mx-auto grid grid-cols-3 gap-6 px-2"
    >
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className="flex flex-col items-center gap-1"
          style={{
            opacity: isVisible(i) ? 1 : 0,
            transition: "opacity 0.25s ease",
          }}
        >
          <span className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-white">
            {kpi.prefix}
            {displays[i].toLocaleString()}
            {kpi.suffix}
          </span>
          <span className="text-[11px] sm:text-xs text-white/40">
            {kpi.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── 3D tilt card with glow + shine ────────────────────── */
function TiltCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const glow = glowRef.current;
    const shine = shineRef.current;
    if (!card || !glow || !shine) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;
      const rotateX = (mouseY / rect.height) * -20;
      const rotateY = (mouseX / rect.width) * 20;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

      // Glow intensifies + follows cursor
      glow.style.opacity = "1";
      glow.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(14, 165, 233, 0.35), transparent 60%)`;

      // Shine follows cursor
      const percX = ((e.clientX - rect.left) / rect.width) * 100;
      const percY = ((e.clientY - rect.top) / rect.height) * 100;
      shine.style.background = `radial-gradient(300px circle at ${percX}% ${percY}%, rgba(255,255,255,0.15), transparent 60%)`;
    };

    const handleMouseLeave = () => {
      card.style.transform =
        "perspective(1000px) rotateX(10deg) rotateY(-10deg)";
      glow.style.opacity = "0.4";
      glow.style.background =
        "radial-gradient(400px circle at 50% 50%, rgba(14, 165, 233, 0.15), transparent 60%)";
      shine.style.background = "transparent";
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="relative z-10 w-full max-w-[420px] transition-transform duration-150 ease-out cursor-grab active:cursor-grabbing"
      style={{
        transform: "perspective(1000px) rotateX(10deg) rotateY(-10deg)",
      }}
    >
      {/* Dynamic glow behind card */}
      <div
        ref={glowRef}
        className="absolute -inset-8 rounded-3xl -z-10 transition-opacity duration-300 pointer-events-none"
        style={{
          opacity: 0.4,
          background:
            "radial-gradient(400px circle at 50% 50%, rgba(14, 165, 233, 0.15), transparent 60%)",
          filter: "blur(20px)",
        }}
      />
      <div className="absolute -inset-4 bg-black/40 rounded-3xl blur-2xl -z-10" />
      <div className="relative rounded-2xl overflow-hidden shadow-2xl">
        <Image
          src="/rainmaker-neo-card.png"
          alt="Neo Card"
          width={480}
          height={300}
          className="w-full h-auto"
        />
        {/* Shine overlay that follows cursor */}
        <div
          ref={shineRef}
          className="absolute inset-0 rounded-2xl pointer-events-none transition-[background] duration-100"
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white overflow-x-hidden scroll-smooth">
      {/* Header/Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/5">
        <nav className="max-w-[1440px] mx-auto px-6 lg:px-6">
          <div className="flex items-center justify-between h-[70px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/rainmaker-logo-white.svg"
                alt="Rainmaker"
                width={28}
                height={28}
                className="w-7 h-7"
              />
              <span className="text-base font-medium text-white group-hover:text-[#0ea5e9] transition-colors">
                Rainmaker
              </span>
            </Link>

            {/* Desktop Navigation - Centered */}
            <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              <Link
                href="/"
                className="text-white hover:text-white/80 transition-colors text-sm font-normal px-4 py-2"
              >
                Home
              </Link>
              <Link
                href="#neo"
                className="text-white/70 hover:text-white transition-colors text-sm font-normal px-4 py-2"
              >
                Neo
              </Link>
              <Link
                href="#rainusd"
                className="text-white/70 hover:text-white transition-colors text-sm font-normal px-4 py-2"
              >
                RainUSD
              </Link>
              <Link
                href="#product"
                className="text-white/70 hover:text-white transition-colors text-sm font-normal px-4 py-2"
              >
                Features
              </Link>
              <Link
                href="#faq"
                className="text-white/70 hover:text-white transition-colors text-sm font-normal px-4 py-2"
              >
                FAQ
              </Link>
              <Link
                href="/rampup"
                className="text-[#0ea5e9] hover:text-[#0ea5e9]/80 transition-colors text-sm font-medium px-4 py-2"
              >
                Ramp Up
              </Link>
              <Link
                href="/autopilot"
                className="text-[#34d399] hover:text-[#34d399]/80 transition-colors text-sm font-medium px-4 py-2"
              >
                AutoPilot
              </Link>
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                className="text-white/40 cursor-not-allowed font-medium px-4 py-2 h-9 rounded-full text-sm"
                disabled
              >
                Login
              </Button>
              <a
                href="https://rainmaker-waitlist.vercel.app/waitlist"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white font-medium px-5 py-2 h-9 rounded-full text-sm">
                  Get Early Access
                </Button>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white p-2 hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-[100]"
            style={{ backgroundColor: "#0a0a0c" }}
          >
            <div className="flex items-center justify-between h-[70px] px-6 border-b border-white/10 bg-[#0a0a0c]">
              <Link
                href="/"
                className="flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Image
                  src="/rainmaker-logo-white.svg"
                  alt="Rainmaker"
                  width={28}
                  height={28}
                  className="w-7 h-7"
                />
                <span className="text-base font-medium text-white">
                  Rainmaker
                </span>
              </Link>
              <button
                className="text-white p-2 hover:bg-white/5 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col h-[calc(100vh-70px)] px-6 py-8 bg-[#0a0a0c]">
              <nav className="flex flex-col gap-1">
                <Link
                  href="/"
                  className="text-white text-lg font-medium py-4 border-b border-white/5 hover:text-[#0ea5e9] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="#neo"
                  className="text-white/80 text-lg font-medium py-4 border-b border-white/5 hover:text-[#0ea5e9] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Neo
                </Link>
                <Link
                  href="#rainusd"
                  className="text-white/80 text-lg font-medium py-4 border-b border-white/5 hover:text-[#0ea5e9] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  RainUSD
                </Link>
                <Link
                  href="#product"
                  className="text-white/80 text-lg font-medium py-4 border-b border-white/5 hover:text-[#0ea5e9] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  href="#faq"
                  className="text-white/80 text-lg font-medium py-4 border-b border-white/5 hover:text-[#0ea5e9] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  FAQ
                </Link>
                <Link
                  href="/rampup"
                  className="text-[#0ea5e9] text-lg font-medium py-4 border-b border-white/5 hover:text-[#0ea5e9]/80 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Ramp Up
                </Link>
                <Link
                  href="/autopilot"
                  className="text-[#34d399] text-lg font-medium py-4 border-b border-white/5 hover:text-[#34d399]/80 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  AutoPilot
                </Link>
              </nav>

              <div className="mt-auto pt-8 flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white/40 cursor-not-allowed font-medium py-3 h-auto text-base rounded-full"
                  disabled
                >
                  Login
                </Button>
                <a
                  href="https://rainmaker-waitlist.vercel.app/waitlist"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button className="w-full bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white font-medium py-3 h-auto text-base rounded-full">
                    Get Early Access
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-16">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-6">
          <div className="relative bg-black rounded-[24px] overflow-hidden shadow-[inset_0_0_0_1px_rgba(0,0,0,1)]">
            {/* Background Video */}
            <div className="absolute inset-[-1px] rounded-[24px] overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover scale-[1.01] saturate-50"
              >
                <source src="/rainy-hero-video2.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-black/95" />
            </div>

            {/* Hero Content */}
            <div className="relative z-10 flex flex-col items-center pt-[32px] px-4">

              {/* Early Access Badge */}
              <div className="inline-flex items-center gap-3 px-4 pr-[18px] py-2 bg-[#141415] border border-[#202022] rounded-full mb-6">
                <img
                  src="/celebrate_icon.svg"
                  alt=""
                  className="w-4 h-4"
                />
                <span className="text-sm font-normal text-white capitalize tracking-[-0.48px]">
                  Early Access Open!
                </span>
              </div>

              {/* Main Headline */}
              <h1
                className="text-4xl sm:text-5xl md:text-[64px] font-medium text-center leading-[1.125] md:leading-[72px] tracking-[-0.03em] mb-4 max-w-[651px]"
                style={{
                  background:
                    "linear-gradient(180deg, #FFF 63.12%, #A7A7A8 88.74%, #1B1B1E 104.3%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Still betting without AI?
              </h1>

              {/* Subtitle */}
              <p className="text-[#afafb6] text-base md:text-[18px] font-normal text-center leading-[24px] tracking-[-0.02em] mb-8 max-w-[283px]">
                The Future Of Autonomous AI Agents x Sports Is Here
              </p>

              {/* CTA Buttons */}
              <div className="flex items-center gap-3">
                <a
                  href="https://rainmaker-waitlist.vercel.app/waitlist"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-medium px-[12px] py-[6px] h-auto text-sm rounded-full">
                    Get Early Access
                  </Button>
                </a>
              </div>

              {/* ─── Animated KPIs (sequential, no panels) ─── */}
              <KpiRow />

              {/* Dashboard Preview */}
              <div className="mt-[48px] w-full max-w-[1150px] mx-auto pb-0 relative">
                {/* Cyan glow on top rim of dashboard */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: "-120px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "700px",
                    height: "300px",
                    background:
                      "radial-gradient(ellipse 100% 100% at 50% 80%, rgba(14, 165, 233, 0.30) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 75%)",
                    filter: "blur(50px)",
                    zIndex: 0,
                  }}
                />
                <img
                  src="/dashboard-glow.png"
                  alt=""
                  className="absolute pointer-events-none"
                  style={{
                    top: "-80%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "120%",
                    zIndex: 0,
                  }}
                />

                <div className="relative z-10 backdrop-blur-[9.9px] bg-[rgba(187,187,187,0.05)] border-t border-l border-r border-white/10 rounded-t-[24px] p-2 pb-0 overflow-hidden">
                  <div className="relative w-full rounded-t-[16px] overflow-hidden bg-[#0d1117]">
                    <Image
                      src="/dashboard-preview2.png"
                      alt="C9 Dashboard Preview"
                      width={1920}
                      quality={100}
                      height={1080}
                      className="w-full h-auto"
                      priority
                    />
                  </div>
                  {/* Fade-out at the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

{/* Sports logos removed */}

      {/* ─── Product Modules (bento) ─── */}
      <m.section id="products" className="py-12 md:py-20 bg-[#0a0a0c]" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}>
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <h2
            className="text-[32px] md:text-[40px] lg:text-[47px] font-medium text-center text-white mb-3 tracking-[-0.8px]"
            style={{
              background:
                "linear-gradient(180deg, #FFF 63.12%, #A7A7A8 88.74%, #1B1B1E 104.3%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            The Rainmaker Stack
          </h2>
          <p className="text-center text-[#afafb6] text-sm md:text-base mb-10 md:mb-16 max-w-md mx-auto">
            Autonomous trading, yield, and spending — one platform.
          </p>

          <div className="grid grid-cols-1 gap-5">
            {/* Neo — full width */}
            <m.div
              id="neo"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45 }}
              className="scroll-mt-24 bg-[#111113] border border-[#1e1e20] rounded-[20px] overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Card visual — 3D tilt on hover */}
                <div className="relative flex items-center justify-center p-8 md:p-12 min-h-[280px] md:min-h-[360px] overflow-hidden">
                  {/* Cyan glow behind card */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "500px",
                      height: "500px",
                      background:
                        "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(14, 165, 233, 0.25) 0%, rgba(14, 165, 233, 0.08) 40%, transparent 70%)",
                      filter: "blur(50px)",
                    }}
                  />
                  <TiltCard />
                </div>

                {/* Text */}
                <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/20 w-fit">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" />
                    Beta
                  </span>
                  <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                    Neo Card
                  </h3>
                  <p className="text-sm font-medium text-[#0ea5e9]/70 mt-1">
                    Earn Autonomously. Spend Anonymously.
                  </p>
                  <p className="mt-4 text-sm md:text-base leading-relaxed text-white/50 max-w-md">
                    Spin up a crypto Visa card to spend what you earn. No banks,
                    no KYC, no waiting.
                  </p>
                </div>
              </div>
            </m.div>

            {/* RainUSD — full width, visual layout */}
            <m.div
              id="rainusd"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="scroll-mt-24 relative bg-[#111113] border border-[#1e1e20] rounded-[20px] overflow-hidden"
            >
              {/* Background glow */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: "50%",
                  right: "0",
                  transform: "translateY(-50%)",
                  width: "400px",
                  height: "400px",
                  background:
                    "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(14, 165, 233, 0.12) 0%, transparent 70%)",
                  filter: "blur(60px)",
                }}
              />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-10 lg:p-12">
                {/* Text side */}
                <div className="flex flex-col justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/20 w-fit">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" />
                    Coming Soon
                  </span>
                  <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                    RainUSD
                  </h3>
                  <p className="text-sm font-medium text-[#0ea5e9]/70 mt-1">
                    Autonomous Banking
                  </p>
                  <p className="mt-4 text-sm md:text-base leading-relaxed text-white/50 max-w-md">
                    Our AI agents bet for you. Wins settle in RainUSD. Rewards
                    compound on top automatically. It also powers the Neo card —
                    spend profits while still earning on your balance.
                  </p>
                  <p className="mt-3 text-sm font-medium text-white/70">
                    Neobanks hold your money. We put it to work.
                  </p>
                </div>

                {/* Visual side — flywheel flow */}
                <div className="flex items-center justify-center">
                  <div className="flex flex-col gap-3 w-full max-w-[320px]">
                    {[
                      { step: "01", text: "Deposit USDC" },
                      { step: "02", text: "AI agents trade for you" },
                      { step: "03", text: "Wins settle in RainUSD" },
                      { step: "04", text: "Rewards compound automatically" },
                      { step: "05", text: "Spend with Neo card anytime" },
                    ].map((item) => (
                      <div
                        key={item.step}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#0ea5e9]/30 hover:bg-[#0ea5e9]/[0.04] hover:shadow-[0_0_20px_rgba(14,165,233,0.08)] cursor-default"
                      >
                        <span className="text-[#0ea5e9] text-xs font-mono font-bold opacity-60">
                          {item.step}
                        </span>
                        <span className="text-sm text-white/70">
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </m.div>
          </div>
        </div>
      </m.section>

      {/* Features Section */}
      <m.section id="product" className="py-12 md:py-16 bg-[#0a0a0c]" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}>
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center text-white mb-8 md:mb-16">
            How Rainmaker works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-4 lg:gap-6">
            {[
              {
                img: "/how-it-works1.png",
                title: "1. Connect your exchange",
                desc: "Link your funded Kalshi, Polymarket, or Novig account.",
              },
              {
                img: "/how-it-works2.png",
                title: "2. Choose your agent mode",
                desc: "Rainmaker handles the plays, odds, and timing.",
              },
              {
                img: "/how-it-works3.png",
                title: "3. Let C9 trade for you",
                desc: "Sit back while the system executes trades in real time.",
              },
              {
                img: "/how-it-works4.png",
                title: "4. Share your winnings",
                desc: "That\u2019s it. No more guesswork. A sharper edge is at your fingertips.",
              },
            ].map((f) => (
              <div key={f.title} className="flex flex-col">
                <div className="relative aspect-[4/3] w-full bg-[#101012] rounded-xl overflow-hidden mb-3 sm:mb-4">
                  <Image
                    src={f.img}
                    alt={f.title}
                    fill
                    quality={100}
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <h3 className="text-base sm:text-sm md:text-base font-semibold text-white mb-1">
                  {f.title}
                </h3>
                <p className="text-white/50 text-sm sm:text-xs md:text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </m.section>

      {/* FAQ Section */}
      <m.section id="faq" className="py-16 md:py-16 bg-[#0a0a0c]" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}>
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <h2 className="text-[32px] md:text-[40px] lg:text-[47px] font-medium text-white mb-12 md:mb-[71px] tracking-[-0.8px]">
            Frequently Asked Questions
          </h2>

          <div className="max-w-[1440px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
              {/* Left Column */}
              <div className="flex flex-col gap-3">
                <Accordion
                  type="single"
                  collapsible
                  defaultValue="legal"
                  className="flex flex-col gap-3"
                >
                  <AccordionItem
                    value="legal"
                    className="bg-[#111113] border border-[#1e1e20] rounded-[12px] overflow-hidden"
                  >
                    <AccordionTrigger className="text-white hover:no-underline">
                      Is Rainmaker legal?
                    </AccordionTrigger>
                    <AccordionContent className="text-[#919193] text-[16px] leading-[1.35] tracking-[-0.48px]">
                      Yes. You&apos;re simply authorizing an AI system to place
                      trades on your behalf using approved platforms like Kalshi,
                      Polymarket, and Novig.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="markets"
                    className="bg-[#111113] border border-[#1e1e20] rounded-[12px] overflow-hidden"
                  >
                    <AccordionTrigger className="text-white hover:no-underline">
                      Which markets are supported?
                    </AccordionTrigger>
                    <AccordionContent className="text-[#919193] text-[16px] leading-[1.35] tracking-[-0.48px]">
                      Rainmaker currently supports NFL, NBA, and NCAA markets
                      through Kalshi, Polymarket, and Novig exchanges.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="withdraw"
                    className="bg-[#111113] border border-[#1e1e20] rounded-[12px] overflow-hidden"
                  >
                    <AccordionTrigger className="text-white hover:no-underline">
                      Can I withdraw anytime?
                    </AccordionTrigger>
                    <AccordionContent className="text-[#919193] text-[16px] leading-[1.35] tracking-[-0.48px]">
                      Yes, you maintain full control over your funds. You can
                      withdraw from your exchange account at any time, subject to
                      the exchange&apos;s withdrawal policies.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-3">
                <Accordion
                  type="single"
                  collapsible
                  defaultValue="experience"
                  className="flex flex-col gap-3"
                >
                  <AccordionItem
                    value="experience"
                    className="bg-[#111113] border border-[#1e1e20] rounded-[12px] overflow-hidden"
                  >
                    <AccordionTrigger className="text-white hover:no-underline">
                      Do I need experience?
                    </AccordionTrigger>
                    <AccordionContent className="text-[#919193] text-[16px] leading-[1.35] tracking-[-0.48px]">
                      No. Rainmaker does everything — entries, exits, risk
                      management. You will need to make decisions on your trade
                      amounts.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="control"
                    className="bg-[#111113] border border-[#1e1e20] rounded-[12px] overflow-hidden"
                  >
                    <AccordionTrigger className="text-white hover:no-underline">
                      Do I keep full control?
                    </AccordionTrigger>
                    <AccordionContent className="text-[#919193] text-[16px] leading-[1.35] tracking-[-0.48px]">
                      Yes, you maintain full control over your account and funds.
                      Rainmaker executes trades based on your preferences and
                      risk settings, but you can pause or stop trading at any
                      time.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="start"
                    className="bg-[#111113] border border-[#1e1e20] rounded-[12px] overflow-hidden"
                  >
                    <AccordionTrigger className="text-white hover:no-underline">
                      What do I need to start?
                    </AccordionTrigger>
                    <AccordionContent className="text-[#919193] text-[16px] leading-[1.35] tracking-[-0.48px]">
                      You need a funded account on one of the supported exchanges
                      (Kalshi, Polymarket, or Novig) and to connect your wallet
                      for early access.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </div>
      </m.section>

      {/* Footer */}
      <m.footer className="bg-[#0a0a0c] border-t border-white/5 py-12 md:py-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5 }}>
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10 mb-12">
            {/* Logo and Description */}
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image
                  src="/rainmaker-logo-white.svg"
                  alt="Rainmaker"
                  width={28}
                  height={28}
                  className="w-7 h-7"
                />
                <span className="text-base font-medium text-white">
                  Rainmaker
                </span>
              </Link>
              <p className="text-white/50 text-sm leading-relaxed max-w-[280px]">
                The future of betting with AI. Smart predictions to boost your
                odds and win more.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="text-white font-medium text-sm mb-4">Navigate</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/"
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="#product"
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="#faq"
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    FAQs
                  </Link>
                </li>
                <li>
                  <a
                    href="https://rainmaker-waitlist.vercel.app/waitlist"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    Get Early Access
                  </a>
                </li>
                <li>
                  <Link
                    href="/rampup"
                    className="text-[#0ea5e9] hover:text-[#0ea5e9]/80 transition-colors text-sm font-medium"
                  >
                    Ramp Up Campaign
                  </Link>
                </li>
                <li>
                  <Link
                    href="/autopilot"
                    className="text-[#34d399] hover:text-[#34d399]/80 transition-colors text-sm font-medium"
                  >
                    AutoPilot Proposal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-white font-medium text-sm mb-4">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="#faq"
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    Help &amp; Support
                  </Link>
                </li>
                <li>
                  <a
                    href="https://x.com/rainmakerdotfun"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    Latest Updates
                  </a>
                </li>
                <li>
                  <a
                    href="https://rainmaker-waitlist.vercel.app/waitlist"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    Join Waitlist
                  </a>
                </li>
              </ul>
            </div>

            {/* Stay Connected */}
            <div>
              <h3 className="text-white font-medium text-sm mb-4">
                Stay Connected
              </h3>
              <div className="flex items-center gap-4">
                <a
                  href="https://x.com/rainmakerdotfun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="X (Twitter)"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://discord.gg/rainmakerdotfun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="Discord"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/40 text-sm">
              &copy; Rainmaker 2025. All Rights Reserved.
            </p>
            <div className="flex items-center gap-6" />
          </div>
        </div>
      </m.footer>
    </div>
  );
}
