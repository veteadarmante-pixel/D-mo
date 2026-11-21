import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Categorie, Compte } from "@/lib/types";

export async function chargerOptions(supabase: SupabaseClient) {
  const [{ data: categories }, { data: comptes }] = await Promise.all([
    supabase.from("categories").select("id, nom").order("nom"),
    supabase.from("comptes").select("id, nom").order("created_at"),
  ]);
  return {
    categories: (categories ?? []) as Pick<Categorie, "id" | "nom">[],
    comptes: (comptes ?? []) as Pick<Compte, "id" | "nom">[],
  };
}
