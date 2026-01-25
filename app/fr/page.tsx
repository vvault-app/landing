"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Cloud,
  Mail,
  ShieldCheck,
  Sparkles,
  BadgeCheck,
  ShoppingBag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MotionDiv, Reveal } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";
type Billing = "monthly" | "annual" | "lifetime";

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
};

const APP_BASE = "https://vvault.app";
const BILLING_URL = "https://vvault.app/billing";

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

const HERO_STATS: Feature[] = [
  {
    icon: BarChart3,
    title: "Tracking réel",
    desc: "opens • temps d’écoute • downloads",
  },
  {
    icon: Cloud,
    title: "Packs & collabs",
    desc: "cloud privé • liens propres • série",
  },
  {
    icon: ShieldCheck,
    title: "Ventes sécurisées",
    desc: "paiement Stripe • Ultra: 0% fees vvault*",
  },
];

const FEATURES_PRIMARY: Feature[] = [
  {
    icon: BarChart3,
    title: "Analytics qui font gagner du temps",
    desc: "Suis qui ouvre, qui écoute, combien de temps, et qui télécharge — pour relancer au bon moment au lieu de “forcer au hasard”.",
  },
  {
    icon: Mail,
    title: "Envois & campagnes",
    desc: "Crée des packs, envoie à tes contacts, et garde l’historique. Pro = mass send. Ultra = scheduling au meilleur moment + envois individuels dans une campagne.",
  },
  {
    icon: ShoppingBag,
    title: "Vends tes drumkits & licences",
    desc: "Paiements sécurisés via Stripe. Pro = 5% de frais vvault. Ultra = 0% de frais vvault (hors Stripe).",
  },
];

const FEATURES_SECONDARY: Feature[] = [
  {
    icon: Cloud,
    title: "Workspace privé (cloud)",
    desc: "Stocke, organise, collabore. Free = 100MB. Pro/Ultra = usage sérieux (stockage large / illimité selon ta politique).",
  },
  {
    icon: ShieldCheck,
    title: "Liens propres & pages publiques",
    desc: "Partage tes packs avec une expérience clean. Ultra = domaine custom + couleur + QR auto + embed player.",
  },
  {
    icon: Sparkles,
    title: "Ultra = optimisation & scale",
    desc: "Compare tes campagnes, export CSV, et (bientôt) cohortes. Ultra te donne les outils pour comprendre ce qui marche et doubler dessus.",
  },
];

function euro(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(v);
}

function buildAppUrl(path: string, params?: Record<string, string>) {
  const url = new URL(path, APP_BASE);
  // UTMs de base (tu peux les changer)
  url.searchParams.set("utm_source", "get.vvault.app");
  url.searchParams.set("utm_medium", "landing");
  url.searchParams.set("utm_campaign", "default");

  // Paramètre d'onboarding (optionnel)
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
    <div className="mx-auto max-w-3xl scroll-mt-28 text-center" id={props.id}>
      {props.kicker ? (
        <Badge variant="soft">{props.kicker}</Badge>
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

function FeatureCard(props: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="p-6 shadow-[0_14px_55px_rgba(0,0,0,0.45)] transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-black/40 text-white/80">
          {props.icon}
        </div>
        <div className="text-base font-semibold text-white">{props.title}</div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/60">{props.desc}</p>
    </Card>
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
    <Card
      className={cn(
        "relative flex h-full flex-col overflow-hidden p-6 shadow-[0_18px_70px_rgba(0,0,0,0.55)] transition hover:-translate-y-1",
        props.highlight
          ? "border-white/25 bg-white/[0.07]"
          : "border-white/10 bg-white/[0.045]"
      )}
    >
      {props.highlight ? (
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      ) : null}

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-white">{props.name}</div>
          {props.badge ? (
            <Badge className="text-[10px] normal-case tracking-normal" variant="outline">
              {props.badge}
            </Badge>
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

        <Button
          asChild
          variant={props.highlight ? "accent" : "outline"}
          size="lg"
          className="mt-6 w-full"
        >
          <a href={props.ctaHref}>
            {props.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>

        <ul className="mt-6 flex-1 space-y-2 text-sm text-white/70">
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
    </Card>
  );
}

function FAQItem(props: { q: string; a: React.ReactNode }) {
  return (
    <details className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition hover:border-white/20">
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
  const easeInOut: [number, number, number, number] = [0.42, 0, 0.58, 1];

  // Newsletter / updates
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  // UI
  const [billing, setBilling] = useState<Billing>("monthly");

  const isLoading = status === "loading";

  const heroVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 12 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
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

  const floatSlow = prefersReducedMotion
    ? undefined
    : {
        x: [-80, 60, -50],
        y: [0, 40, -30],
      };
  const floatSlowTransition = prefersReducedMotion
    ? undefined
    : {
        duration: 24,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "mirror" as const,
      };
  const floatMedium = prefersReducedMotion
    ? undefined
    : {
        x: [0, -70, 30],
        y: [0, -40, 20],
      };
  const floatMediumTransition = prefersReducedMotion
    ? undefined
    : {
        duration: 28,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "mirror" as const,
      };
  const floatFast = prefersReducedMotion
    ? undefined
    : {
        x: [0, 50, -30],
        y: [0, -30, 20],
      };
  const floatFastTransition = prefersReducedMotion
    ? undefined
    : {
        duration: 20,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "mirror" as const,
      };

  return (
    <div className="group relative min-h-screen overflow-hidden bg-[#030305] text-white">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.08),transparent_60%),radial-gradient(90%_120%_at_100%_10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(120%_120%_at_0%_80%,rgba(255,255,255,0.04),transparent_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.95),transparent_22%,transparent_78%,rgba(0,0,0,0.95)),radial-gradient(120%_120%_at_50%_40%,transparent_35%,rgba(0,0,0,0.95)_100%)]" />
        <MotionDiv
          className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_70%)] blur-3xl opacity-60"
          animate={floatSlow}
          transition={floatSlowTransition}
        />
        <MotionDiv
          className="absolute -bottom-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_70%)] blur-3xl opacity-45"
          animate={floatMedium}
          transition={floatMediumTransition}
        />
        <MotionDiv
          className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1),transparent_70%)] blur-2xl opacity-25"
          animate={floatFast}
          transition={floatFastTransition}
        />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:120px_120px] animate-[grid-pan_70s_linear_infinite]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:3px_3px] mix-blend-soft-light animate-[grain-shift_14s_steps(10)_infinite]" />
      </div>

      {/* top nav */}
      <div className="fixed inset-x-0 top-4 z-30 px-4 sm:px-5">
        <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-3xl border border-white/10 bg-black/70 px-5 py-3 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
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
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <a href={buildAppUrl("/login")}>Se connecter</a>
            </Button>

            <Button asChild size="sm" variant="accent">
              <a href={buildAppUrl("/signup", { plan: "free" })}>
                Commencer gratuit
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-104px)] w-full max-w-6xl items-center px-5 pb-12 pt-24">
        <motion.div initial="hidden" animate="show" variants={heroVariants} className="w-full">
          <div className="mx-auto max-w-3xl text-center">
            {typeof waitlistCount === "number" ? (
              <div className="inline-flex flex-wrap items-center justify-center gap-2">
                <Badge className="text-[11px] normal-case" variant="accent">
                  {waitlistCount.toLocaleString()} producteurs inscrits
                </Badge>
              </div>
            ) : null}

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Envoie tes beats comme un pro.
              <span className="mt-3 block text-white/70">
                Packs + tracking + relances + ventes — en un seul lien.
              </span>
            </h1>

            <p className="mt-4 text-sm text-white/60 sm:text-base">
              vvault est ton workspace privé pour stocker, organiser, vendre et envoyer ta
              musique — avec des analytics détaillées pour savoir ce que les artistes font
              vraiment avec tes sons.
            </p>

            <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" variant="accent" className="w-full sm:w-auto">
                <a href={buildAppUrl("/signup", { plan: "free" })}>
                  Créer mon compte gratuitement
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              {HERO_STATS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.title} delay={index * 0.08} className="h-full">
                    <Card className="h-full px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs text-white/60">{item.desc}</div>
                    </Card>
                  </Reveal>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-white/45">
              * Hors frais Stripe. Les “fees vvault” = frais de marketplace / plateforme.
            </p>
          </div>
        </motion.div>
      </div>

      {/* VIDEO */}
      <div className="relative z-10 mx-auto w-full max-w-5xl -mt-20 px-5 pb-16">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-[0_18px_70px_rgba(0,0,0,0.65)]">
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
        </Reveal>
      </div>

      {/* FEATURES */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
        <Reveal>
          <SectionTitle
            id="features"
            kicker="Pensé pour les placements"
            title="Tout le workflow beatmaker, au même endroit"
            desc="Arrête d’envoyer des Drive links au hasard. vvault te donne un process clair : envoyer, mesurer, relancer, closer."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES_PRIMARY.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={0.1 + index * 0.08} className="h-full">
                <FeatureCard
                  icon={<Icon className="h-5 w-5" />}
                  title={feature.title}
                  desc={feature.desc}
                />
              </Reveal>
            );
          })}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES_SECONDARY.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={0.1 + index * 0.08} className="h-full">
                <FeatureCard
                  icon={<Icon className="h-5 w-5" />}
                  title={feature.title}
                  desc={feature.desc}
                />
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* PRICING */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
        <Reveal>
          <SectionTitle
            id="pricing"
            kicker="Simple & clair"
            title="Choisis ton plan — commence gratuit"
          desc="À l’inscription, tu démarres en Free. Tu upgrades seulement si tu veux envoyer / tracker / scaler."
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-8 flex w-full max-w-md items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
            {(["monthly", "annual", "lifetime"] as Billing[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                className={cn(
                  "flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition",
                  billing === b ? "bg-white text-black" : "text-white/70 hover:text-white"
                )}
              >
                {b === "monthly" ? "Mensuel" : b === "annual" ? "Annuel (-2 mois)" : "Lifetime"}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
          <Reveal delay={0.1} className="h-full">
            <PlanCard
              name="Free"
              badge="Pour tester"
              priceLine="0€"
              subLine="Commence gratuit"
              features={[
                "Extension Chrome : tracking des opens (type MailSuite)",
                "100MB de stockage",
                "Liste de contacts complète",
                "Génère des liens à partager",
              ]}
              ctaLabel="Commencer gratuitement"
              ctaHref={buildAppUrl("/signup", { plan: "free" })}
              footnote="Idéal pour setup ton workspace. Tu passes en Pro seulement si tu veux aller plus loin."
            />
          </Reveal>

          <Reveal delay={0.18} className="h-full">
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
              ctaHref={BILLING_URL}
              footnote="Recommandation : garde la limite 100MB seulement sur le TRIAL. En Pro payé, évite de bloquer l’upload."
            />
          </Reveal>

          <Reveal delay={0.26} className="h-full">
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
              ctaHref={BILLING_URL}
              footnote="Ultra = pour ceux qui vendent / envoient beaucoup, et veulent optimiser avec des stats + automation."
            />
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <div className="mx-auto mt-8 max-w-3xl text-center text-xs text-white/45">
            Les prix affichés sont modifiables dans le config en haut du fichier.
            Pense à afficher “hors frais Stripe” partout où tu mentionnes 0% fees.
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
        <Reveal>
          <SectionTitle
            id="faq"
            kicker="Questions fréquentes"
            title="FAQ"
            desc="Le but : te faire gagner du temps et augmenter tes chances de placements."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Reveal delay={0.05}>
            <FAQItem
              q="Est-ce que le Free plan est “trop limité” ?"
              a={
                <>
                  Non. Tu peux déjà centraliser tes packs, créer des liens propres et suivre les
                  retours de base. Tu upgrades seulement si tu veux industrialiser l’envoi ou les
                  analytics avancées.
                </>
              }
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FAQItem
              q="Le 0% fees sur Ultra, ça veut dire quoi ?"
              a={
                <>
                  Ça veut dire 0% de frais de marketplace vvault sur tes ventes.
                  Les frais Stripe restent applicables (comme partout).
                </>
              }
            />
          </Reveal>
          <Reveal delay={0.18}>
            <FAQItem
              q="Je peux vendre des drumkits ?"
              a={
                <>
                  Oui. Et tu as déjà mis tes kits sur vvault : c’est parfait.
                  Bonus : tu peux offrir 1 mois Pro à chaque acheteur pour les transformer en abonnés.
                </>
              }
            />
          </Reveal>
          <Reveal delay={0.24}>
            <FAQItem
              q="Je dois mettre une carte pour commencer ?"
              a={
                <>
                  Ça dépend de ton setup. Sans carte, tu maximises les inscriptions. Avec carte,
                  tu réduis le volume mais tu augmentes la qualité.
                </>
              }
            />
          </Reveal>
        </div>
      </section>

      {/* WAITING LIST */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
        <Reveal>
          <Card className="p-6">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-xl">
                <div className="text-lg font-semibold text-white">
                  Rejoins la waiting list
                </div>
                <p className="mt-1 text-sm text-white/60">
                  Accès anticipé, updates produit, et ressources pour placer plus de sons.
                </p>
              </div>

              <form onSubmit={handleSubmitNewsletter} className="w-full max-w-md">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="ton@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="whitespace-nowrap"
                    variant="accent"
                  >
                    {isLoading ? "En cours..." : "Rejoindre"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {message ? (
                  <p
                    className={cn(
                      "mt-3 text-sm",
                    status === "success" ? "text-white/70" : "text-red-400"
                    )}
                  >
                    {message}
                  </p>
                ) : null}
              </form>
            </div>
          </Card>
        </Reveal>

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
              Commencer gratuit
            </a>
          </div>
        </footer>
      </section>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full px-4 pb-4 sm:hidden">
        <Card className="bg-black/70 p-3 shadow-[0_12px_60px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-white/70">
              Commencer gratuit
              <div className="text-[11px] text-white/45">Upgrade seulement si besoin</div>
            </div>
            <Button asChild size="sm" variant="accent">
              <a href={buildAppUrl("/signup", { plan: "free" })}>
                Commencer gratuit
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
