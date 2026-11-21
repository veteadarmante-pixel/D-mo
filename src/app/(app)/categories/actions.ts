"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { messageErreurDb, parseMontant, texte } from "@/lib/parse";
import { COULEURS_NEUTRES, type FormState } from "@/lib/types";

function lireCategorie(formData: FormData) {
  const nom = texte(formData.get("nom"));
  if (!nom) throw new Error("Donnez un nom à la catégorie.");
  const budget = parseMontant(formData.get("budget_mensuel"));
  if (budget === null && texte(formData.get("budget_mensuel")) !== "") {
    throw new Error("Budget invalide.");
  }
  if ((budget ?? 0) < 0) throw new Error("Le budget ne peut pas être négatif.");
  const couleur = texte(formData.get("couleur_neutre"));
  return {
    nom,
    budget_mensuel: budget ?? 0,
    couleur_neutre: COULEURS_NEUTRES.includes(couleur) ? couleur : "#737373",
  };
}

export async function creerCategorie(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  let valeurs;
  try {
    valeurs = lireCategorie(formData);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const { error } = await supabase.from("categories").insert(valeurs);
  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "Une catégorie porte déjà ce nom." : messageErreurDb(error),
    };
  }
  revalidatePath("/categories");
  return { ok: true, message: `Catégorie « ${valeurs.nom} » ajoutée.`, cle: Date.now() };
}

export async function modifierCategorie(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  let valeurs;
  try {
    valeurs = lireCategorie(formData);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const { error } = await supabase.from("categories").update(valeurs).eq("id", id);
  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "Une catégorie porte déjà ce nom." : messageErreurDb(error),
    };
  }
  revalidatePath("/categories");
  redirect("/categories");
}

export async function supprimerCategorie(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("categories").delete().eq("id", id);
  revalidatePath("/categories");
  redirect("/categories");
}
