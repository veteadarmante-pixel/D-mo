import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/form-bits";
import { requireUser } from "@/lib/supabase/server";
import type { Compte } from "@/lib/types";
import { CompteForm } from "../compte-form";
import { modifierCompte, supprimerCompte } from "../actions";

export default async function CompteEditPage({ params }: PageProps<"/comptes/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("comptes")
    .select("id, nom, type, jour_cloture, jour_limite_paiement, solde_actuel")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const compte = data as Compte;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/comptes" className="text-sm text-muted-foreground hover:underline">
        ← Comptes
      </Link>
      <PageHeader titre={compte.nom} />
      <Card>
        <CardContent>
          <CompteForm
            action={modifierCompte.bind(null, compte.id)}
            compte={compte}
            boutonLabel="Enregistrer"
          />
        </CardContent>
      </Card>
      <div className="self-start">
        <DeleteButton
          action={supprimerCompte.bind(null, compte.id)}
          confirmation={`Supprimer « ${compte.nom} » ? Les mouvements liés seront conservés, sans compte.`}
          label="Supprimer ce compte"
        />
      </div>
    </div>
  );
}
