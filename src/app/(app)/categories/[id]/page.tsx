import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/form-bits";
import { requireUser } from "@/lib/supabase/server";
import type { Categorie } from "@/lib/types";
import { CategorieForm } from "../categorie-form";
import { modifierCategorie, supprimerCategorie } from "../actions";

export default async function CategorieEditPage({ params }: PageProps<"/categories/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("categories")
    .select("id, nom, budget_mensuel, couleur_neutre")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const categorie = data as Categorie;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/categories" className="text-sm text-muted-foreground hover:underline">
        ← Catégories
      </Link>
      <PageHeader titre={categorie.nom} />
      <Card>
        <CardContent>
          <CategorieForm
            action={modifierCategorie.bind(null, categorie.id)}
            categorie={categorie}
            boutonLabel="Enregistrer"
          />
        </CardContent>
      </Card>
      <div className="self-start">
        <DeleteButton
          action={supprimerCategorie.bind(null, categorie.id)}
          confirmation={`Supprimer « ${categorie.nom} » ? Les mouvements liés deviendront « sans catégorie » et ses règles seront supprimées.`}
          label="Supprimer cette catégorie"
        />
      </div>
    </div>
  );
}
