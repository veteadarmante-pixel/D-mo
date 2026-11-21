import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculerHashUnique } from "./dedupe";
import { masquerNumeros } from "./securite";
import { detecterRecurrents, type MouvementPourRecurrence } from "./recurrence";
import { estDateIso } from "./parse";
import type { MouvementCandidat } from "./import/types";

export interface BilanEnregistrement {
  ajoutes: number;
  doublons: number;
  invalides: number;
}

function paquets<T>(liste: T[], taille: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < liste.length; i += taille) res.push(liste.slice(i, i + taille));
  return res;
}

/**
 * Enregistre des mouvements : masque les numéros sensibles, calcule
 * hash_unique, écarte les doublons, puis met à jour les récurrences.
 */
export async function enregistrerMouvements(
  supabase: SupabaseClient,
  candidats: MouvementCandidat[],
  options: { compteId?: string | null; importId?: string | null } = {},
): Promise<BilanEnregistrement & { ids: string[] }> {
  let invalides = 0;
  let doublons = 0;
  const vus = new Set<string>();
  const lignes = [];

  for (const c of candidats) {
    const description = masquerNumeros(c.description).trim();
    const montant = Math.round(Math.abs(c.montant) * 100) / 100;
    if (!estDateIso(c.date) || !description || !(montant > 0)) {
      invalides++;
      continue;
    }
    const hash = calculerHashUnique(c.date, montant, description);
    if (vus.has(hash)) {
      doublons++;
      continue;
    }
    vus.add(hash);
    lignes.push({
      date: c.date,
      description_originale: description,
      commerce: c.commerce ? masquerNumeros(c.commerce).trim() : null,
      montant,
      type: c.type,
      categorie_id: c.categorie_id ?? null,
      compte_id: options.compteId ?? null,
      import_id: options.importId ?? null,
      hash_unique: hash,
    });
  }

  // Doublons déjà présents en base
  const existants = new Set<string>();
  for (const p of paquets(lignes.map((l) => l.hash_unique), 200)) {
    const { data, error } = await supabase.from("transactions").select("hash_unique").in("hash_unique", p);
    if (error) throw new Error(error.message);
    data?.forEach((r) => existants.add(r.hash_unique as string));
  }
  const nouvelles = lignes.filter((l) => !existants.has(l.hash_unique));
  doublons += lignes.length - nouvelles.length;

  const ids: string[] = [];
  for (const p of paquets(nouvelles, 500)) {
    const { data, error } = await supabase
      .from("transactions")
      .upsert(p, { onConflict: "user_id,hash_unique", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(error.message);
    data?.forEach((r) => ids.push(r.id as string));
  }
  doublons += nouvelles.length - ids.length;

  if (ids.length) await appliquerRecurrences(supabase);
  return { ajoutes: ids.length, doublons, invalides, ids };
}

/** Marque est_recurrente sur les dépenses des 13 derniers mois. */
export async function appliquerRecurrences(supabase: SupabaseClient): Promise<number> {
  const depuis = new Date();
  depuis.setUTCMonth(depuis.getUTCMonth() - 13);
  const { data, error } = await supabase
    .from("transactions")
    .select("id, date, description_originale, commerce, montant, type, est_recurrente")
    .eq("type", "depense")
    .gte("date", depuis.toISOString().slice(0, 10))
    .limit(10000);
  if (error || !data) return 0;

  const mouvements = data.map((d) => ({ ...d, montant: Number(d.montant) })) as (MouvementPourRecurrence & {
    est_recurrente: boolean;
  })[];
  const recurrents = detecterRecurrents(mouvements);
  const aMarquer = mouvements.filter((m) => recurrents.has(m.id) && !m.est_recurrente).map((m) => m.id);
  for (const p of paquets(aMarquer, 200)) {
    await supabase.from("transactions").update({ est_recurrente: true }).in("id", p);
  }
  return aMarquer.length;
}
