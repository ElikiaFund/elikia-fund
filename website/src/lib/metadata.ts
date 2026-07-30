import type { Metadata } from "next";

import { META_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants";

/** Per-page metadata helper — every route calls this so OG/Twitter defaults stay consistent. */
export function buildMetadata({
  title,
  description = META_DESCRIPTION,
  path = "/",
}: {
  title: string;
  description?: string;
  path?: string;
}): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
