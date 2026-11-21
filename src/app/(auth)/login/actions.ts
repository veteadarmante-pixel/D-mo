"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail, supabasePublicEnv } from "@/lib/env";

export type LoginState = { ok: boolean; message: string } | null;

export async function envoyerLienMagique(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, message: "Saisissez votre adresse email." };

  // Application personnelle : une seule adresse autorisée.
  if (!isAllowedEmail(email)) {
    return { ok: false, message: "Cette adresse n'est pas autorisée." };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    // L'adresse du projet Supabase n'est pas secrète : l'afficher aide au diagnostic.
    let hote = "?";
    try {
      hote = new URL(supabasePublicEnv().url).host;
    } catch {}
    const injoignable = /fetch failed|ENOTFOUND|getaddrinfo/i.test(error.message);
    return {
      ok: false,
      message: injoignable
        ? `Supabase injoignable à l'adresse « ${hote} ». Vérifiez NEXT_PUBLIC_SUPABASE_URL dans Vercel.`
        : `Envoi impossible : ${error.message} (serveur : ${hote})`,
    };
  }
  return {
    ok: true,
    message:
      "Lien envoyé ! Ouvrez l'email sur cet appareil, dans ce même navigateur, et cliquez sur le lien.",
  };
}
