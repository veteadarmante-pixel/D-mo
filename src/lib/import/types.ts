import { z } from "zod";
import type { TypeTransaction } from "@/lib/types";

/** Mouvement candidat, avant enregistrement (aperçu). */
export interface MouvementCandidat {
  date: string; // AAAA-MM-JJ
  description: string;
  commerce: string | null;
  montant: number; // toujours positif
  type: TypeTransaction;
  categorie_id?: string | null;
}

/** Validation des mouvements envoyés par le navigateur. */
export const schemaCandidat = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(1).max(500),
  commerce: z.string().trim().max(200).nullable(),
  montant: z.number().positive().max(10_000_000),
  type: z.enum(["depense", "revenu"]),
  categorie_id: z.string().uuid().nullable().optional(),
});
