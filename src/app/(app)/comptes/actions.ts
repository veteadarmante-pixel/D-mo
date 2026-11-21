"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { messageErreurDb, parseJour, parseMontant, texte } from "@/lib/parse";
import { TYPES_COMPTE, type FormState, type TypeCompte } from "@/lib/types";

function lireCompte(formData: FormData) {
  const nom = texte(formData.get("nom"));
  const type = texte(formData.get("type")) as TypeCompte;
  if (!nom) throw new Error("Donnez un nom au compte.");
  if (!TYPES_COMPTE.some((t) => t.value === type)) throw new Error("Type de compte invalide.");
  const solde = parseMontant(formData.get("solde_actuel"));
  if (solde === null && texte(formData.get("solde_actuel")) !== "") {
    throw new Error("Solde invalide.");
  }
  // Sécurité : on refuse tout ce qui ressemble à un numéro de carte complet.
  if (/\d{8,}/.test(nom.replace(/[\s-]/g, ""))) {
    throw new Error("N'indiquez jamais un numéro de carte complet : 4 derniers chiffres maximum.");
  }
  return {
    nom,
    type,
    jour_cloture: parseJour(formData.get("jour_cloture")),
    jour_limite_paiement: parseJour(formData.get("jour_limite_paiement")),
    solde_actuel: solde ?? 0,
  };
}

export async function creerCompte(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  let valeurs;
  try {
    valeurs = lireCompte(formData);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const { error } = await supabase.from("comptes").insert(valeurs);
  if (error) return { ok: false, message: messageErreurDb(error) };
  revalidatePath("/comptes");
  return { ok: true, message: `Compte « ${valeurs.nom} » ajouté.`, cle: Date.now() };
}

export async function modifierCompte(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  let valeurs;
  try {
    valeurs = lireCompte(formData);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const { error } = await supabase.from("comptes").update(valeurs).eq("id", id);
  if (error) return { ok: false, message: messageErreurDb(error) };
  revalidatePath("/comptes");
  redirect("/comptes");
}

export async function supprimerCompte(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("comptes").delete().eq("id", id);
  revalidatePath("/comptes");
  redirect("/comptes");
}
