"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { enregistrerMouvements } from "@/lib/mouvements";
import { schemaCandidat } from "@/lib/import/types";

const schemaConfirmation = z.object({
  mouvements: z.array(schemaCandidat).min(1).max(5000),
  compteId: z.string().uuid().nullable(),
  importId: z.string().uuid().nullable(),
  nomFichier: z.string().max(255).nullable(),
});

export type ResultatImport = { ok: boolean; message: string };

/** Enregistre les mouvements validés dans l'aperçu (CSV, Excel, PDF ou saisie rapide). */
export async function confirmerImport(entree: z.input<typeof schemaConfirmation>): Promise<ResultatImport> {
  const parsed = schemaConfirmation.safeParse(entree);
  if (!parsed.success) return { ok: false, message: "Données invalides : vérifiez l'aperçu." };
  const { mouvements, compteId, nomFichier } = parsed.data;
  let { importId } = parsed.data;

  const { supabase } = await requireUser();
  try {
    // Fichier CSV / Excel : on garde une trace de l'import.
    if (!importId && nomFichier) {
      const { data } = await supabase
        .from("imports")
        .insert({ nom_fichier: nomFichier, statut: "apercu", mouvements_detectes: mouvements.length })
        .select("id")
        .single();
      importId = data?.id ?? null;
    }

    const bilan = await enregistrerMouvements(supabase, mouvements, { compteId, importId });

    if (importId) {
      await supabase.from("imports").update({ statut: "enregistre" }).eq("id", importId);
    }
    revalidatePath("/", "layout");

    const morceaux = [`${bilan.ajoutes} mouvement${bilan.ajoutes > 1 ? "s" : ""} ajouté${bilan.ajoutes > 1 ? "s" : ""}`];
    if (bilan.doublons) morceaux.push(`${bilan.doublons} doublon${bilan.doublons > 1 ? "s" : ""} ignoré${bilan.doublons > 1 ? "s" : ""}`);
    if (bilan.invalides) morceaux.push(`${bilan.invalides} ligne${bilan.invalides > 1 ? "s" : ""} invalide${bilan.invalides > 1 ? "s" : ""}`);
    return { ok: true, message: morceaux.join(" · ") };
  } catch (e) {
    if (importId) await supabase.from("imports").update({ statut: "erreur" }).eq("id", importId);
    return { ok: false, message: `Enregistrement impossible : ${(e as Error).message}` };
  }
}
