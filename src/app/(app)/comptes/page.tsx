import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/supabase/server";
import { formatMontant } from "@/lib/format";
import { libelleTypeCompte, type Compte } from "@/lib/types";
import { CompteForm } from "./compte-form";
import { creerCompte } from "./actions";

export default async function ComptesPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("comptes")
    .select("id, nom, type, jour_cloture, jour_limite_paiement, solde_actuel")
    .order("created_at");
  const comptes = (data ?? []) as Compte[];
  const total = comptes.reduce((s, c) => s + Number(c.solde_actuel), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titre="Comptes" description={`Solde total : ${formatMontant(total)}`} />

      <ul className="flex flex-col divide-y rounded-xl border">
        {comptes.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">Aucun compte pour l&apos;instant.</li>
        )}
        {comptes.map((c) => (
          <li key={c.id}>
            <Link
              href={`/comptes/${c.id}`}
              className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.nom}</div>
                <div className="text-xs text-muted-foreground">
                  {libelleTypeCompte(c.type)}
                  {c.jour_cloture ? ` · clôture le ${c.jour_cloture}` : ""}
                  {c.jour_limite_paiement ? ` · paiement le ${c.jour_limite_paiement}` : ""}
                </div>
              </div>
              <div className="montant text-right font-medium">{formatMontant(c.solde_actuel)}</div>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau compte</CardTitle>
        </CardHeader>
        <CardContent>
          <CompteForm action={creerCompte} />
        </CardContent>
      </Card>
    </div>
  );
}
