/**
 * Lit un montant saisi à la française ou à l'anglaise :
 * « 1 234,56 », « 1234.56 », « 12,5 € », « -35 ».
 */
export function parseMontant(raw: FormDataEntryValue | string | null | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).replace(/[\s  €]/g, "").replace(/EUR/i, "");
  if (!s) return null;
  // « 1.234,56 » → « 1234.56 »
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  } else {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Jour du mois 1–31, ou null si vide. Lève une erreur si invalide. */
export function parseJour(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1 || n > 31) {
    throw new Error("Le jour doit être un nombre entre 1 et 31.");
  }
  return n;
}

export function texte(raw: FormDataEntryValue | null): string {
  return String(raw ?? "").trim();
}

/** Date AAAA-MM-JJ valide ? */
export function estDateIso(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Message lisible pour les erreurs Supabase fréquentes. */
export function messageErreurDb(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Cet élément existe déjà (doublon).";
  if (error.code === "23503") return "Élément lié introuvable.";
  if (error.code === "23514") return "Une valeur ne respecte pas les règles (vérifiez les montants et jours).";
  return error.message;
}
