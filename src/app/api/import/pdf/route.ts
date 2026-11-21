import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/env";
import { extraireReleve } from "@/lib/import/extraction";
import { ErreurIA } from "@/lib/anthropic";

// L'analyse d'un relevé peut prendre plus d'une minute.
export const maxDuration = 300;

const corps = z.object({ chemin: z.string().min(1), nomFichier: z.string().min(1).max(255) });

/** Analyse un PDF déjà déposé dans le bucket privé « releves ». */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const { chemin, nomFichier } = parsed.data;
  if (!chemin.startsWith(`${user.id}/`) || chemin.includes("..")) {
    return NextResponse.json({ error: "Chemin interdit" }, { status: 403 });
  }

  const { data: imp, error: errImport } = await supabase
    .from("imports")
    .insert({ nom_fichier: nomFichier, chemin_storage: chemin, statut: "analyse" })
    .select("id")
    .single();
  if (errImport) return NextResponse.json({ error: errImport.message }, { status: 500 });

  try {
    const { data: fichier, error } = await supabase.storage.from("releves").download(chemin);
    if (error || !fichier) throw new Error(error?.message ?? "Fichier introuvable dans le stockage.");
    const base64 = Buffer.from(await fichier.arrayBuffer()).toString("base64");

    const resultat = await extraireReleve(base64);
    await supabase
      .from("imports")
      .update({ statut: "apercu", mouvements_detectes: resultat.mouvements.length })
      .eq("id", imp.id);

    return NextResponse.json({ importId: imp.id, ...resultat });
  } catch (e) {
    await supabase.from("imports").update({ statut: "erreur" }).eq("id", imp.id);
    const message = e instanceof ErreurIA ? e.message : `Analyse impossible : ${(e as Error).message}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
