import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/a-propos`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/confidentialite`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/conditions`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ];
}
