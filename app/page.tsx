"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0, active: false });
  const [autoWarp, setAutoWarp] = useState({ x: 0, y: 0, active: false });
  const prefersReducedMotion = useReducedMotion();

  const isLoading = status === "loading";

  const heroVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 10 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" },
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
      if (typeof count === "number") {
        setWaitlistCount(count);
      }
    }

    loadWaitlistCount();

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

  return (
    <div
      className="group relative min-h-screen overflow-hidden bg-black text-white"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top, active: true });
      }}
      onMouseLeave={() => setMouse((prev) => ({ ...prev, active: false }))}
    >
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

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-6">
        <nav className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
            vvault
          </div>

          <a
            href="https://vvault.app"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white text-black px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Launch app
            <ArrowRight className="h-4 w-4" />
          </a>
        </nav>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-5xl items-center px-5 pb-16">
        <motion.div
          initial="hidden"
          animate="show"
          variants={heroVariants}
          className="w-full"
        >
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
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
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

      <div className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-20">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/60">
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
    </div>
  );
}
