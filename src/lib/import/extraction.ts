import "server-only";
import { z } from "zod";
import { appelStructure } from "@/lib/anthropic";
import { masquerNumeros } from "@/lib/securite";
import { estDateIso } from "@/lib/parse";
import type { MouvementCandidat } from "./types";

const schemaReleve = z.object({
  compte_detecte: z
    .string()
    .nullable()
    .describe("Nom du compte ou de la carte, avec au plus les 4 derniers chiffres (ex. « Visa •••• 4821 »)."),
  mouvements: z.array(
    z.object({
      date: z.string().describe("Date de l'opération au format AAAA-MM-JJ"),
      description: z.string().describe("Libellé tel qu'il apparaît sur le relevé"),
      commerce: z.string().nullable().describe("Nom lisible du commerçant ou de l'émetteur, ou null"),
      montant: z.number().describe("Montant positif, en euros"),
      type: z.enum(["depense", "revenu"]),
    }),
  ),
});

/** Extrait les mouvements d'un relevé bancaire PDF. */
export async function extraireReleve(pdfBase64: string): Promise<{
  compteDetecte: string | null;
  mouvements: MouvementCandidat[];
}> {
  const resultat = await appelStructure({
    schema: schemaReleve,
    consigne: `Tu extrais les opérations d'un relevé bancaire français.
- Une entrée par opération : n'invente rien, n'ajoute ni soldes, ni totaux, ni reports « ancien / nouveau solde ».
- Débit / paiement / prélèvement / retrait = « depense » ; crédit / virement reçu / remboursement = « revenu ».
- Montant toujours positif. Dates au format AAAA-MM-JJ (déduis l'année de la période du relevé si elle n'est pas écrite).
- « commerce » : nom court et lisible (ex. « CB CARREFOUR 0211 PARIS » → « Carrefour »).`,
    contenu: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
      { type: "text", text: "Extrais toutes les opérations de ce relevé." },
    ],
    maxTokens: 32000,
  });

  const mouvements = resultat.mouvements
    .filter((m) => estDateIso(m.date) && Math.abs(m.montant) > 0 && m.description.trim())
    .map((m) => ({
      date: m.date,
      description: masquerNumeros(m.description.trim()),
      commerce: m.commerce ? masquerNumeros(m.commerce.trim()) : null,
      montant: Math.round(Math.abs(m.montant) * 100) / 100,
      type: m.type,
    }));
  return {
    compteDetecte: resultat.compte_detecte ? masquerNumeros(resultat.compte_detecte) : null,
    mouvements,
  };
}

const schemaSaisie = z.object({
  montant: z.number().describe("Montant positif en euros"),
  type: z.enum(["depense", "revenu"]),
  description: z.string().describe("Description courte, ex. « Supermarché »"),
  commerce: z.string().nullable(),
  date: z.string().nullable().describe("AAAA-MM-JJ si une date est indiquée (« hier », « le 3 »), sinon null"),
  categorie: z.string().nullable().describe("Nom EXACT d'une catégorie de la liste, ou null"),
  compte: z.string().nullable().describe("Nom EXACT d'un compte de la liste, ou null"),
});

/** Interprète une saisie libre en une ligne (« 350 supermarché par carte »). */
export async function interpreterSaisie(
  texte: string,
  contexte: { aujourdhui: string; categories: string[]; comptes: { nom: string; type: string }[] },
) {
  return appelStructure({
    schema: schemaSaisie,
    effort: "low",
    maxTokens: 4000,
    consigne: `Tu transformes une note de dépense ou de revenu écrite en une ligne en mouvement structuré.
Aujourd'hui : ${contexte.aujourdhui} (fuseau Europe/Paris). Devise : euro.
Catégories disponibles : ${contexte.categories.join(", ") || "(aucune)"}.
Comptes disponibles : ${contexte.comptes.map((c) => `${c.nom} [${c.type}]`).join(", ") || "(aucun)"}.
- Sans indication contraire, c'est une dépense.
- « par carte » → compte de type debit ou credit ; « en espèces / cash » → compte de type especes.
- Choisis la catégorie la plus plausible dans la liste, ou null.`,
    contenu: [{ type: "text", text: texte }],
  });
}
