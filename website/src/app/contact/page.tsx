import { ClockIcon, MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { ContactForm } from "@/components/contact-form";
import { getContactInfo } from "@/lib/contact";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description: "Contactez l'équipe Elikia Fund : e-mail, téléphone et adresse.",
  path: "/contact",
});

export default async function ContactPage() {
  const contact = await getContactInfo();
  const infoRows = [
    contact?.support_email && { icon: MailIcon, label: contact.support_email, href: `mailto:${contact.support_email}` },
    contact?.phone && { icon: PhoneIcon, label: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}` },
    contact?.whatsapp && {
      icon: MessageCircleIcon,
      label: `${contact.whatsapp} (WhatsApp)`,
      href: `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`,
    },
    contact?.address && { icon: MapPinIcon, label: contact.address, href: undefined },
    contact?.hours && { icon: ClockIcon, label: contact.hours, href: undefined },
  ].filter((row): row is { icon: typeof MailIcon; label: string; href: string | undefined } => Boolean(row));

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 h-112 w-2xl rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-6 text-left">
            <span className="eyebrow">Contact</span>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">Nous sommes à votre écoute</h1>
            <p className="max-w-xl text-lg text-muted-foreground text-balance">
              Une question sur Elikia Fund, un partenariat, ou simplement envie d&apos;échanger ? Écrivez-nous, nous
              répondons généralement sous 48 heures ouvrées.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary/15 blur-2xl" aria-hidden />
            <div className="overflow-hidden rounded-[1.75rem] border border-border shadow-xl">
              {/* Photo by Ali Mkumbwa (@mkumbwajr) on Unsplash — Unsplash License, free commercial use. */}
              <Image
                src="/images/shopkeeper-counter.jpg"
                alt="Une commerçante souriante, prête à échanger avec vous"
                width={1600}
                height={1067}
                priority
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-bold">Nos coordonnées</h2>
            {infoRows.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Écrivez-nous via le formulaire, nous vous répondrons dès que possible.
              </p>
            ) : (
              <ul className="mt-5 flex flex-col gap-4">
                {infoRows.map((row) => (
                  <li key={row.label} className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <row.icon className="size-5" />
                    </div>
                    {row.href ? (
                      <a href={row.href} className="text-sm break-words hover:text-primary">
                        {row.label}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  );
}
