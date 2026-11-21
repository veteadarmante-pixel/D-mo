/**
 * Règles de sécurité appliquées à tout texte importé :
 * jamais de numéro de carte ou de compte complet — on ne garde que
 * les 4 derniers chiffres.
 */

// 12 à 19 chiffres, éventuellement séparés par des espaces, tirets ou points.
const NUMERO_LONG = /\b\d(?:[ .-]?\d){11,18}\b/g;
// IBAN (FR76 3000 6000 0112 3456 7890 189, etc.)
const IBAN = /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g;
// Numéros partiellement masqués mais encore trop longs : « 4970 XXXX XXXX 1234 »
const CARTE_MASQUEE = /\b\d{4}[ -]?(?:[X*•]{4}[ -]?){2}(\d{4})\b/gi;

function quatreDerniers(s: string): string {
  const chiffres = s.replace(/\D/g, "");
  return `•••• ${chiffres.slice(-4)}`;
}

export function masquerNumeros(texte: string): string {
  return texte
    .replace(IBAN, (m) => quatreDerniers(m))
    .replace(CARTE_MASQUEE, (_m, fin: string) => `•••• ${fin}`)
    .replace(NUMERO_LONG, (m) => quatreDerniers(m));
}

/** Instruction ajoutée au system prompt de CHAQUE appel à l'API Anthropic. */
export const REGLES_SYSTEME = `Règles impératives :
- Tu ne donnes jamais de recommandation d'investissement, ni de conseil d'achat ou de vente d'actions, d'obligations, de cryptomonnaies, de fonds ou de tout autre instrument financier. Si on te le demande, réponds que ce n'est pas le rôle de cette application.
- Tu ne recopies jamais un numéro de carte, de compte ou un IBAN complet : uniquement les 4 derniers chiffres, sous la forme « •••• 1234 ».
- Tu ne recopies jamais de mot de passe, code, identifiant ou information de connexion bancaire.`;
