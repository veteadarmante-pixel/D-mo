"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate, formatMontant } from "@/lib/format";
import type { MouvementCandidat } from "@/lib/import/types";
import { confirmerImport } from "./actions";

export type OptionCompte = { id: string; nom: string };

/** Aperçu à confirmer avant enregistrement, commun aux trois méthodes. */
export function Apercu({
  mouvements,
  comptes,
  compteParDefaut,
  importId = null,
  nomFichier = null,
  onTermine,
  note,
}: {
  mouvements: MouvementCandidat[];
  comptes: OptionCompte[];
  compteParDefaut?: string | null;
  importId?: string | null;
  nomFichier?: string | null;
  onTermine: () => void;
  note?: string;
}) {
  const [exclus, setExclus] = useState<Set<number>>(new Set());
  const [compteId, setCompteId] = useState<string>(compteParDefaut ?? comptes[0]?.id ?? "");
  const [pending, start] = useTransition();

  const retenus = mouvements.filter((_, i) => !exclus.has(i));
  const totalDepenses = retenus.filter((m) => m.type === "depense").reduce((s, m) => s + m.montant, 0);
  const totalRevenus = retenus.filter((m) => m.type === "revenu").reduce((s, m) => s + m.montant, 0);

  const basculer = (i: number) =>
    setExclus((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div className="flex flex-col gap-4">
      {note && <p className="text-sm text-muted-foreground">{note}</p>}

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="compte-import">Compte associé</Label>
        <NativeSelect id="compte-import" value={compteId} onChange={(e) => setCompteId(e.target.value)}>
          <option value="">Aucun</option>
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="text-sm text-muted-foreground">
        {retenus.length} / {mouvements.length} mouvements retenus · dépenses{" "}
        <span className="montant text-foreground">{formatMontant(totalDepenses)}</span> · revenus{" "}
        <span className="montant text-foreground">{formatMontant(totalRevenus)}</span>
      </div>

      <ul className="flex max-h-[28rem] flex-col divide-y overflow-y-auto rounded-xl border">
        {mouvements.map((m, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/50">
              <input
                type="checkbox"
                checked={!exclus.has(i)}
                onChange={() => basculer(i)}
                className="size-4 shrink-0 accent-foreground"
                aria-label="Garder ce mouvement"
              />
              <div className={`min-w-0 flex-1 ${exclus.has(i) ? "opacity-40" : ""}`}>
                <div className="truncate text-sm font-medium">{m.commerce || m.description}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {formatDate(m.date)} · {m.description}
                </div>
              </div>
              <div className={`montant text-sm font-medium whitespace-nowrap ${exclus.has(i) ? "opacity-40" : ""}`}>
                {m.type === "revenu" ? "+" : "−"}
                {formatMontant(m.montant)}
              </div>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="h-12 sm:h-10"
          disabled={pending || retenus.length === 0}
          onClick={() =>
            start(async () => {
              const r = await confirmerImport({
                mouvements: retenus,
                compteId: compteId || null,
                importId,
                nomFichier,
              });
              if (r.ok) {
                toast.success(r.message);
                onTermine();
              } else toast.error(r.message);
            })
          }
        >
          {pending ? "Enregistrement…" : `Enregistrer ${retenus.length} mouvement${retenus.length > 1 ? "s" : ""}`}
        </Button>
        <Button variant="outline" disabled={pending} onClick={onTermine}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
