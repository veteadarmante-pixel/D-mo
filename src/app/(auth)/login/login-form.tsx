"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { envoyerLienMagique, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    envoyerLienMagique,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Adresse email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="vous@exemple.com"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir un lien de connexion"}
      </Button>
      {state && (
        <p
          role="status"
          className={state.ok ? "text-sm" : "text-sm text-muted-foreground"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
