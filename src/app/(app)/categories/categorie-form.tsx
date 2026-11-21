"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton, useToastResult } from "@/components/form-bits";
import { COULEURS_NEUTRES, type Categorie, type FormState } from "@/lib/types";

export function CategorieForm({
  action,
  categorie,
  boutonLabel = "Ajouter la catégorie",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categorie?: Categorie;
  boutonLabel?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  useToastResult(state);
  const couleur = categorie?.couleur_neutre ?? "#737373";

  return (
    <form key={state?.cle ?? 0} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nom">Nom</Label>
        <Input id="nom" name="nom" required defaultValue={categorie?.nom} placeholder="Ex. Courses" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="budget_mensuel">Budget mensuel (€)</Label>
        <Input
          id="budget_mensuel"
          name="budget_mensuel"
          inputMode="decimal"
          defaultValue={categorie?.budget_mensuel?.toString().replace(".", ",") ?? ""}
          placeholder="Ex. 400 (0 = pas de budget)"
        />
      </div>
      <fieldset className="flex flex-col gap-2 sm:col-span-2">
        <legend className="mb-2 text-sm font-medium">Teinte</legend>
        <div className="flex flex-wrap gap-2">
          {COULEURS_NEUTRES.map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="couleur_neutre"
                value={c}
                defaultChecked={c === couleur}
                className="peer sr-only"
              />
              <span
                className="block size-8 rounded-full border-2 border-transparent ring-1 ring-border peer-checked:border-background peer-checked:ring-2 peer-checked:ring-foreground"
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton className="sm:col-span-2 sm:justify-self-start">{boutonLabel}</SubmitButton>
    </form>
  );
}
