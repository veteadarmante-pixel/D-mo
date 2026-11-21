"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { MouvementCandidat } from "@/lib/import/types";
import { Apercu, type OptionCompte } from "./apercu";

const TAILLE_MAX = 10 * 1024 * 1024;

export function ImportPdf({ comptes }: { comptes: OptionCompte[] }) {
  const [etat, setEtat] = useState<"attente" | "envoi" | "analyse">("attente");
  const [resultat, setResultat] = useState<{
    importId: string;
    nomFichier: string;
    compteDetecte: string | null;
    mouvements: MouvementCandidat[];
  } | null>(null);

  const analyser = async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Choisissez un fichier PDF.");
      return;
    }
    if (f.size > TAILLE_MAX) {
      toast.error("PDF trop lourd (10 Mo maximum).");
      return;
    }
    try {
      setEtat("envoi");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée : reconnectez-vous.");

      // Dépôt direct dans le bucket privé, dans le dossier de l'utilisateur.
      const nomSur = f.name.replace(/[^\w.-]+/g, "_").slice(-80);
      const chemin = `${user.id}/${Date.now()}-${nomSur}`;
      const { error } = await supabase.storage
        .from("releves")
        .upload(chemin, f, { contentType: "application/pdf", upsert: false });
      if (error) throw new Error(`Envoi impossible : ${error.message}`);

      setEtat("analyse");
      const rep = await fetch("/api/import/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chemin, nomFichier: f.name }),
      });
      const json = await rep.json();
      if (!rep.ok) throw new Error(json.error ?? "Analyse impossible.");
      if (!json.mouvements?.length) throw new Error("Aucun mouvement trouvé dans ce PDF.");
      setResultat({ ...json, nomFichier: f.name });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEtat("attente");
    }
  };

  if (resultat) {
    const compteDevine = comptes.find(
      (c) => resultat.compteDetecte && c.nom.toLowerCase().includes(resultat.compteDetecte.slice(-4)),
    );
    return (
      <Apercu
        mouvements={resultat.mouvements}
        comptes={comptes}
        compteParDefaut={compteDevine?.id}
        importId={resultat.importId}
        onTermine={() => setResultat(null)}
        note={`${resultat.nomFichier}${resultat.compteDetecte ? ` · compte détecté : ${resultat.compteDetecte}` : ""}. Vérifiez les lignes extraites par l'IA avant d'enregistrer.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="fichier-pdf">Relevé bancaire PDF (10 Mo max.)</Label>
      <Input
        id="fichier-pdf"
        type="file"
        accept="application/pdf,.pdf"
        disabled={etat !== "attente"}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void analyser(f);
          e.target.value = "";
        }}
      />
      {etat !== "attente" ? (
        <p className="text-sm" role="status">
          {etat === "envoi" ? "Envoi du fichier…" : "Analyse par l'IA en cours (jusqu'à 1 à 2 minutes)…"}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Le PDF est stocké dans un espace privé. Seuls les 4 derniers chiffres des numéros de
          carte ou de compte sont conservés.
        </p>
      )}
    </div>
  );
}
