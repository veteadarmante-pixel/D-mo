import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/form-bits";
import { requireUser } from "@/lib/supabase/server";
import { aujourdhui } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { TransactionForm } from "../transaction-form";
import { modifierTransaction, supprimerTransaction } from "../actions";
import { chargerOptions } from "../data";

export default async function TransactionEditPage({ params }: PageProps<"/transactions/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data }, options] = await Promise.all([
    supabase.from("transactions").select("*").eq("id", id).maybeSingle(),
    chargerOptions(supabase),
  ]);
  if (!data) notFound();
  const t = data as Transaction;
  const mois = t.date.slice(0, 7);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <Link href={`/transactions?mois=${mois}`} className="text-sm text-muted-foreground hover:underline">
        ← Mouvements
      </Link>
      <PageHeader titre="Modifier le mouvement" description={t.description_originale} />
      <Card>
        <CardContent>
          <TransactionForm
            action={modifierTransaction.bind(null, t.id)}
            categories={options.categories}
            comptes={options.comptes}
            aujourdhui={aujourdhui()}
            transaction={t}
          />
        </CardContent>
      </Card>
      <div className="self-start">
        <DeleteButton
          action={supprimerTransaction.bind(null, t.id, mois)}
          confirmation="Supprimer ce mouvement ?"
          label="Supprimer ce mouvement"
        />
      </div>
    </div>
  );
}
