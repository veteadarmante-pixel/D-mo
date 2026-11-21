import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/supabase/server";
import { aujourdhui } from "@/lib/format";
import { TransactionForm } from "../transaction-form";
import { creerTransaction } from "../actions";
import { chargerOptions } from "../data";

export default async function NouvelleTransactionPage() {
  const { supabase } = await requireUser();
  const { categories, comptes } = await chargerOptions(supabase);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <PageHeader titre="Ajouter un mouvement" description="Le formulaire se vide après chaque ajout.">
        <Link href="/transactions" className="text-sm text-muted-foreground hover:underline">
          Voir la liste
        </Link>
      </PageHeader>
      <Card>
        <CardContent>
          <TransactionForm
            action={creerTransaction}
            categories={categories}
            comptes={comptes}
            aujourdhui={aujourdhui()}
            boutonLabel="Ajouter"
            saisieRapide
          />
        </CardContent>
      </Card>
    </div>
  );
}
