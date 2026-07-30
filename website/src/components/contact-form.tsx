"use client";

import { CheckCircle2Icon, Loader2Icon, SendIcon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContactMessageError, sendContactMessage } from "@/lib/contact";

export function ContactForm() {
  const nameId = useId();
  const emailId = useId();
  const subjectId = useId();
  const messageId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && subject.trim().length > 0 && message.trim().length > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    try {
      await sendContactMessage({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof ContactMessageError ? error.message : "Une erreur est survenue. Veuillez réessayer.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
        <CheckCircle2Icon className="size-12 text-primary" />
        <p className="text-lg font-bold">Message envoyé</p>
        <p className="text-sm text-muted-foreground">
          Merci, {name.split(" ")[0]}. Nous vous répondrons bientôt à {email}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={nameId}>Nom</Label>
          <Input id={nameId} value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={emailId}>E-mail</Label>
          <Input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={subjectId}>Sujet</Label>
        <Input id={subjectId} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex. Question sur les tontines" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={messageId}>Message</Label>
        <Textarea
          id={messageId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez votre demande…"
          rows={5}
        />
      </div>

      {status === "error" && errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <Button type="submit" size="lg" disabled={!canSubmit || status === "submitting"} className="w-fit">
        {status === "submitting" ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
        Envoyer le message
      </Button>
    </form>
  );
}
