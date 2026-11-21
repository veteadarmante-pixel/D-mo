"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/types";

export function SubmitButton({
  children,
  pendingLabel = "Enregistrement…",
  className,
  variant,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Affiche le résultat d'une action dans une notification. */
export function useToastResult(state: FormState) {
  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
}

/** Bouton de suppression avec confirmation. */
export function DeleteButton({
  action,
  confirmation,
  label = "Supprimer",
}: {
  action: () => Promise<void>;
  confirmation: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmation)) e.preventDefault();
      }}
    >
      <SubmitButton variant="ghost" pendingLabel="Suppression…" className="text-muted-foreground">
        {label}
      </SubmitButton>
    </form>
  );
}
