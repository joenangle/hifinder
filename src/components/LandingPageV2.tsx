"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { ArrowRight, SlidersHorizontal, ShoppingBag, Layers, BookOpen, ChevronDown } from "lucide-react";

interface SiteStats {
  components: number;
  listings: number;
  budgetRange: { min: number; max: number };
}

export function LandingPageV2() {
  const [stats, setStats] = useState<SiteStats>({
    components: 579,
    listings: 316,
    budgetRange: { min: 20, max: 10000 },
  });
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: "var(--background-primary)" }}>

      {/* ─────────────────────────────────────────
          HERO — full-bleed, split layout
      ───────────────────────────────────────── */}
      <section
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Background grid texture */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
        {/* Radial fade over grid */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, var(--background-primary) 40%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        <div
          className="container mx-auto px-6"
          style={{ maxWidth: "1100px", position: "relative", zIndex: 1 }}
        >
          <div className="grid lg:grid-cols-[1fr_440px] gap-12 items-center">

            {/* ── Left copy ── */}
            <div>
              {/* Eyebrow */}
              <div
                className="inline-flex items-center gap-2 mb-8"
                style={{
                  background: "var(--background-secondary)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "999px",
                  padding: "6px 14px",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent-primary)",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--text-secondary)", letterSpacing: "0.04em" }}
                >
                  Audio gear, simplified
                </span>
              </div>

              {/* Headline */}
              <h1
                className="font-bold"
                style={{
                  fontSize: "clamp(2.75rem, 6vw, 5rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.04em",
                  color: "var(--text-primary)",
                  marginBottom: "1.5rem",
                }}
              >
                Listen better.
                <br />
                <span
                  style={{
                    WebkitTextStroke: "2px var(--text-primary)",
                    color: "transparent",
                  }}
                >
                  Spend smarter.
                </span>
              </h1>

              {/* Sub */}
              <p
                style={{
                  fontSize: "1.125rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.75,
                  maxWidth: "460px",
                  marginBottom: "2.5rem",
                }}
              >
                HiFinder matches you with audio gear that suits your ears, your budget, and
                the way you actually listen — no forums, no guesswork.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3" style={{ marginBottom: "3rem" }}>
                <Link
                  href="/recommendations"
                  className="inline-flex items-center gap-2 font-semibold transition-all duration-150 group"
                  style={{
                    background: "var(--text-primary)",
                    color: "var(--background-primary)",
                    padding: "14px 24px",
                    borderRadius: "12px",
                    fontSize: "0.9375rem",
                  }}
                  onClick={() =>
                    trackEvent({ name: "hero_cta_clicked", properties: { location: "hero_primary" } })
                  }
                >
                  Find my setup
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  href="/learn"
                  className="inline-flex items-center gap-2 font-medium transition-all duration-150"
                  style={{
                    color: "var(--text-secondary)",
                    padding: "14px 24px",
                    borderRadius: "12px",
                    fontSize: "0.9375rem",
                    border: "1px solid var(--border-default)",
                    background: "transparent",
                  }}
                  onClick={() =>
                    trackEvent({ name: "learn_clicked", properties: { location: "hero_secondary" } })
                  }
                >
                  Learn the basics
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8">
                {[
                  { n: `${stats.components}+`, label: "Components indexed" },
                  { n: `${stats.listings}+`, label: "Used listings" },
                  { n: "Free", label: "No account needed" },
                ].map((s) => (
                  <div key={s.label}>
                    <div
                      className="font-semibold"
                      style={{
                        fontSize: "1.1rem",
                        color: "var(--text-primary)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.n}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)", marginTop: "2px" }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right image ── */}
            <div className="hidden lg:block relative">
              {/* Accent square behind */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: "12%",
                  right: "-8%",
                  width: "80%",
                  height: "80%",
                  borderRadius: "24px",
                  background: `rgba(var(--accent-primary-rgb), 0.08)`,
                  border: `1px solid rgba(var(--accent-primary-rgb), 0.15)`,
                }}
              />
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  boxShadow: "0 40px 80px -20px rgba(0,0,0,0.22), 0 0 0 1px var(--border-subtle)",
                }}
              >
                <Image
                  src="/images/hero-headphones.webp"
                  alt="Premium audio headphones"
                  width={880}
                  height={580}
                  className="w-full h-auto object-cover"
                  priority
                  style={{ display: "block" }}
                />
              </div>
              {/* Photo credit */}
              <p
                className="text-xs mt-2 text-right"
                style={{ color: "var(--text-tertiary)" }}
              >
                Photo:{" "}
                <a
                  href="https://www.flickr.com/photos/fourfridays/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--text-tertiary)" }}
                  className="hover:underline"
                >
                  Umair Abassi
                </a>
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          MARQUEE STRIP — thin social proof line
      ───────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--background-secondary)",
          padding: "14px 0",
          overflow: "hidden",
        }}
      >
        <div
          className="flex items-center gap-12 px-8"
          style={{ color: "var(--text-tertiary)", fontSize: "0.8rem", letterSpacing: "0.06em" }}
        >
          {["HEADPHONES", "IEMS", "DACS", "AMPLIFIERS", "CABLES", "SOURCES", "STACKS", "USED MARKET"].map(
            (t, i) => (
              <span key={t} className="whitespace-nowrap flex items-center gap-12">
                {i > 0 && (
                  <span aria-hidden style={{ opacity: 0.35 }}>
                    /
                  </span>
                )}
                {t}
              </span>
            )
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────
          FEATURES — horizontal scroll on mobile,
          2x2 editorial grid on desktop
      ───────────────────────────────────────── */}
      <section style={{ padding: "100px 0" }}>
        <div className="container mx-auto px-6" style={{ maxWidth: "1100px" }}>

          {/* Section label */}
          <p
            className="text-xs font-semibold mb-6"
            style={{
              color: "var(--accent-primary)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            What HiFinder does
          </p>

          <div className="grid lg:grid-cols-2 gap-6">
            {[
              {
                icon: <SlidersHorizontal className="h-5 w-5" />,
                title: "Smart Recommendations",
                description:
                  "Answer a few questions about how you listen and what you own. We surface gear that genuinely fits — ranked by measurements, synergy, and budget.",
                href: "/recommendations",
                tag: "Most used",
              },
              {
                icon: <Layers className="h-5 w-5" />,
                title: "Stack Builder",
                description:
                  "Build a full chain — source, DAC, amp, headphones. See how the components pair, where the bottlenecks are, and what a complete system costs.",
                href: "/dashboard?tab=stacks",
                tag: null,
              },
              {
                icon: <ShoppingBag className="h-5 w-5" />,
                title: "Used Market",
                description:
                  "Browse aggregated listings from communities and resellers. Save searches, track price history, get alerts when something you want drops.",
                href: "/marketplace",
                tag: null,
              },
              {
                icon: <BookOpen className="h-5 w-5" />,
                title: "Learn the Basics",
                description:
                  "Not sure what a DAC does or why impedance matters? Our guides are written for people who want better sound — not audio engineers.",
                href: "/learn",
                tag: null,
              },
            ].map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="group block"
                style={{
                  background: "var(--background-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "16px",
                  padding: "32px",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px -8px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
                onClick={() =>
                  trackEvent({
                    name: "feature_clicked",
                    properties: { feature: f.title.toLowerCase().replace(/ /g, "_") },
                  })
                }
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "10px",
                      background: "var(--background-primary)",
                      border: "1px solid var(--border-default)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {f.icon}
                  </div>
                  {f.tag && (
                    <span
                      className="text-xs font-medium"
                      style={{
                        background: `rgba(var(--accent-primary-rgb), 0.1)`,
                        color: "var(--accent-primary)",
                        padding: "4px 10px",
                        borderRadius: "999px",
                      }}
                    >
                      {f.tag}
                    </span>
                  )}
                </div>

                <h3
                  className="font-semibold mb-2"
                  style={{ fontSize: "1.0625rem", color: "var(--text-primary)", lineHeight: 1.3 }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
                >
                  {f.description}
                </p>

                <div
                  className="flex items-center gap-1 mt-6 text-sm font-medium"
                  style={{
                    color: "var(--text-tertiary)",
                    transition: "color 0.15s, gap 0.15s",
                  }}
                >
                  <span className="group-hover:text-[var(--text-primary)] transition-colors duration-150">
                    Explore
                  </span>
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-all duration-150 group-hover:translate-x-1 group-hover:text-[var(--text-primary)]"
                  />
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────
          HOW IT WORKS — 3-step inline row
      ───────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "80px 0",
          background: "var(--background-secondary)",
        }}
      >
        <div className="container mx-auto px-6" style={{ maxWidth: "1100px" }}>

          <p
            className="text-xs font-semibold mb-10"
            style={{
              color: "var(--accent-primary)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            How it works
          </p>

          <div className="grid sm:grid-cols-3 gap-0">
            {[
              {
                step: "01",
                title: "Tell us how you listen",
                body: "Headphones at home, IEMs at the gym, or both? We ask a handful of questions about your habits, budget, and gear.",
              },
              {
                step: "02",
                title: "We match gear to you",
                body: "Our system cross-references measurements, user reviews, and synergy data to rank real options — not affiliate-stuffed lists.",
              },
              {
                step: "03",
                title: "Build, track, and upgrade",
                body: "Save your setup, monitor used market prices, and get alerts when a better deal surfaces for gear on your wishlist.",
              },
            ].map((s, i) => (
              <div
                key={s.step}
                style={{
                  padding: "0 40px 0 0",
                  borderLeft: i > 0 ? "1px solid var(--border-subtle)" : "none",
                  paddingLeft: i > 0 ? "40px" : "0",
                  marginLeft: i > 0 ? "0" : "0",
                }}
              >
                <span
                  className="font-bold block mb-4"
                  style={{
                    fontSize: "2.5rem",
                    color: "var(--border-default)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {s.step}
                </span>
                <h3
                  className="font-semibold mb-2"
                  style={{ fontSize: "1rem", color: "var(--text-primary)", lineHeight: 1.3 }}
                >
                  {s.title}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────
          BOTTOM CTA — full bleed, editorial
      ───────────────────────────────────────── */}
      <section style={{ padding: "120px 0" }}>
        <div className="container mx-auto px-6" style={{ maxWidth: "1100px" }}>
          <div style={{ maxWidth: "640px" }}>
            <h2
              className="font-bold"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
                color: "var(--text-primary)",
                marginBottom: "1.5rem",
              }}
            >
              Stop reading forums.
              <br />
              <span style={{ color: "var(--text-tertiary)" }}>Start listening better.</span>
            </h2>
            <p
              style={{
                fontSize: "1.0625rem",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                marginBottom: "2.5rem",
                maxWidth: "480px",
              }}
            >
              HiFinder is free, no account required. Get a personalized recommendation
              in under two minutes.
            </p>
            <Link
              href="/recommendations"
              className="inline-flex items-center gap-2 font-semibold transition-all duration-150 group"
              style={{
                background: "var(--accent-primary)",
                color: "var(--text-inverse)",
                padding: "15px 28px",
                borderRadius: "12px",
                fontSize: "0.9375rem",
                boxShadow: `0 4px 20px rgba(var(--accent-primary-rgb), 0.3)`,
                textDecoration: "none",
              }}
              onClick={() =>
                trackEvent({ name: "final_cta_clicked", properties: { location: "bottom_cta" } })
              }
            >
              Get my recommendation
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          FLOATING BOTTOM BAR
      ───────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: `translateX(-50%) translateY(${pastHero ? "120%" : "0"})`,
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s",
          opacity: pastHero ? 0 : 1,
          zIndex: 50,
          pointerEvents: pastHero ? "none" : "auto",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "var(--background-primary)",
          border: "1px solid var(--border-default)",
          borderRadius: "999px",
          padding: "10px 10px 10px 20px",
          boxShadow: "0 8px 32px -4px rgba(0,0,0,0.18), 0 0 0 1px var(--border-subtle)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span
          className="text-sm font-medium whitespace-nowrap"
          style={{ color: "var(--text-secondary)" }}
        >
          Scroll to explore
        </span>
        <button
          aria-label="Scroll down"
          onClick={() => window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" })}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--background-secondary)",
            border: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-secondary)",
            flexShrink: 0,
          }}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <Link
          href="/recommendations"
          className="inline-flex items-center gap-2 font-semibold text-sm whitespace-nowrap"
          style={{
            background: "var(--text-primary)",
            color: "var(--background-primary)",
            padding: "8px 18px",
            borderRadius: "999px",
            textDecoration: "none",
          }}
          onClick={() =>
            trackEvent({ name: "hero_cta_clicked", properties: { location: "floating_bar" } })
          }
        >
          Find my setup
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

    </div>
  );
}
