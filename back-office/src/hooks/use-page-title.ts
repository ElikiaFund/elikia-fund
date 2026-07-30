import { useEffect } from 'react'

/**
 * Sets the browser tab title per route — without this every page just shows the static
 * `<title>` from index.html. `title` can be omitted while a detail page's record is still
 * loading (falls back to the base app name instead of a blank/stale title).
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Elikia Fund Console` : 'Elikia Fund Console'
  }, [title])
}
