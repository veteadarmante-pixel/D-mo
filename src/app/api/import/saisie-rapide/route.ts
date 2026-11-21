import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/env";
import { aujourdhui } from "@/lib/format";
import { estDateIso } from "@/lib/parse";
import { masquerNumeros } from "@/lib/securite";
import { interpreterSaisie } from "@/lib/import/extraction";
import { ErreurIA } from "@/lib/anthropic";

export const maxDuration = 60;

const corps = z.object({ texte: z.string().trim().min(2).max(300) });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Écrivez au moins un montant et un mot." }, { status: 400 });

  const [{ data: categories }, { data: comptes }] = await Promise.all([
    supabase.from("categories").select("id, nom"),
    supabase.from("comptes").select("id, nom, type"),
  ]);
  const jour = aujourdhui();

  try {
    const r = await interpreterSaisie(masquerNumeros(parsed.data.texte), {
      aujourdhui: jour,
      categories: (categories ?? []).map((c) => c.nom as string),
      comptes: (comptes ?? []).map((c) => ({ nom: c.nom as string, type: c.type as string })),
    });
    const categorie = categories?.find((c) => c.nom === r.categorie);
    const compte = comptes?.find((c) => c.nom === r.compte);
    return NextResponse.json({
      mouvement: {
        date: r.date && estDateIso(r.date) ? r.date : jour,
        description: masquerNumeros(r.description.trim() || parsed.data.texte),
        commerce: r.commerce ? masquerNumeros(r.commerce) : null,
        montant: Math.round(Math.abs(r.montant) * 100) / 100,
        type: r.type,
        categorie_id: categorie?.id ?? null,
      },
      compteId: compte?.id ?? null,
    });
  } catch (e) {
    const message = e instanceof ErreurIA ? e.message : "Interprétation impossible.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
