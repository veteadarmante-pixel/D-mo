import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { requireEnv } from "./env";
import { REGLES_SYSTEME } from "./securite";

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

// Modèles qui acceptent le repli automatique côté serveur en cas de refus.
const MODELES_AVEC_REPLI = new Set([
  "claude-sonnet-5-5",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-fable-5-1",
  "claude-fable-5-2",
]);

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  return client;
}

export class ErreurIA extends Error {}

/**
 * Appel à Claude avec sortie JSON validée par un schéma Zod.
 * Le system prompt contient toujours les règles de sécurité de l'application.
 */
export async function appelStructure<S extends z.ZodType>(options: {
  schema: S;
  consigne: string;
  contenu: Anthropic.Beta.BetaContentBlockParam[];
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  const repli = MODELES_AVEC_REPLI.has(ANTHROPIC_MODEL);

  let reponse;
  try {
    // Streaming : obligatoire pour les réponses longues (relevés de plusieurs pages).
    const flux = getClient().beta.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: options.maxTokens ?? 16000,
      system: `${options.consigne}\n\n${REGLES_SYSTEME}`,
      messages: [{ role: "user", content: options.contenu }],
      output_config: {
        format: betaZodOutputFormat(options.schema),
        effort: options.effort ?? "medium",
      },
      ...(repli
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
    });
    reponse = await flux.finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      throw new ErreurIA("Clé ANTHROPIC_API_KEY invalide : vérifiez-la dans Vercel.");
    }
    if (e instanceof Anthropic.PermissionDeniedError) {
      throw new ErreurIA("Accès refusé par l'API Anthropic (crédits ou droits du compte).");
    }
    if (e instanceof Anthropic.NotFoundError) {
      throw new ErreurIA(`Modèle introuvable : « ${ANTHROPIC_MODEL} ». Vérifiez ANTHROPIC_MODEL.`);
    }
    if (e instanceof Anthropic.RateLimitError) {
      throw new ErreurIA("Trop de demandes à l'API Anthropic : réessayez dans une minute.");
    }
    if (e instanceof Anthropic.BadRequestError) {
      throw new ErreurIA(`Requête refusée par l'API Anthropic : ${e.message}`);
    }
    if (e instanceof Anthropic.APIError) {
      throw new ErreurIA(`Erreur de l'API Anthropic (${e.status ?? "réseau"}) : réessayez.`);
    }
    throw e;
  }

  if (reponse.stop_reason === "refusal") {
    throw new ErreurIA("L'IA a refusé de traiter ce contenu.");
  }
  if (reponse.stop_reason === "max_tokens") {
    throw new ErreurIA("Document trop long pour être analysé en une fois : découpez-le.");
  }
  if (!reponse.parsed_output) {
    throw new ErreurIA("Réponse de l'IA illisible : réessayez.");
  }
  return reponse.parsed_output as z.infer<S>;
}
