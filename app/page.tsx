// app/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Status = "idle" | "loading" | "success" | "error";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

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
      if (
        error.code === "23505" ||
        error.message.toLowerCase().includes("duplicate")
      ) {
        setStatus("success");
        setMessage("You’re already in the vault. 🎧");
        return;
      }

      console.error(error);
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      return;
    }

    setStatus("success");
    setMessage("You’re in. We’ll email you before the beta opens.");
    setEmail("");
  }

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-[#050509] text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        {/* Top bar / logo */}
        <header className="mb-12 flex items-center justify-between">
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-[0.22em] uppercase text-slate-300">
              VVAULT
            </span>
            <span className="text-xs text-slate-500">
              store • send • track
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* PRIVATE BETA pill with same color as Campaigns pill */}
            <span className="rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] bg-lime-400/10 text-lime-300 border border-lime-400/40">
              PRIVATE BETA
            </span>

            <span className="text-[11px] text-slate-500">
              Built for producers & artists
            </span>
          </div>
        </header>

        {/* Main content */}
        <main className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
          {/* Left side: hero + form */}
          <section className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
                The{" "}
                <span className="text-slate-100 underline decoration-slate-500/70 decoration-[1px] underline-offset-4">
                  proper way
                </span>{" "}
                to send your music.
              </h1>

              <p className="text-sm sm:text-base text-slate-400 max-w-lg">
                vvault is the complete solution to{" "}
                <span className="text-slate-300">
                  store and organize your beats & songs
                </span>
                , <span className="text-slate-300">mass send to artists</span>,
                and track who actually opens, and downloads.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="mt-4 flex flex-col sm:flex-row gap-3"
            >
              <div className="flex-1">
                <label
                  htmlFor="email"
                  className="mb-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500"
                >
                  Join the private beta
                </label>

                <input
                  id="email"
                  type="email"
                  required
                  placeholder="adress@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-[#0A0A10] border border-slate-800 px-4 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-slate-400 focus:ring-1 focus:ring-slate-500/70 transition"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 text-slate-900 text-sm font-medium px-5 py-2.5 whitespace-nowrap border border-slate-200 hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {isLoading ? "Joining..." : "Apply"}

                  {/* Neon pulse using same lime color */}
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-lime-300 opacity-75 animate-ping"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-300"></span>
                  </span>
                </button>
              </div>
            </form>

            {/* Status message */}
            {message && (
              <p
                className={`text-xs sm:text-sm ${
                  status === "success" ? "text-lime-300" : "text-red-400"
                }`}
              >
                {message}
              </p>
            )}
          </section>

          {/* Right side: product bullets */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-[#07070D] p-4">
              <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 mb-3">
                What vvault does
              </h2>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>
                    Store and organize all your beats & songs with auto BPM and key detection.
                  </span>
                </li>

                <li className="flex gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>
                    Build packs and send them to multiple artists in one go{" "}
                    <span className="italic text-slate-500">(without bcc)</span>.
                  </span>
                </li>

                <li className="flex gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>
                    Track opens, link clicks and file downloads per contact.
                  </span>
                </li>

                <li className="flex gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>
                    Get detailed analytics and insights on when to send your tracks.
                  </span>
                </li>

                <li className="flex gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>
                    Chrome extension for Gmail: add tracking without changing how you write emails.
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
  
}
