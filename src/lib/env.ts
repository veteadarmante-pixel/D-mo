/**
 * Lecture centralisée des variables d'environnement.
 * Aucune clé n'est jamais écrite dans le code.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/Paris";
export const APP_CURRENCY = "EUR";
export const APP_LOCALE = "fr-FR";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Voir .env.example et le README.`,
    );
  }
  return value;
}

export function supabasePublicEnv() {
  // Accès explicite pour que Next.js puisse injecter ces valeurs côté navigateur.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies.",
    );
  }
  return { url, anonKey };
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!allowed || !email) return false;
  return email.trim().toLowerCase() === allowed;
}
