"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/env";

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
    return { ok: false, message: `Envoi impossible : ${error.message}` };
  }
  return {
    ok: true,
    message:
      "Lien envoyé ! Ouvrez l'email sur cet appareil, dans ce même navigateur, et cliquez sur le lien.",
  };
}
