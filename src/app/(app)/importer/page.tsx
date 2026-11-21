import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { ImporterOnglets } from "./importer-onglets";

// L'enregistrement de gros fichiers peut prendre un peu de temps.
export const maxDuration = 60;

const LIBELLES_STATUT: Record<string, string> = {
  en_attente: "en attente",
  analyse: "analyse en cours",
  apercu: "non confirmé",
  enregistre: "enregistré",
  erreur: "erreur",
};

export default async function ImporterPage() {
  const { supabase } = await requireUser();
  const [{ data: comptes }, { data: categories }, { data: imports }] = await Promise.all([
    supabase.from("comptes").select("id, nom").order("created_at"),
    supabase.from("categories").select("id, nom").order("nom"),
    supabase
      .from("imports")
      .select("id, nom_fichier, statut, mouvements_detectes, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader titre="Ajouter" description="En une ligne, depuis un fichier ou un relevé PDF.">
        <Link href="/transactions/nouveau" className="text-sm text-muted-foreground hover:underline">
          Formulaire détaillé
        </Link>
      </PageHeader>
      <Card>
        <CardContent>
          <ImporterOnglets comptes={comptes ?? []} categories={categories ?? []} />
        </CardContent>
      </Card>

      {imports && imports.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Derniers imports</h2>
          <ul className="flex flex-col divide-y rounded-xl border text-sm">
            {imports.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 p-3">
                <span className="truncate">{i.nom_fichier}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(String(i.created_at))} · {i.mouvements_detectes} mvts · {LIBELLES_STATUT[i.statut] ?? i.statut}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
