"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Cloud,
  Mail,
  ShieldCheck,
  Timer,
  Sparkles,
  BadgeCheck,
  ShoppingBag,
} from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";
type Billing = "monthly" | "annual" | "lifetime";

const APP_BASE = "https://vvault.app";

/** 👇 Ajuste ici si besoin */
const PRICING = {
  pro: {
    monthly: 8.99,
    annual: 8.99 * 10, // 2 mois offerts (modifie si ton pricing réel est différent)
    lifetime: 8.99 * 36, // "3 ans pour toujours" (modifie si tu as un prix fixe)
  },
  ultra: {
    monthly: 24.99,
    annual: 24.99 * 10,
    lifetime: 24.99 * 36,
  },
};

function euro(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(v);
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function buildAppUrl(path: string, params?: Record<string, string>) {
  const url = new URL(path, APP_BASE);
  // UTMs de base (tu peux les changer)
  url.searchParams.set("utm_source", "get.vvault.app");
  url.searchParams.set("utm_medium", "landing");
  url.searchParams.set("utm_campaign", "default");

  // Essai Pro 7 jours auto à l'inscription (ton app doit gérer ce param)
  url.searchParams.set("trial", "pro7");

  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return url.toString();
}

function SectionTitle(props: {
  kicker?: string;
  title: string;
  desc?: string;
  id?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center" id={props.id}>
      {props.kicker ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
          <Sparkles className="h-3.5 w-3.5" />
          {props.kicker}
        </div>
      ) : null}
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {props.title}
      </h2>
      {props.desc ? (
        <p className="mt-3 text-sm text-white/60 sm:text-base">{props.desc}</p>
      ) : null}
    </div>
  );
}

function FeatureCard(props: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-black/40">
          {props.icon}
        </div>
        <div className="text-base font-semibold text-white">{props.title}</div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/60">{props.desc}</p>
    </div>
  );
}

function PlanCard(props: {
  name: string;
  badge?: string;
  priceLine: string;
  subLine?: string;
  highlight?: boolean;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  footnote?: string;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-3xl border p-6 shadow-[0_14px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl",
        props.highlight
          ? "border-white/25 bg-white/[0.06]"
          : "border-white/10 bg-white/[0.04]"
      )}
    >
      {props.highlight ? (
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      ) : null}

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-white">{props.name}</div>
          {props.badge ? (
            <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
              {props.badge}
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="text-3xl font-semibold tracking-tight text-white">
            {props.priceLine}
          </div>
          {props.subLine ? (
            <div className="mt-1 text-sm text-white/60">{props.subLine}</div>
          ) : null}
        </div>

        <a
          href={props.ctaHref}
          className={cx(
            "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition",
            props.highlight
              ? "bg-white text-black hover:-translate-y-0.5"
              : "border border-white/15 bg-black/30 text-white hover:-translate-y-0.5 hover:bg-black/40"
          )}
        >
          {props.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </a>

        <ul className="mt-6 space-y-2 text-sm text-white/70">
          {props.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {props.footnote ? (
          <p className="mt-5 text-xs text-white/45">{props.footnote}</p>
        ) : null}
      </div>
    </div>
  );
}

function FAQItem(props: { q: string; a: React.ReactNode }) {
  return (
    <details className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <summary className="cursor-pointer list-none text-sm font-semibold text-white/90">
        <div className="flex items-center justify-between gap-4">
          <span>{props.q}</span>
          <span className="text-white/40 transition group-open:rotate-45">+</span>
        </div>
      </summary>
      <div className="mt-3 text-sm leading-relaxed text-white/60">{props.a}</div>
    </details>
  );
}

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();

  // Newsletter / updates
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  // UI
  const [billing, setBilling] = useState<Billing>("monthly");
  const demoRef = useRef<HTMLDivElement | null>(null);

  // Background warp
  const [mouse, setMouse] = useState({ x: 0, y: 0, active: false });
  const [autoWarp, setAutoWarp] = useState({ x: 0, y: 0, active: false });

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

  // Count (optional social proof)
  useEffect(() => {
    let isMounted = true;

    async function loadWaitlistCount() {
      try {
        const { count } = await supabase
          .from("beta_waitlist")
          .select("*", { count: "exact", head: true });

        if (!isMounted) return;
        if (typeof count === "number") setWaitlistCount(count);
      } catch {
        // silent
      }
    }

    loadWaitlistCount();

    return () => {
      isMounted = false;
    };
  }, []);

  // auto warp background
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

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  async function handleSubmitNewsletter(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    const { error } = await supabase.from("beta_waitlist").insert([
      {
        email: cleanEmail,
        source: "get-vvault-newsletter",
      },
    ]);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (error.code === "23505" || msg.includes("duplicate")) {
        setStatus("success");
        setMessage("Déjà inscrit·e ✅");
        return;
      }
      setStatus("error");
      setMessage("Erreur. Réessaie dans un instant.");
      return;
    }

    setStatus("success");
    setMessage("Inscrit·e ✅ Tu recevras les updates et ressources.");
    setEmail("");
    setWaitlistCount((prev) => (typeof prev === "number" ? prev + 1 : prev));
  }

  const proPrice =
    billing === "monthly"
      ? `${euro(PRICING.pro.monthly)}/mois`
      : billing === "annual"
      ? `${euro(PRICING.pro.annual)}/an`
      : `${euro(PRICING.pro.lifetime)} une fois`;

  const ultraPrice =
    billing === "monthly"
      ? `${euro(PRICING.ultra.monthly)}/mois`
      : billing === "annual"
      ? `${euro(PRICING.ultra.annual)}/an`
      : `${euro(PRICING.ultra.lifetime)} une fois`;

  return (
    <div
      className="group relative min-h-screen overflow-hidden bg-black text-white"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouse({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          active: true,
        });
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

          <div className="hidden items-center gap-2 sm:flex">
            <a
              href="#features"
              className="rounded-full px-3 py-2 text-xs font-semibold text-white/70 hover:text-white"
            >
              Fonctionnalités
            </a>
            <a
              href="#pricing"
              className="rounded-full px-3 py-2 text-xs font-semibold text-white/70 hover:text-white"
            >
              Prix
            </a>
            <a
              href="#faq"
              className="rounded-full px-3 py-2 text-xs font-semibold text-white/70 hover:text-white"
            >
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={buildAppUrl("/login")}
              className="hidden rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black/40 sm:inline-flex"
            >
              Se connecter
            </a>

            <a
              href={buildAppUrl("/signup", { plan: "free" })}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Commencer gratuit
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-104px)] w-full max-w-6xl items-center px-5 pb-12">
        <motion.div initial="hidden" animate="show" variants={heroVariants} className="w-full">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
              Essai Pro 7 jours inclus
              {typeof waitlistCount === "number" ? (
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                  {waitlistCount.toLocaleString()} producteurs inscrits
                </span>
              ) : null}
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Envoie tes beats comme un pro.
              <span className="block text-white/70">
                Packs + tracking + relances + ventes — en un seul lien.
              </span>
            </h1>

            <p className="mt-4 text-sm text-white/60 sm:text-base">
              vvault est ton workspace privé pour stocker, organiser, vendre et envoyer ta
              musique — avec des analytics détaillées pour savoir ce que les artistes font
              vraiment avec tes sons.
            </p>

            <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={buildAppUrl("/signup", { plan: "free" })}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5"
              >
                Créer mon compte (Free + essai Pro)
                <ArrowRight className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={() => demoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/30 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black/40"
              >
                Voir la démo (90s)
                <Timer className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <BarChart3 className="h-4 w-4" />
                  Tracking réel
                </div>
                <div className="mt-1 text-xs text-white/60">
                  opens • temps d’écoute • downloads
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Cloud className="h-4 w-4" />
                  Packs & collabs
                </div>
                <div className="mt-1 text-xs text-white/60">
                  cloud privé • liens propres • série
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4" />
                  Ventes sécurisées
                </div>
                <div className="mt-1 text-xs text-white/60">
                  paiement Stripe • Ultra: 0% fees vvault*
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-white/45">
              * Hors frais Stripe. Les “fees vvault” = frais de marketplace / plateforme.
            </p>
          </div>
        </motion.div>
      </div>

      {/* VIDEO */}
      <div ref={demoRef} className="relative z-10 mx-auto w-full max-w-5xl px-5 -mt-20 pb-16">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-[0_14px_60px_rgba(0,0,0,0.65)]">
          <div className="aspect-video w-full">
            <iframe
              className="h-full w-full"
              src="https://www.youtube.com/embed/nKfITo6LLts?rel=0&modestbranding=1"
              title="vvault demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
        <SectionTitle
          id="features"
          kicker="Pensé pour les placements"
          title="Tout le workflow beatmaker, au même endroit"
          desc="Arrête d’envoyer des Drive links au hasard. vvault te donne un process clair : envoyer, mesurer, relancer, closer."
        />

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5 text-white/80" />}
            title="Analytics qui font gagner du temps"
            desc="Suis qui ouvre, qui écoute, combien de temps, et qui télécharge — pour relancer au bon moment au lieu de “forcer au hasard”."
          />
          <FeatureCard
            icon={<Mail className="h-5 w-5 text-white/80" />}
            title="Envois & campagnes"
            desc="Crée des packs, envoie à tes contacts, et garde l’historique. Pro = mass send. Ultra = scheduling au meilleur moment + envois individuels dans une campagne."
          />
          <FeatureCard
            icon={<ShoppingBag className="h-5 w-5 text-white/80" />}
            title="Vends tes drumkits & licences"
            desc="Paiements sécurisés via Stripe. Pro = 5% de frais vvault. Ultra = 0% de frais vvault (hors Stripe)."
          />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<Cloud className="h-5 w-5 text-white/80" />}
            title="Workspace privé (cloud)"
            desc="Stocke, organise, collabore. Free = 100MB. Pro/Ultra = usage sérieux (stockage large / illimité selon ta politique)."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5 text-white/80" />}
            title="Liens propres & pages publiques"
            desc="Partage tes packs avec une expérience clean. Ultra = domaine custom + couleur + QR auto + embed player."
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5 text-white/80" />}
            title="Ultra = optimisation & scale"
            desc="Compare tes campagnes, export CSV, et (bientôt) cohortes. Ultra te donne les outils pour comprendre ce qui marche et doubler dessus."
          />
        </div>
      </section>

      {/* PRICING */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
        <SectionTitle
          id="pricing"
          kicker="Simple & clair"
          title="Choisis ton plan — commence gratuit"
          desc="À l’inscription : Free + essai Pro 7 jours inclus. Tu upgrades seulement si tu veux envoyer / tracker / scaler."
        />

        <div className="mx-auto mt-8 flex w-full max-w-md items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
          {(["monthly", "annual", "lifetime"] as Billing[]).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBilling(b)}
              className={cx(
                "flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition",
                billing === b ? "bg-white text-black" : "text-white/70 hover:text-white"
              )}
            >
              {b === "monthly" ? "Mensuel" : b === "annual" ? "Annuel (-2 mois)" : "Lifetime"}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <PlanCard
            name="Free"
            badge="Pour tester"
            priceLine="0€"
            subLine="+ essai Pro 7 jours inclus"
            features={[
              "Extension Chrome : tracking des opens (type MailSuite)",
              "100MB de stockage",
              "Liste de contacts complète",
              "Génère des liens à partager",
            ]}
            ctaLabel="Commencer (Free + essai)"
            ctaHref={buildAppUrl("/signup", { plan: "free" })}
            footnote="Idéal pour setup ton workspace. Pendant l’essai Pro, tu testes l’envoi + analytics."
          />

          <PlanCard
            name="Pro"
            badge={billing === "annual" ? "2 mois offerts" : "Le plus populaire"}
            priceLine={proPrice}
            subLine="Placements & outreach sérieux"
            highlight
            features={[
              "Mass send emails (campagnes)",
              "Analytics approfondies",
              "Email/subscribe gate avant téléchargement gratuit",
              "Frais vvault : 5% sur les ventes (hors Stripe)",
              "Stockage large (recommandé: illimité/fair use en payé)",
            ]}
            ctaLabel="Démarrer Pro"
            ctaHref={buildAppUrl("/signup", { plan: "pro", billing })}
            footnote="Recommandation : garde la limite 100MB seulement sur le TRIAL. En Pro payé, évite de bloquer l’upload."
          />

          <PlanCard
            name="Ultra"
            badge="Pour scaler"
            priceLine={ultraPrice}
            subLine="Automation, branding & 0% fees vvault"
            features={[
              "Series",
              "Follow-up suggestions + profils d’écoute + “quoi envoyer”",
              "Scheduling : best time + envois individuels dans une campagne",
              "0% frais vvault sur les ventes (hors Stripe)",
              "Domaine custom + couleurs + QR auto + embed player",
              "Compare campagnes (tri + export) + export CSV",
            ]}
            ctaLabel="Passer Ultra"
            ctaHref={buildAppUrl("/signup", { plan: "ultra", billing })}
            footnote="Ultra = pour ceux qui vendent / envoient beaucoup, et veulent optimiser avec des stats + automation."
          />
        </div>

        <div className="mx-auto mt-8 max-w-3xl text-center text-xs text-white/45">
          Les prix affichés sont modifiables dans le config en haut du fichier.
          Pense à afficher “hors frais Stripe” partout où tu mentionnes 0% fees.
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
        <SectionTitle
          id="faq"
          kicker="Questions fréquentes"
          title="FAQ"
          desc="Le but : te faire gagner du temps et augmenter tes chances de placements."
        />

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FAQItem
            q="Est-ce que le Free plan est “trop limité” ?"
            a={
              <>
                Non, parce que tu as l’essai Pro 7 jours à l’inscription.
                Pendant l’essai, tu vois la magie (envoi + tracking), puis tu upgrades uniquement
                quand tu veux le faire sérieusement (mass send, analytics, automation).
              </>
            }
          />
          <FAQItem
            q="Le 0% fees sur Ultra, ça veut dire quoi ?"
            a={
              <>
                Ça veut dire 0% de frais de marketplace vvault sur tes ventes.
                Les frais Stripe restent applicables (comme partout).
              </>
            }
          />
          <FAQItem
            q="Je peux vendre des drumkits ?"
            a={
              <>
                Oui. Et tu as déjà mis tes kits sur vvault : c’est parfait.
                Bonus : tu peux offrir 1 mois Pro à chaque acheteur pour les transformer en abonnés.
              </>
            }
          />
          <FAQItem
            q="Je dois mettre une carte pour l’essai ?"
            a={
              <>
                Ça dépend de ton setup. Si tu peux, je te conseille “sans carte” pour maximiser
                les inscriptions. Si tu mets une carte, tu réduis le volume mais tu augmentes la qualité.
              </>
            }
          />
        </div>
      </section>

      {/* NEWSLETTER / UPDATES */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <div className="text-lg font-semibold text-white">
                Recevoir les updates & ressources
              </div>
              <p className="mt-1 text-sm text-white/60">
                Tips outreach, templates de relance, updates produit. (Tu peux te désinscrire à tout moment.)
              </p>
            </div>

            <form onSubmit={handleSubmitNewsletter} className="w-full max-w-md">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#121216] px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "En cours..." : "S’inscrire"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {message ? (
                <p
                  className={cx(
                    "mt-3 text-sm",
                    status === "success" ? "text-emerald-300" : "text-red-400"
                  )}
                >
                  {message}
                </p>
              ) : null}
            </form>
          </div>
        </div>

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 text-xs text-white/45 sm:flex-row">
          <div>© {new Date().getFullYear()} vvault</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-white/70" href="https://vvault.app/legal">
              Legal
            </a>
            <a className="hover:text-white/70" href={buildAppUrl("/login")}>
              Login
            </a>
            <a className="hover:text-white/70" href={buildAppUrl("/signup", { plan: "free" })}>
              Start free
            </a>
          </div>
        </footer>
      </section>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full px-4 pb-4 sm:hidden">
        <div className="rounded-3xl border border-white/10 bg-black/70 p-3 backdrop-blur-xl shadow-[0_12px_60px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-white/70">
              Essai Pro 7 jours inclus
              <div className="text-[11px] text-white/45">Commence gratuit → upgrade si besoin</div>
            </div>
            <a
              href={buildAppUrl("/signup", { plan: "free" })}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-black"
            >
              Commencer
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
