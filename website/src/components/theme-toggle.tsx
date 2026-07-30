"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * A simple light/dark toggle (not back-office's 3-way Clair/Sombre/Système dropdown) — a public
 * marketing site just needs a quick switch, not a settings menu. Defaults to light regardless of
 * OS preference (see the ThemeProvider's defaultTheme + enableSystem={false} in layout.tsx).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoids a hydration mismatch: next-themes only knows the real theme after mounting client-side.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Changer le thème"
      className="relative overflow-hidden"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && (
        <>
          <SunIcon className="size-4 scale-100 rotate-0 transition-transform duration-300 dark:scale-0 dark:-rotate-90" />
          <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-transform duration-300 dark:scale-100 dark:rotate-0" />
        </>
      )}
    </Button>
  );
}
