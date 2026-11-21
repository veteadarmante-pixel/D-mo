"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string };

/** Message d'erreur complet (code, détail, indice) pour faciliter le diagnostic. */
function decrireErreur(error: PostgrestError | Error | unknown): string {
  if (error && typeof error === "object") {
    const e = error as Partial<PostgrestError> & { message?: string };
    const parts = [
      e.message,
      e.code ? `code ${e.code}` : null,
      e.details ? `détail : ${e.details}` : null,
      e.hint ? `indice : ${e.hint}` : null,
    ].filter(Boolean);
    if (parts.length) return parts.join(" — ");
  }
  return String(error);
}

export async function chargerDonneesExemple(): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("seed_donnees_exemple");
    if (error) return { ok: false, message: `Erreur Supabase : ${decrireErreur(error)}` };
    revalidatePath("/", "layout");
    return { ok: true, message: String(data ?? "Données d'exemple chargées.") };
  } catch (e) {
    unstable_rethrow(e); // laisse passer la redirection vers /login
    return { ok: false, message: `Erreur serveur : ${decrireErreur(e)}` };
  }
}

export async function supprimerMesDonnees(): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("reinitialiser_mes_donnees");
    if (error) return { ok: false, message: `Erreur Supabase : ${decrireErreur(error)}` };
    revalidatePath("/", "layout");
    return { ok: true, message: "Toutes vos données ont été supprimées." };
  } catch (e) {
    unstable_rethrow(e); // laisse passer la redirection vers /login
    return { ok: false, message: `Erreur serveur : ${decrireErreur(e)}` };
  }
}
