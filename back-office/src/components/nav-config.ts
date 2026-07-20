import { ArrowLeftRightIcon, BuildingIcon, CircleDollarSignIcon, LayoutDashboardIcon, SettingsIcon, ShieldIcon, UsersIcon } from "lucide-react"

export const navMain = [
  { title: "Tableau de bord", url: "/", end: true, icon: LayoutDashboardIcon },
  { title: "Utilisateurs", url: "/utilisateurs", icon: UsersIcon },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRightIcon },
  { title: "Tontines", url: "/tontines", icon: CircleDollarSignIcon },
  { title: "Entreprises", url: "/entreprises", icon: BuildingIcon },
  { title: "Personnel", url: "/personnel", icon: ShieldIcon },
  { title: "Paramètres", url: "/parametres", icon: SettingsIcon },
]
