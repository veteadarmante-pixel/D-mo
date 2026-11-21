"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { calculerHashUnique } from "@/lib/dedupe";
import { estDateIso, messageErreurDb, parseMontant, texte } from "@/lib/parse";
import type { FormState, TypeTransaction } from "@/lib/types";

function lireTransaction(formData: FormData) {
  const montantBrut = parseMontant(formData.get("montant"));
  if (montantBrut === null || montantBrut === 0) throw new Error("Saisissez un montant.");
  const type = texte(formData.get("type")) as TypeTransaction;
  if (type !== "depense" && type !== "revenu") throw new Error("Choisissez dépense ou revenu.");
  const date = texte(formData.get("date"));
  if (!estDateIso(date)) throw new Error("Date invalide.");
  const description = texte(formData.get("description"));
  if (!description) throw new Error("Ajoutez une description (ex. « Supermarché »).");
  const commerce = texte(formData.get("commerce")) || description;
  const montant = Math.abs(montantBrut);

  return {
    date,
    type,
    montant,
    description_originale: description,
    commerce,
    categorie_id: texte(formData.get("categorie_id")) || null,
    compte_id: texte(formData.get("compte_id")) || null,
    hash_unique: calculerHashUnique(date, montant, description),
  };
}

const MESSAGE_DOUBLON =
  "Ce mouvement existe déjà (même date, même montant, même description).";

export async function creerTransaction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  let valeurs;
  try {
    valeurs = lireTransaction(formData);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const { error } = await supabase
    .from("transactions")
    .insert({ ...valeurs, necessite_revision: false });
  if (error) {
    return { ok: false, message: error.code === "23505" ? MESSAGE_DOUBLON : messageErreurDb(error) };
  }

  // Option : répercuter le mouvement sur le solde du compte.
  if (valeurs.compte_id && formData.get("maj_solde") === "on") {
    const { data: compte } = await supabase
      .from("comptes")
      .select("solde_actuel")
      .eq("id", valeurs.compte_id)
      .maybeSingle();
    if (compte) {
      const delta = valeurs.type === "revenu" ? valeurs.montant : -valeurs.montant;
      await supabase
        .from("comptes")
        .update({ solde_actuel: Math.round((Number(compte.solde_actuel) + delta) * 100) / 100 })
        .eq("id", valeurs.compte_id);
    }
  }

  revalidatePath("/", "layout");
  const signe = valeurs.type === "revenu" ? "+" : "−";
  return {
    ok: true,
    message: `Enregistré : ${signe}${valeurs.montant.toFixed(2).replace(".", ",")} € · ${valeurs.commerce}`,
    cle: Date.now(),
  };
}

export async function modifierTransaction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  let valeurs;
  try {
    valeurs = lireTransaction(formData);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  // Une modification manuelle vaut validation : plus besoin de revue.
  const { error } = await supabase
    .from("transactions")
    .update({ ...valeurs, necessite_revision: false })
    .eq("id", id);
  if (error) {
    return { ok: false, message: error.code === "23505" ? MESSAGE_DOUBLON : messageErreurDb(error) };
  }
  revalidatePath("/", "layout");
  redirect(`/transactions?mois=${valeurs.date.slice(0, 7)}`);
}

export async function supprimerTransaction(id: string, mois: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect(`/transactions?mois=${mois}`);
}
