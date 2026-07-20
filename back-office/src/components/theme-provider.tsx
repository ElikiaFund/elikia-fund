import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

/**
 * Thin wrapper so the rest of the app imports from '@/components/theme-provider' like every
 * other local component, instead of reaching into 'next-themes' directly. next-themes handles
 * localStorage persistence, applying/removing the `.dark` class on <html> (matches the
 * `@custom-variant dark (&:is(.dark *))` in index.css), and live-updating when the OS preference
 * changes while `theme === 'system'`.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
