// Reviewed and approved by legal counsel.
import type { Metadata } from "next";

import { LEGAL_LAST_UPDATED, SUPPORT_EMAIL, TONTINE_FEE_PERCENT } from "@/lib/constants";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Conditions d'utilisation",
  description: "Les conditions d'utilisation de l'application Elikia Fund.",
  path: "/conditions",
});

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Conditions d&apos;utilisation</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {LEGAL_LAST_UPDATED}</p>

      <div className="mt-10 flex flex-col gap-10 text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-bold">1. Objet du service</h2>
          <p className="mt-3 text-muted-foreground">
            Elikia Fund est une application destinée aux entrepreneurs informels du Congo-Brazzaville, proposant un
            suivi de trésorerie, un coffre d&apos;épargne protégé par code PIN, des tontines (groupes d&apos;épargne
            collective) et un score d&apos;éligibilité au crédit calculé à partir de votre activité dans
            l&apos;application.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. Compte et éligibilité</h2>
          <p className="mt-3 text-muted-foreground">
            Vous devez être majeur pour créer un compte et vous engagez à fournir des informations exactes. Un seul
            compte est autorisé par personne.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Fonctionnement des tontines et frais de gestion</h2>
          <p className="mt-3 text-muted-foreground">
            Une commission de gestion fixe de <strong className="text-foreground">{TONTINE_FEE_PERCENT} %</strong> est
            prélevée sur chaque cotisation versée dans une tontine. Ce montant, ainsi que le montant net reçu par le
            groupe, est indiqué pour chaque cotisation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Paiements mobile money</h2>
          <p className="mt-3 text-muted-foreground">
            Les paiements par mobile money (MTN Mobile Money, Airtel Money) peuvent, selon la disponibilité, être
            traités par un prestataire de paiement tiers ou simulés à des fins de démonstration pendant la phase
            actuelle de l&apos;application. Nous ne garantissons pas la disponibilité continue des paiements réels.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Score d&apos;éligibilité au crédit</h2>
          <p className="mt-3 text-muted-foreground">
            Le score affiché dans l&apos;application est informatif et indicatif. Il est calculé à partir de votre
            activité dans l&apos;application et ne constitue ni une offre de prêt, ni une garantie d&apos;obtention
            d&apos;un crédit auprès d&apos;un établissement prêteur.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Utilisation acceptable</h2>
          <p className="mt-3 text-muted-foreground">
            Vous vous engagez à ne pas fournir de fausses informations sur votre entreprise, à ne pas frauder le
            système de tontines ou de codes d&apos;invitation, et à utiliser l&apos;application conformément à sa
            destination.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">7. Limitation de responsabilité</h2>
          <p className="mt-3 text-muted-foreground">
            L&apos;application est fournie « en l&apos;état » et « selon disponibilité », sans garantie
            d&apos;absence d&apos;erreurs ou d&apos;interruption de service. Dans la mesure permise par le droit
            applicable, Elikia Fund décline toute responsabilité pour les dommages indirects, pertes de données ou
            pertes financières résultant de l&apos;utilisation de l&apos;application, à l&apos;exception des cas de
            faute lourde ou intentionnelle.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">8. Résiliation</h2>
          <p className="mt-3 text-muted-foreground">
            Vous pouvez fermer votre compte à tout moment. Nous nous réservons le droit de suspendre un compte en
            cas de non-respect de ces conditions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">9. Modifications des conditions</h2>
          <p className="mt-3 text-muted-foreground">
            Nous pouvons modifier ces conditions. La date de dernière mise à jour figure en haut de cette page. Toute
            modification importante vous sera communiquée via l&apos;application ou ce site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">10. Droit applicable</h2>
          <p className="mt-3 text-muted-foreground">
            Les présentes conditions sont destinées à être interprétées conformément au droit applicable en
            République du Congo, sous réserve de confirmation par un conseil juridique compétent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">11. Contact</h2>
          <p className="mt-3 text-muted-foreground">
            Pour toute question relative à ces conditions,{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-foreground underline underline-offset-4">
              contactez-nous
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
