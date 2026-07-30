import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Car,
  Cpu,
  GraduationCap,
  Hammer,
  Leaf,
  MoreHorizontal,
  Sparkles,
  Stethoscope,
  Store,
  UtensilsCrossed,
} from "lucide-react";

/**
 * Ported verbatim from mobile/src/services/companyService.ts's COMPANY_CATEGORIES — the fixed
 * list of business sectors a company profile picks from (Company::CATEGORIES on the backend).
 * Icons are the nearest lucide-react equivalents to the app's Ionicons.
 */
export type Sector = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export const SECTORS: Sector[] = [
  { value: "commerce", label: "Commerce", icon: Store },
  { value: "agriculture", label: "Agriculture", icon: Leaf },
  { value: "artisanat", label: "Artisanat", icon: Hammer },
  { value: "restauration", label: "Restauration", icon: UtensilsCrossed },
  { value: "transport", label: "Transport", icon: Car },
  { value: "services", label: "Services", icon: Briefcase },
  { value: "beaute_bien_etre", label: "Beauté & bien-être", icon: Sparkles },
  { value: "sante", label: "Santé", icon: Stethoscope },
  { value: "education", label: "Éducation", icon: GraduationCap },
  { value: "technologie", label: "Technologie", icon: Cpu },
  { value: "autre", label: "Autre", icon: MoreHorizontal },
];
