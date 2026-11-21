import { createHash } from "node:crypto";

/** Normalise une description : espaces compactés, minuscules. */
export function normaliserDescription(description: string): string {
  return description.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Empreinte anti-doublon : sha256("AAAA-MM-JJ|montant.00|description").
 * Doit rester identique à public.calcul_hash_unique() dans la migration SQL.
 */
export function calculerHashUnique(date: string, montant: number, description: string): string {
  const base = `${date.slice(0, 10)}|${Math.abs(montant).toFixed(2)}|${normaliserDescription(description)}`;
  return createHash("sha256").update(base, "utf8").digest("hex");
}
