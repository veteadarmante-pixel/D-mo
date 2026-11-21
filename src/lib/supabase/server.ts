import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { isAllowedEmail, supabasePublicEnv } from "@/lib/env";

/** Client Supabase côté serveur, au nom de l'utilisateur connecté (RLS active). */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Appelé depuis un Server Component : le proxy rafraîchit la session.
        }
      },
    },
  });
}

/** Renvoie le client et l'utilisateur ; redirige vers /login sinon. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    redirect("/login");
  }
  return { supabase, user };
}
