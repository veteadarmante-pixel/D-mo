"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string };

export async function chargerDonneesExemple(): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("seed_donnees_exemple");
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: String(data ?? "Données d'exemple chargées.") };
}

export async function supprimerMesDonnees(): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("reinitialiser_mes_donnees");
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Toutes vos données ont été supprimées." };
}
