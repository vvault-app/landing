"use client";

import React, { FormEvent, useMemo, useState } from "react";
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
import { ShimmerText } from "@/components/ui/shimmer-text";
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
    annual: 89,
    lifetime: 240,
  },
  ultra: {
    monthly: 24.99,
    annual: 249,
    lifetime: 690,
  },
};

const FEATURE_GROUPS: Array<{
  id: string;
  title: string;
  desc: string;
  items: Feature[];
}> = [
  {
    id: "campaign",
    title: "Campagne",
    desc: "Transforme les emails en placements.",
    items: [
      {
        icon: Mail,
        title: "Envois ciblés",
        desc: "Envoie des packs avec tracking propre et historique clair.",
      },
      {
        icon: Sparkles,
        title: "Relances au bon moment",
        desc: "Suis les écoutes et relance quand ça compte.",
      },
    ],
  },
  {
    id: "library",
    title: "Bibliothèque",
    desc: "Organise et collabore.",
    items: [
      {
        icon: Cloud,
        title: "Bibliothèque privée",
        desc: "Stocke tes beats, organise tes packs, garde les versions.",
      },
      {
        icon: ShieldCheck,
        title: "Collab fluide",
        desc: "Partage en interne, récupère les retours, reste aligné.",
      },
    ],
  },
  {
    id: "public-pages",
    title: "Pages publiques",
    desc: "Des liens qui font pro.",
    items: [
      {
        icon: ShoppingBag,
        title: "Vendre & gate",
        desc: "Vends tes kits ou gate les downloads en un flow clean.",
      },
      {
        icon: Sparkles,
        title: "Pages custom",
        desc: "Des pages publiques belles et rapides sur mobile.",
      },
    ],
  },
  {
    id: "analytics-contact",
    title: "Analytics & contacts",
    desc: "Suis les écoutes et garde le contexte.",
    items: [
      {
        icon: BarChart3,
        title: "Analytics profonds",
        desc: "Opens, écoutes, downloads, tendances en un coup d’œil.",
      },
      {
        icon: Mail,
        title: "Contacts",
        desc: "Centralise tes artistes et garde l’historique.",
      },
    ],
  },
];

function euro(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(v);
}

function euroNoDecimals(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
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
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        <ShimmerText className="text-white">{props.title}</ShimmerText>
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

  // UI
  const [billing, setBilling] = useState<Billing>("annual");

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
  }

  const proPrice =
    billing === "monthly"
      ? `${euro(PRICING.pro.monthly)}/mo`
      : billing === "annual"
      ? `${euro(PRICING.pro.annual / 12)}/mo`
      : `${euroNoDecimals(PRICING.pro.lifetime)} une fois`;

  const proSubLine =
    billing === "monthly"
      ? "Facturé mensuellement"
      : billing === "annual"
      ? `Facturé à l'année (${euro(PRICING.pro.annual)})`
      : "Accès à vie";

  const ultraPrice =
    billing === "monthly"
      ? `${euro(PRICING.ultra.monthly)}/mo`
      : billing === "annual"
      ? `${euro(PRICING.ultra.annual / 12)}/mo`
      : `${euroNoDecimals(PRICING.ultra.lifetime)} une fois`;

  const ultraSubLine =
    billing === "monthly"
      ? "Facturé mensuellement"
      : billing === "annual"
      ? `Facturé à l'année (${euro(PRICING.ultra.annual)})`
      : "Accès à vie";

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
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(90%_120%_at_100%_10%,rgba(255,255,255,0.045),transparent_60%),radial-gradient(120%_120%_at_0%_80%,rgba(255,255,255,0.03),transparent_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.98),transparent_22%,transparent_78%,rgba(0,0,0,0.98)),radial-gradient(120%_120%_at_50%_40%,transparent_35%,rgba(0,0,0,0.98)_100%)]" />
        <MotionDiv
          className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_70%)] blur-3xl opacity-45"
          animate={floatSlow}
          transition={floatSlowTransition}
        />
        <MotionDiv
          className="absolute -bottom-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_70%)] blur-3xl opacity-35"
          animate={floatMedium}
          transition={floatMediumTransition}
        />
        <MotionDiv
          className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_70%)] blur-2xl opacity-18"
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

          <div className="hidden items-center gap-3 sm:flex">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Features
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <a href="#campaign" className="hover:text-white">
                Campagne
              </a>
              <span className="text-white/20">/</span>
              <a href="#library" className="hover:text-white">
                Bibliothèque
              </a>
              <span className="text-white/20">/</span>
              <a href="#public-pages" className="hover:text-white">
                Pages publiques
              </a>
              <span className="text-white/20">/</span>
              <a href="#analytics-contact" className="hover:text-white">
                Analytics & contacts
              </a>
            </div>
            <span className="mx-1 h-4 w-px bg-white/10" />
            <a href="#pricing" className="text-xs font-semibold text-white/70 hover:text-white">
              Prix
            </a>
            <a href="#faq" className="text-xs font-semibold text-white/70 hover:text-white">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="accent" size="sm">
              <a href={buildAppUrl("/login")}>
                Se connecter
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
            <div className="inline-flex flex-wrap items-center justify-center gap-2">
              <Badge className="text-[11px] normal-case text-white/60" variant="outline">
                utilisé par 200+ producteurs
                <span className="relative ml-2 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
              </Badge>
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Arrête de te faire ghoster.
            </h1>

            <ShimmerText className="mt-3 block text-lg font-semibold leading-snug sm:text-2xl">
              <span className="block">Envoie tes packs de beats via un seul lien,</span>
              <span className="block">track écoutes & téléchargements, et relance au bon moment.</span>
            </ShimmerText>

            <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" variant="accent" className="w-full sm:w-auto">
                <a href={buildAppUrl("/signup", { plan: "free" })}>
                  Créer mon compte gratuitement
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mt-6" />
          </div>
        </motion.div>
      </div>

      {/* VIDEO */}
      <div className="relative z-10 mx-auto w-full max-w-5xl -mt-16 px-5 pb-12">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-[0_18px_70px_rgba(0,0,0,0.65)]">
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/DOlLUSW9s2s?rel=0&modestbranding=1&autoplay=1&mute=1&playsinline=1"
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
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-12">
        <Reveal>
          <SectionTitle
            id="features"
            kicker="Pensé pour les placements"
            title="Tout le workflow beatmaker, au même endroit"
            desc="Tout est organisé par moment-clé."
          />
        </Reveal>

        <div className="mt-8 space-y-10">
          {FEATURE_GROUPS.map((group, groupIndex) => (
            <div key={group.id} id={group.id} className="scroll-mt-28">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <ShimmerText className="text-lg font-semibold text-white sm:text-xl">
                    {group.title}
                  </ShimmerText>
                  <p className="mt-2 text-sm text-white/60">{group.desc}</p>
                </div>
                <div className="hidden h-px w-32 bg-white/10 sm:block" />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {group.items.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <Reveal
                      key={feature.title}
                      delay={0.1 + groupIndex * 0.06 + index * 0.05}
                      className="h-full"
                    >
                      <FeatureCard
                        icon={<Icon className="h-5 w-5" />}
                        title={feature.title}
                        desc={feature.desc}
                      />
                    </Reveal>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-12">
        <Reveal>
          <SectionTitle
            id="pricing"
            kicker="Simple & clair"
            title="Choisis ton plan — commence gratuit"
          desc="À l’inscription, tu démarres en Free. Tu upgrades seulement si tu veux envoyer / tracker / scaler."
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-6 flex w-full max-w-md items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
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

        <div className="mt-8 grid grid-cols-1 items-stretch gap-3 lg:grid-cols-3">
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
              subLine={proSubLine}
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
              subLine={ultraSubLine}
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
          <div className="mx-auto mt-6 max-w-3xl text-center text-xs text-white/45">
            Les prix affichés sont modifiables dans le config en haut du fichier.
            Pense à afficher “hors frais Stripe” partout où tu mentionnes 0% fees.
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-12">
        <Reveal>
          <SectionTitle
            id="faq"
            kicker="Questions fréquentes"
            title="FAQ"
            desc="Le but : te faire gagner du temps et augmenter tes chances de placements."
          />
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
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
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-12">
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
