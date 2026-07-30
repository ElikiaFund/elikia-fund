import { Landmark, ShieldCheck, Users, Wallet, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CreditScoreGauge } from "@/components/credit-score-gauge";
import { FeatureCard } from "@/components/feature-card";
import { CashflowMock } from "@/components/phone-mockup/cashflow-mock";
import { CreditScoreMock } from "@/components/phone-mockup/credit-score-mock";
import { PhoneFrame } from "@/components/phone-mockup/phone-frame";
import { TontineMock } from "@/components/phone-mockup/tontine-mock";
import { VaultMock } from "@/components/phone-mockup/vault-mock";
import { SectionHeading } from "@/components/section-heading";
import { SectorGrid } from "@/components/sector-grid";
import { StoreBadges } from "@/components/store-badges";
import { VerdictBadge } from "@/components/verdict-badge";
import { WaitlistCta } from "@/components/waitlist-cta";
import { CREDIT_SCORE_FACTORS } from "@/lib/credit-score-content";
import { buildMetadata } from "@/lib/metadata";
import { TAGLINE, TONTINE_FEE_PERCENT } from "@/lib/constants";

export const metadata: Metadata = buildMetadata({
  title: "Trésorerie, épargne et tontines pour entrepreneurs informels",
  path: "/",
});

const FEATURES = [
  {
    icon: Wallet,
    title: "Trésorerie",
    description:
      "Suivez vos revenus et dépenses par catégorie, même hors connexion, et gardez toujours votre solde net sous les yeux.",
  },
  {
    icon: ShieldCheck,
    title: "Coffre",
    description: "Mettez de l'argent de côté dans un coffre protégé par code PIN, séparé de vos dépenses courantes.",
  },
  {
    icon: Users,
    title: "Tontines",
    description: `Créez ou rejoignez un groupe d'épargne par code d'invitation. Des frais de gestion de ${TONTINE_FEE_PERCENT} % sont prélevés sur chaque cotisation, toujours affichés en toute transparence.`,
  },
];

const TRUST_POINTS = [
  {
    icon: Landmark,
    title: "Vos données restent les vôtres",
    description: "Vos informations financières servent à construire votre profil, jamais à être revendues.",
  },
  {
    icon: WifiOff,
    title: "Fonctionne hors connexion",
    description: "Enregistrez vos transactions même sans réseau ; elles se synchronisent dès que possible.",
  },
  {
    icon: ShieldCheck,
    title: "Frais transparents",
    description: `La seule commission de l'application est le ${TONTINE_FEE_PERCENT} % de gestion sur les tontines, indiqué sur chaque cotisation.`,
  },
  {
    icon: Users,
    title: "Pensé pour le Congo-Brazzaville",
    description: "Une application conçue autour des réalités des entrepreneurs informels du pays.",
  },
];

const FAQS = [
  {
    question: "L'application est-elle disponible sur l'App Store ou Google Play ?",
    answer:
      "Pas encore. Elikia Fund est en cours de finalisation. Laissez votre e-mail pour être informé dès que l'application est disponible au téléchargement.",
  },
  {
    question: "Mes transactions sont-elles réelles ou simulées ?",
    answer:
      "Une fois l'application installée, vos transactions, votre coffre et vos tontines sont bien réels et vous appartiennent. Les paiements par mobile money peuvent, selon la disponibilité, être traités par un prestataire tiers ou simulés pendant la phase actuelle.",
  },
  {
    question: "Quels frais s'appliquent aux tontines ?",
    answer: `Une commission fixe de ${TONTINE_FEE_PERCENT} % est prélevée sur chaque cotisation versée dans une tontine. Ce montant est toujours affiché clairement, cotisation par cotisation.`,
  },
  {
    question: "Où puis-je lire la politique de confidentialité ?",
    answer: "Elle est disponible à tout moment dans le pied de page du site, avec les conditions d'utilisation.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 h-112 w-2xl rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col items-start gap-6 text-left">
            <span className="eyebrow">Elikia, « espoir » en lingala</span>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">{TAGLINE}</h1>
            <p className="max-w-xl text-lg text-muted-foreground text-balance">
              Elikia Fund aide les entrepreneurs informels du Congo-Brazzaville à suivre leur trésorerie, épargner et
              cotiser en tontine, et à construire, avec le temps, une véritable identité financière.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <WaitlistCta />
              <Button asChild variant="outline" size="lg">
                <Link href="#fonctionnalites">Découvrir comment ça marche</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary/15 blur-2xl" aria-hidden />
            <div className="overflow-hidden rounded-[1.75rem] border border-border shadow-xl">
              {/* Photo by Ali Mkumbwa (@mkumbwajr) on Unsplash — Unsplash License, free commercial use. */}
              <Image
                src="/images/hero-entrepreneur.jpg"
                alt="Une commerçante reçoit un paiement dans sa boutique, téléphone à la main"
                width={1600}
                height={1067}
                priority
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Three features */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Fonctionnalités"
          title="Tout ce qu'il faut pour gérer l'argent de votre activité"
          subtitle="Trois outils simples, pensés pour le quotidien d'une petite entreprise."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      {/* Credit score / financial identity */}
      <section id="identite-financiere" className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="eyebrow">Identité financière</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
              Chaque transaction construit votre réputation financière
            </h2>
            <p className="text-base text-muted-foreground">
              À chaque revenu enregistré, chaque cotisation versée, Elikia Fund calcule un score d&apos;éligibilité
              au crédit sur 100 : une identité financière pour des entrepreneurs qui n&apos;en avaient pas jusqu&apos;ici.
            </p>
            <ul className="flex flex-col gap-3">
              {CREDIT_SCORE_FACTORS.map((factor) => (
                <li key={factor.key} className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-0">
                  <span className="text-sm font-semibold">{factor.label}</span>
                  <span className="text-sm text-muted-foreground">{factor.description}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8">
            <CreditScoreGauge score={78} />
            <VerdictBadge verdict="eligible" />
            <p className="text-center text-sm text-muted-foreground">
              Illustration : votre score dépend de votre activité réelle dans l&apos;application.
            </p>
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Pour qui"
          title="Conçu pour les entrepreneurs informels du Congo-Brazzaville"
          subtitle="Quel que soit votre secteur d'activité, Elikia Fund s'adapte à votre quotidien."
        />
        <div className="mt-12">
          <SectorGrid />
        </div>
      </section>

      {/* Mobile app showcase */}
      <section id="disponibilite" className="border-y border-border bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Application mobile"
            title="Elikia Fund dans votre poche"
            subtitle="L'application n'est pas encore publiée. Laissez votre e-mail pour être informé du lancement."
          />

          <div className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 lg:justify-center lg:px-0">
            <PhoneFrame label="Trésorerie">
              <CashflowMock />
            </PhoneFrame>
            <PhoneFrame label="Coffre">
              <VaultMock />
            </PhoneFrame>
            <PhoneFrame label="Tontines">
              <TontineMock />
            </PhoneFrame>
            <PhoneFrame label="Identité financière">
              <CreditScoreMock />
            </PhoneFrame>
          </div>

          <div className="flex flex-col items-center gap-4">
            <StoreBadges />
            <WaitlistCta />
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="Pourquoi Elikia" title="La confiance avant tout" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((point) => (
            <div key={point.title} className="flex flex-col gap-3">
              <point.icon className="size-5 text-primary" />
              <h3 className="text-base font-bold">{point.title}</h3>
              <p className="text-sm text-muted-foreground">{point.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="Questions fréquentes" title="Tout ce que vous vous demandez" />
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Construisez votre identité financière dès aujourd&apos;hui
        </h2>
        <div className="mt-8 flex justify-center">
          <WaitlistCta />
        </div>
      </section>
    </>
  );
}
