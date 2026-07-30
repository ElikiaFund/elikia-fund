"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Thin wrapper so the rest of the app imports from '@/components/theme-provider' like every other
 * local component, instead of reaching into 'next-themes' directly — mirrors back-office's
 * identical wrapper. Handles localStorage persistence and applying/removing the `.dark` class on
 * <html> (matches the `@custom-variant dark (&:is(.dark *))` in globals.css) via a blocking inline
 * script, so there's no flash of the wrong theme on load.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
