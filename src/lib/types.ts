export type TypeCompte = "debit" | "credit" | "especes" | "epargne";
export type TypeTransaction = "depense" | "revenu";

export const TYPES_COMPTE: { value: TypeCompte; label: string }[] = [
  { value: "debit", label: "Compte courant / carte de débit" },
  { value: "credit", label: "Carte de crédit" },
  { value: "especes", label: "Espèces" },
  { value: "epargne", label: "Épargne" },
];

export function libelleTypeCompte(t: TypeCompte): string {
  return TYPES_COMPTE.find((x) => x.value === t)?.label ?? t;
}

/** Nuances de gris proposées pour les catégories (palette neutre). */
export const COULEURS_NEUTRES = [
  "#171717",
  "#262626",
  "#404040",
  "#525252",
  "#737373",
  "#8a8a8a",
  "#a3a3a3",
  "#d4d4d4",
  "#e5e5e5",
];

export interface Compte {
  id: string;
  nom: string;
  type: TypeCompte;
  jour_cloture: number | null;
  jour_limite_paiement: number | null;
  solde_actuel: number;
}

export interface Categorie {
  id: string;
  nom: string;
  budget_mensuel: number;
  couleur_neutre: string;
}

export interface Transaction {
  id: string;
  compte_id: string | null;
  date: string;
  description_originale: string;
  commerce: string | null;
  montant: number;
  type: TypeTransaction;
  categorie_id: string | null;
  necessite_revision: boolean;
  est_recurrente: boolean;
  hash_unique: string;
}

/** État renvoyé par les server actions aux formulaires. */
export type FormState = { ok: boolean; message: string; cle?: number } | null;
