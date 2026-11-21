"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton, useToastResult } from "@/components/form-bits";
import { TYPES_COMPTE, type Compte, type FormState } from "@/lib/types";

export function CompteForm({
  action,
  compte,
  boutonLabel = "Ajouter le compte",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  compte?: Compte;
  boutonLabel?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  useToastResult(state);

  return (
    // La clé change après un ajout réussi : le formulaire se vide.
    <form key={state?.cle ?? 0} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="nom">Nom</Label>
        <Input
          id="nom"
          name="nom"
          required
          defaultValue={compte?.nom}
          placeholder="Ex. Compte courant, Visa •••• 1234"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type</Label>
        <NativeSelect id="type" name="type" defaultValue={compte?.type ?? "debit"}>
          {TYPES_COMPTE.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="solde_actuel">Solde actuel (€)</Label>
        <Input
          id="solde_actuel"
          name="solde_actuel"
          inputMode="decimal"
          defaultValue={compte?.solde_actuel?.toString().replace(".", ",") ?? ""}
          placeholder="Ex. 1 250,00 (négatif pour une dette)"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="jour_cloture">Jour de clôture (cartes de crédit)</Label>
        <Input
          id="jour_cloture"
          name="jour_cloture"
          type="number"
          min={1}
          max={31}
          inputMode="numeric"
          defaultValue={compte?.jour_cloture ?? ""}
          placeholder="1 à 31"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="jour_limite_paiement">Jour limite de paiement</Label>
        <Input
          id="jour_limite_paiement"
          name="jour_limite_paiement"
          type="number"
          min={1}
          max={31}
          inputMode="numeric"
          defaultValue={compte?.jour_limite_paiement ?? ""}
          placeholder="1 à 31"
        />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        Par sécurité, n&apos;indiquez jamais de numéro de carte complet, d&apos;identifiant ni de
        mot de passe bancaire. Les 4 derniers chiffres suffisent.
      </p>
      <SubmitButton className="sm:col-span-2 sm:justify-self-start">{boutonLabel}</SubmitButton>
    </form>
  );
}
