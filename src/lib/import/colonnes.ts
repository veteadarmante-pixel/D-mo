/**
 * Détection automatique des colonnes d'un relevé CSV / Excel
 * et conversion des lignes en mouvements.
 * Fonctions pures : utilisables côté navigateur et testables.
 */
import type { MouvementCandidat } from "./types";

export type Cellule = string | number | boolean | Date | null | undefined;

export interface Correspondance {
  ligneEntete: number; // index de la ligne d'en-tête (-1 = aucune)
  date: number | null;
  description: number | null;
  montant: number | null; // montant signé
  debit: number | null; // ou colonnes débit / crédit séparées
  credit: number | null;
}

export type ModeSigne = "negatif_depense" | "positif_depense";

const MOTS = {
  date: /^(date|date op|date d'?op|date de l'?op|jour|date comptable|booking date|transaction date)/i,
  dateFaible: /date/i,
  description: /(libell|description|label|d[ée]tail|intitul|nature|motif|m[ée]mo|wording|op[ée]ration|payee|b[ée]n[ée]ficiaire)/i,
  montant: /(montant|amount|somme|valeur(?! date)|^eur|€)/i,
  debit: /(d[ée]bit|sortie|withdrawal|d[ée]pense)/i,
  credit: /(cr[ée]dit|entr[ée]e|deposit|recette)/i,
};

const norm = (c: Cellule) => (c == null ? "" : String(c).trim());

/** Convertit une cellule en nombre (« 1 234,56 », « -12.5 », « 12,00 € »). */
export function versNombre(c: Cellule): number | null {
  if (typeof c === "number") return Number.isFinite(c) ? c : null;
  let s = norm(c).replace(/[\s  €]|EUR/gi, "");
  if (!s) return null;
  let negatif = false;
  if (/^\(.*\)$/.test(s)) {
    negatif = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negatif = true;
    s = s.slice(0, -1);
  }
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else {
    s = s.replace(",", ".");
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return negatif ? -Math.abs(n) : n;
}

/** Convertit une cellule en date AAAA-MM-JJ (formats français prioritaires). */
export function versDate(c: Cellule): string | null {
  const iso = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    if (y < 1990 || y > 2100) return null;
    return dt.toISOString().slice(0, 10);
  };
  if (c instanceof Date) {
    return Number.isNaN(c.getTime()) ? null : iso(c.getUTCFullYear(), c.getUTCMonth() + 1, c.getUTCDate());
  }
  if (typeof c === "number") {
    // Numéro de série Excel (jours depuis 1899-12-30)
    if (c > 30000 && c < 80000) {
      const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(c) * 86400000);
      return dt.toISOString().slice(0, 10);
    }
    return null;
  }
  const s = norm(c);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) return iso(+m[3], +m[2], +m[1]); // JJ/MM/AAAA
  return null;
}

function colonneParContenu(lignes: Cellule[][], depuis: number, test: (c: Cellule) => boolean, exclure: (number | null)[]) {
  const nbCol = Math.max(0, ...lignes.map((l) => l.length));
  let meilleure: number | null = null;
  let score = 0;
  for (let j = 0; j < nbCol; j++) {
    if (exclure.includes(j)) continue;
    const valeurs = lignes.slice(depuis, depuis + 30).map((l) => l[j]).filter((v) => norm(v) !== "");
    if (!valeurs.length) continue;
    const s = valeurs.filter(test).length / valeurs.length;
    if (s > score) {
      score = s;
      meilleure = j;
    }
  }
  return score >= 0.6 ? meilleure : null;
}

/** Devine la ligne d'en-tête et le rôle de chaque colonne. */
export function detecterColonnes(lignes: Cellule[][]): Correspondance {
  let ligneEntete = -1;
  let meilleurScore = 0;
  for (let i = 0; i < Math.min(lignes.length, 20); i++) {
    const cells = lignes[i].map(norm);
    const score =
      (cells.some((c) => MOTS.dateFaible.test(c)) ? 1 : 0) +
      (cells.some((c) => MOTS.description.test(c)) ? 1 : 0) +
      (cells.some((c) => MOTS.montant.test(c) || MOTS.debit.test(c) || MOTS.credit.test(c)) ? 1 : 0);
    if (score > meilleurScore) {
      meilleurScore = score;
      ligneEntete = i;
    }
  }
  if (meilleurScore < 2) ligneEntete = -1;

  const res: Correspondance = { ligneEntete, date: null, description: null, montant: null, debit: null, credit: null };

  if (ligneEntete >= 0) {
    const entete = lignes[ligneEntete].map(norm);
    const trouver = (re: RegExp, exclure: (number | null)[] = []) => {
      const j = entete.findIndex((c, k) => re.test(c) && !exclure.includes(k));
      return j >= 0 ? j : null;
    };
    // Colonnes de dates (« Date valeur »…) : jamais des montants ni des libellés.
    const colonnesDates = entete.map((c, k) => (MOTS.dateFaible.test(c) ? k : null)).filter((k) => k !== null);
    res.date = trouver(MOTS.date) ?? trouver(MOTS.dateFaible);
    res.debit = trouver(MOTS.debit, [...colonnesDates]);
    res.credit = trouver(MOTS.credit, [...colonnesDates, res.debit]);
    res.montant = trouver(MOTS.montant, [...colonnesDates, res.debit, res.credit]);
    res.description = trouver(MOTS.description, [...colonnesDates, res.debit, res.credit, res.montant]);
    if (res.montant !== null) {
      res.debit = null;
      res.credit = null;
    }
  }

  const depuis = ligneEntete + 1;
  // Compléments par le contenu si l'en-tête ne suffit pas
  if (res.date === null) res.date = colonneParContenu(lignes, depuis, (c) => versDate(c) !== null, []);
  if (res.montant === null && res.debit === null && res.credit === null) {
    res.montant = colonneParContenu(lignes, depuis, (c) => versNombre(c) !== null, [res.date]);
  }
  if (res.description === null) {
    // Colonne de texte la plus longue en moyenne
    const nbCol = Math.max(0, ...lignes.map((l) => l.length));
    let best: number | null = null;
    let longueur = 0;
    for (let j = 0; j < nbCol; j++) {
      if ([res.date, res.montant, res.debit, res.credit].includes(j)) continue;
      const vals = lignes.slice(depuis, depuis + 30).map((l) => norm(l[j]));
      const moy = vals.reduce((s, v) => s + (versNombre(v) === null ? v.length : 0), 0) / (vals.length || 1);
      if (moy > longueur) {
        longueur = moy;
        best = j;
      }
    }
    res.description = best;
  }
  return res;
}

export interface ResultatConversion {
  mouvements: MouvementCandidat[];
  ignorees: number;
}

/** Applique la correspondance choisie aux lignes de données. */
export function convertirLignes(
  lignes: Cellule[][],
  c: Correspondance,
  modeSigne: ModeSigne = "negatif_depense",
): ResultatConversion {
  const mouvements: MouvementCandidat[] = [];
  let ignorees = 0;
  for (const ligne of lignes.slice(c.ligneEntete + 1)) {
    if (!ligne || ligne.every((v) => norm(v) === "")) continue;
    const date = c.date !== null ? versDate(ligne[c.date]) : null;
    const description = c.description !== null ? norm(ligne[c.description]).replace(/\s+/g, " ") : "";

    let signe: number | null = null;
    if (c.montant !== null) {
      signe = versNombre(ligne[c.montant]);
      if (signe !== null && modeSigne === "positif_depense") signe = -signe;
    } else {
      const d = c.debit !== null ? versNombre(ligne[c.debit]) : null;
      const cr = c.credit !== null ? versNombre(ligne[c.credit]) : null;
      if (d) signe = -Math.abs(d);
      else if (cr) signe = Math.abs(cr);
    }

    if (!date || !description || signe === null || signe === 0) {
      ignorees++;
      continue;
    }
    mouvements.push({
      date,
      description,
      commerce: null,
      montant: Math.round(Math.abs(signe) * 100) / 100,
      type: signe < 0 ? "depense" : "revenu",
    });
  }
  return { mouvements, ignorees };
}
