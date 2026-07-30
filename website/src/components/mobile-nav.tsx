"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_LINKS } from "@/lib/nav";

/** The one client-side piece of the header — everything else server-renders. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-base font-medium hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/#disponibilite"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-lg bg-primary px-3 py-2.5 text-center text-base font-medium text-primary-foreground"
          >
            Rejoindre la liste d&apos;attente
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
