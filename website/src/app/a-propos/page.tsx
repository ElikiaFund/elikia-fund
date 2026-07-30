import type { Metadata } from "next";

import { SectionHeading } from "@/components/section-heading";
import { SectorGrid } from "@/components/sector-grid";
import { WaitlistCta } from "@/components/waitlist-cta";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "À propos",
  description:
    "Elikia Fund — pourquoi nous construisons une identité financière pour les entrepreneurs informels du Congo-Brazzaville.",
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
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight">Notre mission</h2>
          <p className="mt-4 text-base text-muted-foreground">
            Au Congo-Brazzaville, une grande partie de l&apos;activité économique se fait en dehors des circuits
            bancaires classiques : pas de relevé de compte, pas d&apos;historique, pas de moyen de prouver son
            sérieux financier auprès d&apos;un prêteur. Elikia Fund part de ce constat : en aidant chacun à suivre sa
            trésorerie, à épargner et à cotiser en tontine, l&apos;application construit progressivement une
            véritable identité financière — un score d&apos;éligibilité au crédit fondé sur une activité réelle,
            pas sur des documents que beaucoup n&apos;ont jamais eus.
          </p>
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

      {/*
        TODO: add a real "Équipe / Entreprise" section once founder bios and legal entity details
        (registration number, registered address) actually exist — nothing in the codebase
        documents them today, and generic filler copy would be just as misleading as fabricating
        names, so this section is deliberately omitted rather than shipped as placeholder content.
      */}

      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Rejoignez l&apos;aventure Elikia Fund</h2>
        <div className="mt-8 flex justify-center">
          <WaitlistCta />
        </div>
      </section>
    </>
  );
}
