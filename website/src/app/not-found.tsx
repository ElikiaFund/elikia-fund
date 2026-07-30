import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-32 text-center sm:px-6">
      <span className="eyebrow">404</span>
      <h1 className="text-3xl font-extrabold tracking-tight">Cette page n&apos;existe pas</h1>
      <p className="text-muted-foreground">La page que vous cherchez a peut-être été déplacée ou n&apos;existe plus.</p>
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
