import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/supabase/server";
import { formatMontant } from "@/lib/format";
import type { Categorie } from "@/lib/types";
import { CategorieForm } from "./categorie-form";
import { creerCategorie } from "./actions";

export default async function CategoriesPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("categories")
    .select("id, nom, budget_mensuel, couleur_neutre")
    .order("nom");
  const categories = (data ?? []) as Categorie[];
  const totalBudget = categories.reduce((s, c) => s + Number(c.budget_mensuel), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titre="Catégories"
        description={`Budget mensuel total : ${formatMontant(totalBudget)}`}
      />

      <ul className="flex flex-col divide-y rounded-xl border">
        {categories.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">Aucune catégorie pour l&apos;instant.</li>
        )}
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/categories/${c.id}`}
              className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
            >
              <span
                className="size-3 shrink-0 rounded-full ring-1 ring-border"
                style={{ backgroundColor: c.couleur_neutre }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-medium">{c.nom}</span>
              <span className="montant text-sm text-muted-foreground">
                {Number(c.budget_mensuel) > 0 ? `${formatMontant(c.budget_mensuel)} / mois` : "sans budget"}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <CategorieForm action={creerCategorie} />
        </CardContent>
      </Card>
    </div>
  );
}
