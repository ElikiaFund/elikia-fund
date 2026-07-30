const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.elikiafund.com/api";

export class WaitlistError extends Error {}

export async function joinWaitlist(email: string, name?: string): Promise<void> {
  const response = await fetch(`${API_URL}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, name: name || undefined }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message: string =
      data?.errors?.email?.[0] ?? data?.message ?? "Une erreur est survenue. Veuillez réessayer.";
    throw new WaitlistError(message);
  }
}
