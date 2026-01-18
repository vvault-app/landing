"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

type BetaSpotDrop = {
  id: string;
  drop_date: string; // YYYY-MM-DD
  total_spots: number;
  spots_left: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function startOfTodayTs() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function dateTs(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatDropDate(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  const day = new Intl.DateTimeFormat("en-GB", { day: "2-digit" }).format(d);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(d);
  return `${day} ${month}`;
}

function getDropState(d: BetaSpotDrop) {
  const today = startOfTodayTs();
  const ts = dateTs(d.drop_date);

  const reached = ts <= today;
  const soldOut = d.spots_left <= 0;

  if (soldOut) return { kind: "soldout" as const, reached };
  if (reached) return { kind: "open" as const, reached };
  return { kind: "upcoming" as const, reached };
}

function dropAt18Local(isoDate: string) {
  return new Date(`${isoDate}T18:00:00`);
}

function getCountdownParts(target: Date) {
  const diffMs = target.getTime() - Date.now();
  const safe = Math.max(0, diffMs);

  const totalSec = Math.floor(safe / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return { diffMs, days, hours, minutes, seconds };
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  const [drops, setDrops] = useState<BetaSpotDrop[] | null>(null);
  const [dropsError, setDropsError] = useState<string | null>(null);

  const [mouse, setMouse] = useState({ x: 0, y: 0, active: false });
  const [autoWarp, setAutoWarp] = useState({ x: 0, y: 0, active: false });
  const prefersReducedMotion = useReducedMotion();

  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    active: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, active: false });

  const isLoading = status === "loading";

  const heroVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 10 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
      },
    }),
    [prefersReducedMotion]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadWaitlistCount() {
      const { count } = await supabase
        .from("beta_waitlist")
        .select("*", { count: "exact", head: true });

      if (!isMounted) return;
      if (typeof count === "number") setWaitlistCount(count);
    }

    async function loadDrops() {
      setDropsError(null);

      const { data, error } = await supabase
        .from("beta_spot_drops")
        .select("id, drop_date, total_spots, spots_left")
        .order("drop_date", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setDrops(null);
        setDropsError("Could not load schedule.");
        return;
      }

      setDrops((data || []) as BetaSpotDrop[]);
    }

    loadWaitlistCount();
    loadDrops();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      const x = Math.floor(Math.random() * window.innerWidth);
      const y = Math.floor(Math.random() * window.innerHeight);
      setAutoWarp({ x, y, active: true });

      window.setTimeout(() => {
        setAutoWarp((prev) => ({ ...prev, active: false }));
      }, 2000);
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [prefersReducedMotion]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    const { error } = await supabase.from("beta_waitlist").insert([
      {
        email: cleanEmail,
        source: "vvault-landing",
      },
    ]);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (error.code === "23505" || msg.includes("duplicate")) {
        setStatus("success");
        setMessage("You’re already in the vault.");
        return;
      }

      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      return;
    }

    setStatus("success");
    setMessage("You’re in. We’ll email you before the beta opens.");
    setEmail("");
    setWaitlistCount((prev) => (typeof prev === "number" ? prev + 1 : prev));
  }

  const nextOpenId = useMemo(() => {
    if (!drops?.length) return null;
    const today = startOfTodayTs();
    const open = drops.find((d) => dateTs(d.drop_date) <= today && d.spots_left > 0);
    return open?.id ?? null;
  }, [drops]);

  const nextUpcomingId = useMemo(() => {
    if (!drops?.length) return null;
    const now = Date.now();
    const upcoming = drops.find((d) => dropAt18Local(d.drop_date).getTime() > now);
    return upcoming?.id ?? null;
  }, [drops]);

  const nextHighlightId = nextOpenId ?? nextUpcomingId ?? null;

  const nextUpcomingDrop = useMemo(() => {
    if (!drops?.length) return null;
    const now = Date.now();
    const d = drops.find((x) => dropAt18Local(x.drop_date).getTime() > now);
    return d ?? null;
  }, [drops]);

  useEffect(() => {
    if (!nextUpcomingDrop) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, active: false });
      return;
    }

    const target = dropAt18Local(nextUpcomingDrop.drop_date);

    const tick = () => {
      const parts = getCountdownParts(target);
      setCountdown({
        days: parts.days,
        hours: parts.hours,
        minutes: parts.minutes,
        seconds: parts.seconds,
        active: parts.diffMs > 0,
      });
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextUpcomingDrop?.id, nextUpcomingDrop?.drop_date]);

  return (
    <div
      className="group relative min-h-screen overflow-hidden bg-black text-white"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top, active: true });
      }}
      onMouseLeave={() => setMouse((prev) => ({ ...prev, active: false }))}
    >
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-200"
          style={{
            opacity: mouse.active ? 0.25 : 0,
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            transform: "scale(1.04)",
            WebkitMaskImage: `radial-gradient(220px 220px at ${mouse.x}px ${mouse.y}px, rgba(0,0,0,1), transparent 70%)`,
            maskImage: `radial-gradient(220px 220px at ${mouse.x}px ${mouse.y}px, rgba(0,0,0,1), transparent 70%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-[1400ms]"
          style={{
            opacity: autoWarp.active ? 0.18 : 0,
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.75) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.75) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            transform: "scale(1.05)",
            WebkitMaskImage: `radial-gradient(240px 240px at ${autoWarp.x}px ${autoWarp.y}px, rgba(0,0,0,1), transparent 72%)`,
            maskImage: `radial-gradient(240px 240px at ${autoWarp.x}px ${autoWarp.y}px, rgba(0,0,0,1), transparent 72%)`,
          }}
        />
      </div>

      {/* top nav */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-6">
        <nav className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
            vvault
          </div>

          <a
            href="https://vvault.app"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Launch app
            <ArrowRight className="h-4 w-4" />
          </a>
        </nav>
      </div>

      {/* HERO (restored spacing like the old page: one full screen block) */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-104px)] w-full max-w-5xl items-center px-5 pb-12">
        <motion.div initial="hidden" animate="show" variants={heroVariants} className="w-full">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
              Public beta
              {typeof waitlistCount === "number" ? (
                <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                  {waitlistCount.toLocaleString()} on the waitlist
                </span>
              ) : null}
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Get early access to vvault.
            </h1>

            <p className="mt-3 text-sm text-white/60 sm:text-base">
              Drop your email to claim a spot and get notified before the beta opens.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mx-auto mt-10 w-full max-w-xl">
            <motion.div
              className="flex flex-col items-stretch gap-3 rounded-3xl border border-white/15 bg-white/[0.04] p-3 sm:flex-row sm:items-center"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            >
              <input
                id="email"
                type="email"
                required
                placeholder="address@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#121216] px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Joining..." : "Reserve my spot"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            {message ? (
              <p
                className={`mt-4 text-center text-sm ${
                  status === "success" ? "text-emerald-300" : "text-red-400"
                }`}
              >
                {message}
              </p>
            ) : null}
          </form>
        </motion.div>
      </div>

      {/* VIDEO (moved BEFORE schedule) */}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-5 -mt-20 pb-10">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-[0_14px_60px_rgba(0,0,0,0.65)]">
          <div className="aspect-video w-full">
            <iframe
              className="h-full w-full"
              src="https://www.youtube.com/embed/nKfITo6LLts?si=-K8Hf5CgOu8ICM0G"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      {/* SCHEDULE (spacing restored: sits clearly under video, not cramped into hero) */}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-20">
        <div className="rounded-3xl bg-[#070709] shadow-[0_14px_60px_rgba(0,0,0,0.65)] overflow-hidden border border-white/10">
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="text-sm font-semibold text-white/90">Beta spots schedule</div>
            {dropsError ? <div className="mt-2 text-xs text-red-300">{dropsError}</div> : null}
          </div>

          <div className="h-px w-full bg-white/10" />

          {drops === null && !dropsError ? (
            <div className="p-4 sm:p-5 space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-11 rounded-2xl bg-[#121216] animate-pulse" />
              ))}
            </div>
          ) : null}

          {drops && drops.length > 0 ? (
            <div className="p-4 sm:p-5 space-y-2">
              {drops.map((d, idx) => {
                const state = getDropState(d);
                const isSoldOut = state.kind === "soldout";

                const sold = clamp(d.total_spots - d.spots_left, 0, d.total_spots);
                const ratio = d.total_spots > 0 ? sold / d.total_spots : 0;

                const isHighlight = nextHighlightId === d.id;

                const rowBg = isHighlight ? "bg-[#111114]" : "bg-[#0d0d10]";
                const dim = isSoldOut ? "opacity-35 saturate-0" : "opacity-100";

                const shadow = isHighlight
                  ? "shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_24px_80px_rgba(0,0,0,0.7)]"
                  : "";

                const pill =
                  state.kind === "soldout"
                    ? { text: "Sold out", cls: "bg-[#2a1216] text-red-300" }
                    : state.kind === "upcoming"
                    ? { text: "Upcoming", cls: "bg-[#141418] text-white/70" }
                    : { text: `${d.spots_left} left`, cls: "bg-[#141418] text-white/90" };

                const showCountdown =
                  isHighlight &&
                  state.kind === "upcoming" &&
                  nextUpcomingDrop?.id === d.id &&
                  countdown.active;

                const trackH = isHighlight ? "h-2" : "h-1.5";

                return (
                  <motion.div
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut", delay: idx * 0.02 }}
                    whileHover={{ y: prefersReducedMotion ? 0 : -1 }}
                    className={`rounded-2xl ${rowBg} ${dim} ${shadow} px-4 py-3`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="min-w-[190px]">
                        <div
                          className={`font-semibold leading-none ${
                            isHighlight ? "text-base text-white" : "text-sm text-white/90"
                          }`}
                        >
                          {formatDropDate(d.drop_date)}
                          <span
                            className={`ml-2 font-medium ${
                              isHighlight ? "text-white/55" : "text-white/45"
                            }`}
                          >
                            · {d.total_spots} spots
                          </span>
                        </div>

                        {showCountdown ? (
                          <div className="mt-2 text-sm text-white/80">
                            Drops in{" "}
                            <span className="font-semibold text-white">
                              {countdown.days}d {pad2(countdown.hours)}:{pad2(countdown.minutes)}:
                              {pad2(countdown.seconds)}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex-1">
                        <div className={`w-full overflow-hidden rounded-full bg-[#050506] ${trackH}`}>
                          {isHighlight ? (
                            <motion.div
                              className="h-full rounded-full"
                              initial={false}
                              animate={
                                prefersReducedMotion
                                  ? { width: `${Math.round(ratio * 100)}%` }
                                  : {
                                      width: `${Math.round(ratio * 100)}%`,
                                      backgroundPosition: ["0% 50%", "120% 50%"],
                                    }
                              }
                              transition={
                                prefersReducedMotion
                                  ? { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
                                  : {
                                      width: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                                      backgroundPosition: {
                                        duration: 2.6,
                                        repeat: Infinity,
                                        ease: "linear",
                                      },
                                    }
                              }
                              style={{
                                backgroundImage:
                                  "linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.58), rgba(30,30,30,0.95), rgba(255,255,255,0.85), rgba(0,0,0,0.9), rgba(255,255,255,0.95))",
                                backgroundSize: "260% 100%",
                                backgroundPosition: "0% 50%",
                              }}
                            />
                          ) : (
                            <motion.div
                              className="h-full rounded-full bg-white/45"
                              initial={false}
                              animate={{ width: `${Math.round(ratio * 100)}%` }}
                              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${pill.cls}`}
                        >
                          {pill.text}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : null}

          {drops && drops.length === 0 && !dropsError ? (
            <div className="px-5 py-5 text-sm text-white/60">Schedule will appear here soon.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
