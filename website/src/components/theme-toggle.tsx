"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

/**
 * A simple light/dark toggle (not back-office's 3-way Clair/Sombre/Système dropdown) — a public
 * marketing site just needs a quick switch, not a settings menu. Defaults to light regardless of
 * OS preference (see the ThemeProvider's defaultTheme + enableSystem={false} in layout.tsx).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoids a hydration mismatch: next-themes only knows the real theme after mounting client-side.
  // useSyncExternalStore (snapshot false on server, true on client) instead of a mount-effect +
  // setState, which the react-hooks "set-state-in-effect" lint rule flags.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

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
