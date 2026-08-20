import type { Metadata } from "next";
import Image from "next/image";

import { SectionHeading } from "@/components/section-heading";
import { SectorGrid } from "@/components/sector-grid";
import { WaitlistCta } from "@/components/waitlist-cta";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "À propos",
  description:
    "Elikia Fund : pourquoi nous construisons une identité financière pour les entrepreneurs informels du Congo-Brazzaville.",
  path: "/a-propos",
});

const STEPS = [
  {
    title: "Créez votre profil d'entreprise",
    description: "Indiquez votre secteur d'activité et votre localisation au Congo-Brazzaville.",
  },
  {
    title: "Suivez vos revenus et dépenses",
    description: "Enregistrez chaque transaction, même hors connexion, pour garder une vision claire de votre trésorerie.",
  },
  {
    title: "Épargnez et cotisez en tontine",
    description: "Mettez de l'argent de côté dans votre coffre et rejoignez un groupe d'épargne collective.",
  },
  {
    title: "Construisez votre identité financière",
    description: "Votre activité réelle nourrit, avec le temps, un score d'éligibilité au crédit qui vous appartient.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="eyebrow">À propos</span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
          Une identité financière pour ceux qui n&apos;en avaient pas
        </h1>
        <p className="mt-6 text-lg text-muted-foreground text-balance">
          « Elikia » signifie « espoir » en lingala. C&apos;est le nom que nous avons choisi pour une application
          construite autour d&apos;une conviction simple : les entrepreneurs informels méritent les mêmes outils
          financiers que n&apos;importe qui d&apos;autre.
        </p>
        <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-border shadow-xl">
          {/* Photo by Hassan Kibwana (@kb_photographic) on Unsplash — Unsplash License, free commercial use. */}
          <Image
            src="/images/woman-phone-smile.jpg"
            alt="Une entrepreneure souriante, téléphone à la main"
            width={1600}
            height={1067}
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[1.75rem] border border-border shadow-xl lg:order-2">
            {/* Photo by Ali Mkumbwa (@mkumbwajr) on Unsplash — Unsplash License, free commercial use. */}
            <Image
              src="/images/shopkeeper-counter.jpg"
              alt="Une commerçante derrière le comptoir de sa boutique"
              width={1600}
              height={1067}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="lg:order-1">
            <h2 className="text-2xl font-extrabold tracking-tight">Notre mission</h2>
            <p className="mt-4 text-base text-muted-foreground">
              Au Congo-Brazzaville, une grande partie de l&apos;activité économique se fait en dehors des circuits
              bancaires classiques : pas de relevé de compte, pas d&apos;historique, pas de moyen de prouver son
              sérieux financier auprès d&apos;un prêteur. Elikia Fund part de ce constat : en aidant chacun à suivre sa
              trésorerie, à épargner et à cotiser en tontine, l&apos;application construit progressivement une
              véritable identité financière : un score d&apos;éligibilité au crédit fondé sur une activité réelle,
              pas sur des documents que beaucoup n&apos;ont jamais eus.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Pour qui"
          title="Conçu pour tous les secteurs d'activité"
          subtitle="Commerce, artisanat, restauration, services... Elikia Fund s'adapte à votre activité, au Congo-Brazzaville."
        />
        <div className="mt-12">
          <SectorGrid />
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="Comment ça marche" title="Quatre étapes simples" />
          <ol className="mt-12 grid gap-8 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span className="text-sm font-extrabold text-primary">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Founder's word — not a team section, just one quote. */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
          <div className="mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-full border border-border shadow-lg sm:mx-0 sm:h-32 sm:w-32">
            <Image
              src="/images/founder-rabbi-kinkoueta.jpg"
              alt="Rabbi Kinkoueta, fondateur d'Elikia Fund"
              width={400}
              height={400}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="text-center sm:text-left">
            <svg
              aria-hidden
              viewBox="0 0 32 24"
              className="mx-auto mb-3 h-6 w-8 fill-primary/30 sm:mx-0"
            >
              <path d="M0 24V14.4C0 6.4 4.8 1.2 12.8 0l1.6 3.2C9.6 4.8 7.2 8 7.2 12h6.4v12H0Zm17.6 0V14.4c0-8 4.8-13.2 12.8-14.4L32 3.2c-4.8 1.6-7.2 4.8-7.2 8.8h6.4v12H17.6Z" />
            </svg>
            <p className="text-lg font-medium text-balance sm:text-xl">
              « Chaque commerçant, chaque artisan que je connais a une activité bien réelle. Ce qui lui manque, c&apos;est
              un moyen de le prouver. Elikia Fund est né de cette conviction : la confiance financière ne devrait pas
              dépendre du réseau qu&apos;on connaît, mais du sérieux avec lequel on gère son argent, jour après jour. »
            </p>
            <p className="mt-4 text-sm font-semibold">Rabbi Kinkoueta</p>
            <p className="text-sm text-muted-foreground">Fondateur, Elikia Fund</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Rejoignez l&apos;aventure Elikia Fund</h2>
        <div className="mt-8 flex justify-center">
          <WaitlistCta />
        </div>
      </section>
    </>
  );
}
