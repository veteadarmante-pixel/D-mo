/**
 * Détection des charges récurrentes : même libellé (normalisé), présent
 * plusieurs mois de suite avec un montant similaire.
 */

export interface MouvementPourRecurrence {
  id: string;
  date: string;
  description_originale: string;
  commerce: string | null;
  montant: number;
  type: "depense" | "revenu";
}

/** Clé de regroupement : libellé sans dates, chiffres, préfixes bancaires. */
export function cleLibelle(m: Pick<MouvementPourRecurrence, "description_originale" | "commerce">): string {
  const base = (m.commerce || m.description_originale).toLowerCase();
  return base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(cb|carte|prlv|prelevement|sepa|vir|virement|paiement|achat|du|le|fact(ure)?)\b/g, " ")
    .replace(/•+/g, " ")
    .replace(/\d+/g, " ")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const mediane = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const indexMois = (date: string) => {
  const [y, m] = date.split("-").map(Number);
  return y * 12 + m;
};

/**
 * Renvoie les identifiants des mouvements récurrents.
 * Règle : au moins 3 mois distincts (ou 2 mois consécutifs avec un montant
 * identique), au plus ~1 occurrence par mois, et tous les montants
 * à ±15 % de la médiane.
 */
export function detecterRecurrents(mouvements: MouvementPourRecurrence[]): Set<string> {
  const groupes = new Map<string, MouvementPourRecurrence[]>();
  for (const m of mouvements) {
    if (m.type !== "depense") continue;
    const cle = cleLibelle(m);
    if (cle.length < 3) continue;
    const g = groupes.get(cle) ?? [];
    g.push(m);
    groupes.set(cle, g);
  }

  const ids = new Set<string>();
  for (const g of groupes.values()) {
    const mois = [...new Set(g.map((m) => indexMois(m.date)))].sort((a, b) => a - b);
    if (mois.length < 2) continue;
    if (g.length > mois.length * 1.5) continue; // achats fréquents (courses…)
    const med = mediane(g.map((m) => m.montant));
    if (med <= 0) continue;
    const ecartMax = Math.max(...g.map((m) => Math.abs(m.montant - med) / med));

    const consecutifs = mois.some((v, i) => i > 0 && v - mois[i - 1] === 1);
    const ok =
      (mois.length >= 3 && ecartMax <= 0.15 && consecutifs) ||
      (mois.length === 2 && consecutifs && ecartMax <= 0.005);
    if (ok) g.forEach((m) => ids.add(m.id));
  }
  return ids;
}
