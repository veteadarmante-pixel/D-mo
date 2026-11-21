"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton, useToastResult } from "@/components/form-bits";
import type { Categorie, Compte, FormState, Transaction } from "@/lib/types";

type Option = Pick<Categorie, "id" | "nom">;
type OptionCompte = Pick<Compte, "id" | "nom">;

export function TransactionForm({
  action,
  categories,
  comptes,
  aujourdhui,
  transaction,
  boutonLabel = "Enregistrer",
  saisieRapide = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: Option[];
  comptes: OptionCompte[];
  aujourdhui: string;
  transaction?: Transaction;
  boutonLabel?: string;
  saisieRapide?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  useToastResult(state);

  return (
    <form key={state?.cle ?? 0} action={formAction} className="flex flex-col gap-5">
      {/* Type : deux gros boutons, faciles au pouce */}
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">Type</legend>
        {(
          [
            ["depense", "Dépense"],
            ["revenu", "Revenu"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="cursor-pointer">
            <input
              type="radio"
              name="type"
              value={value}
              defaultChecked={(transaction?.type ?? "depense") === value}
              className="peer sr-only"
            />
            <span className="flex h-11 items-center justify-center rounded-md border text-sm font-medium transition-colors peer-checked:border-foreground peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50">
              {label}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="montant">Montant (€)</Label>
        <Input
          id="montant"
          name="montant"
          inputMode="decimal"
          autoComplete="off"
          required
          autoFocus={saisieRapide}
          defaultValue={transaction ? String(transaction.montant).replace(".", ",") : ""}
          placeholder="0,00"
          className="montant h-14 text-3xl font-semibold md:text-3xl"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          required
          autoComplete="off"
          defaultValue={transaction?.description_originale}
          placeholder="Ex. Supermarché, Boulangerie, Salaire…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="categorie_id">Catégorie</Label>
          <NativeSelect
            id="categorie_id"
            name="categorie_id"
            defaultValue={transaction?.categorie_id ?? ""}
          >
            <option value="">Sans catégorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="compte_id">Compte</Label>
          <NativeSelect
            id="compte_id"
            name="compte_id"
            defaultValue={transaction?.compte_id ?? comptes[0]?.id ?? ""}
          >
            <option value="">Aucun</option>
            {comptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={transaction?.date ?? aujourdhui}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="commerce">Commerce (facultatif)</Label>
          <Input
            id="commerce"
            name="commerce"
            autoComplete="off"
            defaultValue={transaction?.commerce ?? ""}
            placeholder="Ex. Carrefour"
          />
        </div>
      </div>

      {!transaction && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="maj_solde" defaultChecked className="size-4 accent-foreground" />
          Mettre à jour le solde du compte
        </label>
      )}

      <SubmitButton className="h-12 text-base">{boutonLabel}</SubmitButton>
    </form>
  );
}
