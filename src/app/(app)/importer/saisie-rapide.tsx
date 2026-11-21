"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MouvementCandidat } from "@/lib/import/types";
import { Apercu, type OptionCompte } from "./apercu";

export function SaisieRapide({ comptes, categories }: { comptes: OptionCompte[]; categories: OptionCompte[] }) {
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<{ mouvement: MouvementCandidat; compteId: string | null } | null>(null);

  if (resultat) {
    const cat = categories.find((c) => c.id === resultat.mouvement.categorie_id);
    return (
      <Apercu
        mouvements={[resultat.mouvement]}
        comptes={comptes}
        compteParDefaut={resultat.compteId}
        onTermine={() => {
          setResultat(null);
          setTexte("");
        }}
        note={`Catégorie proposée : ${cat?.nom ?? "aucune"}. Vous pourrez la modifier dans Mouvements.`}
      />
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!texte.trim()) return;
        setEnCours(true);
        try {
          const rep = await fetch("/api/import/saisie-rapide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texte }),
          });
          const json = await rep.json();
          if (!rep.ok) throw new Error(json.error ?? "Interprétation impossible.");
          setResultat(json);
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setEnCours(false);
        }
      }}
    >
      <Input
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Ex. 35 supermarché par carte, 12,50 resto hier en espèces"
        autoComplete="off"
        className="h-12 text-base"
        aria-label="Saisie rapide"
      />
      <Button type="submit" disabled={enCours || !texte.trim()} className="h-12 sm:h-10 sm:self-start">
        {enCours ? "Interprétation…" : "Interpréter"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Écrivez comme vous parlez : montant, quoi, et éventuellement comment ou quand.
      </p>
    </form>
  );
}
