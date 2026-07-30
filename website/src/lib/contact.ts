const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.elikiafund.com/api";

export type ContactInfo = {
  support_email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  hours: string | null;
};

export class ContactMessageError extends Error {}

/** Server-side fetch (see app/contact/page.tsx) — same admin-configured settings the mobile
 * app's "Aide et support" sheet reads, so both surfaces stay in sync automatically. */
export async function getContactInfo(): Promise<ContactInfo | null> {
  try {
    const response = await fetch(`${API_URL}/settings/contact`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function sendContactMessage(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const response = await fetch(`${API_URL}/contact-messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message: string =
      data?.errors?.email?.[0] ??
      data?.errors?.message?.[0] ??
      data?.message ??
      "Une erreur est survenue. Veuillez réessayer.";
    throw new ContactMessageError(message);
  }
}
