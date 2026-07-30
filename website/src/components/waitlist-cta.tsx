"use client";

import { CheckCircle2Icon, Loader2Icon, MailIcon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinWaitlist, WaitlistError } from "@/lib/waitlist";

/**
 * Opens a dialog that posts to the public POST /waitlist endpoint (see api/routes/api.php) —
 * replaces the earlier mailto: placeholder now that a real capture endpoint exists. Submissions
 * are visible to staff in the back-office under "Liste d'attente".
 */
export function WaitlistCta({ className }: { className?: string }) {
  const nameId = useId();
  const emailId = useId();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setStatus("idle");
    setErrorMessage(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    try {
      await joinWaitlist(email, name);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof WaitlistError ? error.message : "Une erreur est survenue. Veuillez réessayer.");
      setStatus("error");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" className={className}>
          <MailIcon /> Être prévenu du lancement
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2Icon className="size-12 text-primary" />
            <p className="text-lg font-bold">Merci, c&apos;est noté !</p>
            <p className="text-sm text-muted-foreground">
              Vous êtes sur la liste d&apos;attente. Nous vous préviendrons dès que l&apos;application est disponible.
            </p>
            <Button className="mt-2" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MailIcon className="size-5" />
              </div>
              <DialogTitle className="text-lg">Rejoignez la liste d&apos;attente</DialogTitle>
              <DialogDescription>
                Laissez votre e-mail pour être informé dès que l&apos;application est disponible au téléchargement.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={nameId}>Nom (facultatif)</Label>
                <Input
                  id={nameId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  autoComplete="name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={emailId}>E-mail</Label>
                <Input
                  id={emailId}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                />
              </div>
              {status === "error" && errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>

            <DialogFooter className="mt-2">
              <Button type="submit" disabled={status === "submitting"}>
                {status === "submitting" && <Loader2Icon className="animate-spin" />}
                M&apos;inscrire
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
