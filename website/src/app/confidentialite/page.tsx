// NOTE for the next developer: no privacy policy existed anywhere in this codebase before this
// page — it's a good-faith first draft grounded in what the app actually collects (see the data
// facts below), not legal advice. Recommend a professional legal review before relying on this in
// production for real users. See LEGAL_DISCLAIMER in lib/constants.ts for the visible version of
// this same note.
import type { Metadata } from "next";

import { LEGAL_DISCLAIMER, LEGAL_LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/constants";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Politique de confidentialité",
  description: "Comment Elikia Fund collecte, utilise et protège vos données personnelles.",
  path: "/confidentialite",
});

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {LEGAL_LAST_UPDATED}</p>
      <p className="mt-4 text-sm text-muted-foreground italic">{LEGAL_DISCLAIMER}</p>

      <div className="mt-10 flex flex-col gap-10 text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-bold">1. Responsable du traitement</h2>
          <p className="mt-3 text-muted-foreground">
            Elikia Fund est responsable du traitement des données décrites dans cette politique. Pour toute
            question, vous pouvez nous contacter à l&apos;adresse{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-foreground underline underline-offset-4">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. Données que nous collectons</h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">Compte</strong> : numéro de téléphone (identifiant principal), nom, mot
              de passe (haché, jamais stocké en clair), ou, si vous choisissez de vous connecter via Google, Apple ou
              Facebook, l&apos;identifiant fourni par ce service, votre e-mail, votre nom et votre photo de profil.
            </li>
            <li>
              <strong className="text-foreground">Photo de profil</strong> : si vous choisissez d&apos;en ajouter une.
            </li>
            <li>
              <strong className="text-foreground">Profil d&apos;entreprise</strong> : nom de l&apos;entreprise, secteur
              d&apos;activité, département et ville au Congo-Brazzaville.
            </li>
            <li>
              <strong className="text-foreground">Transactions financières</strong> : montants, catégories, notes et
              dates des revenus et dépenses que vous enregistrez.
            </li>
            <li>
              <strong className="text-foreground">Coffre</strong> : solde de votre coffre d&apos;épargne et code PIN
              (haché, jamais stocké ni transmis en clair).
            </li>
            <li>
              <strong className="text-foreground">Tontines</strong> : adhésion à des groupes d&apos;épargne et
              historique de vos cotisations.
            </li>
            <li>
              <strong className="text-foreground">Paiements mobile money</strong> : lorsque cette fonctionnalité est
              active, les données nécessaires au paiement (numéro de téléphone, nom, montant) sont transmises à notre
              prestataire de paiement, Yabetoo, qui les traite en notre nom.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Pourquoi nous utilisons ces données</h2>
          <p className="mt-3 text-muted-foreground">
            Nous utilisons vos données pour faire fonctionner l&apos;application, calculer votre score
            d&apos;éligibilité au crédit à partir de votre activité réelle, sécuriser votre compte et vous apporter
            un support client. Nous ne vendons pas vos données et ne les utilisons pas à des fins publicitaires
            auprès de tiers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Partage avec des tiers</h2>
          <p className="mt-3 text-muted-foreground">
            Nous ne partageons vos données qu&apos;avec les prestataires strictement nécessaires au fonctionnement du
            service : <strong className="text-foreground">Yabetoo</strong> pour le traitement des paiements mobile
            money lorsque cette fonctionnalité est active, et <strong className="text-foreground">Google, Apple ou
            Facebook</strong> uniquement si vous choisissez de vous connecter via l&apos;un de ces services. Aucun
            autre tiers n&apos;a accès à vos données.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Conservation des données</h2>
          <p className="mt-3 text-muted-foreground">
            Vos données sont conservées tant que votre compte est actif. En cas de fermeture de votre compte, elles
            sont supprimées ou anonymisées dans un délai raisonnable, sauf obligation légale de conservation plus
            longue.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Sécurité</h2>
          <p className="mt-3 text-muted-foreground">
            Votre mot de passe et votre code PIN sont hachés et ne sont jamais stockés ni transmis en clair. Nous
            mettons en œuvre des mesures de sécurité raisonnables pour protéger vos données contre l&apos;accès non
            autorisé.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">7. Vos droits</h2>
          <p className="mt-3 text-muted-foreground">
            Vous pouvez à tout moment demander l&apos;accès, la rectification ou la suppression de vos données, ou
            vous opposer à leur traitement, en nous contactant à{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-foreground underline underline-offset-4">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">8. Mineurs</h2>
          <p className="mt-3 text-muted-foreground">
            Elikia Fund n&apos;est pas destiné aux personnes mineures. Nous ne collectons pas sciemment de données
            concernant des mineurs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">9. Modifications de cette politique</h2>
          <p className="mt-3 text-muted-foreground">
            Nous pouvons mettre à jour cette politique de confidentialité. La date de dernière mise à jour figure en
            haut de cette page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">10. Contact</h2>
          <p className="mt-3 text-muted-foreground">
            Pour toute question relative à cette politique,{" "}
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
