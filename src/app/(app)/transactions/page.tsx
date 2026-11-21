import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/supabase/server";
import {
  aujourdhui,
  bornesMois,
  decalerMois,
  formatJour,
  formatMontant,
  libelleMois,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Ligne = {
  id: string;
  date: string;
  description_originale: string;
  commerce: string | null;
  montant: number;
  type: "depense" | "revenu";
  necessite_revision: boolean;
  est_recurrente: boolean;
  categories: { nom: string } | null;
  comptes: { nom: string } | null;
};

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const { mois: moisParam } = await searchParams;
  const moisCourant = aujourdhui().slice(0, 7);
  const mois =
    typeof moisParam === "string" && /^\d{4}-\d{2}$/.test(moisParam) ? moisParam : moisCourant;
  const { debut, finExclue } = bornesMois(mois);

  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("transactions")
    .select(
      "id, date, description_originale, commerce, montant, type, necessite_revision, est_recurrente, categories(nom), comptes(nom)",
    )
    .gte("date", debut)
    .lt("date", finExclue)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  const lignes = (data ?? []) as unknown as Ligne[];

  const depenses = lignes.filter((l) => l.type === "depense").reduce((s, l) => s + Number(l.montant), 0);
  const revenus = lignes.filter((l) => l.type === "revenu").reduce((s, l) => s + Number(l.montant), 0);

  // Regroupement par jour
  const parJour = new Map<string, Ligne[]>();
  for (const l of lignes) {
    const liste = parJour.get(l.date) ?? [];
    liste.push(l);
    parJour.set(l.date, liste);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titre="Mouvements">
        <Button asChild className="hidden md:inline-flex">
          <Link href="/transactions/nouveau">
            <Plus /> Ajouter
          </Link>
        </Button>
      </PageHeader>

      {/* Navigation entre les mois */}
      <div className="flex items-center justify-between rounded-xl border p-2">
        <Button asChild variant="ghost" size="icon" aria-label="Mois précédent">
          <Link href={`/transactions?mois=${decalerMois(mois, -1)}`}>
            <ChevronLeft />
          </Link>
        </Button>
        <span className="font-medium capitalize">{libelleMois(mois)}</span>
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Mois suivant"
          className={cn(mois >= moisCourant && "pointer-events-none opacity-30")}
        >
          <Link href={`/transactions?mois=${decalerMois(mois, 1)}`}>
            <ChevronRight />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl border p-3">
          <div className="text-muted-foreground">Dépenses</div>
          <div className="montant font-semibold">{formatMontant(depenses)}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-muted-foreground">Revenus</div>
          <div className="montant font-semibold">{formatMontant(revenus)}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-muted-foreground">Solde</div>
          <div className="montant font-semibold">{formatMontant(revenus - depenses)}</div>
        </div>
      </div>

      {lignes.length === 0 && (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          Aucun mouvement ce mois-ci.
        </p>
      )}

      {[...parJour.entries()].map(([jour, items]) => (
        <section key={jour} className="flex flex-col gap-2">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {formatJour(jour)}
          </h2>
          <ul className="flex flex-col divide-y rounded-xl border">
            {items.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/transactions/${l.id}`}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{l.commerce || l.description_originale}</span>
                      {l.est_recurrente && (
                        <Repeat className="size-3.5 shrink-0 text-muted-foreground" aria-label="Récurrent" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{l.categories?.nom ?? "Sans catégorie"}</span>
                      {l.comptes?.nom && <span>· {l.comptes.nom}</span>}
                      {l.necessite_revision && (
                        <Badge variant="outline" className="py-0">
                          à revoir
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="montant text-right font-medium whitespace-nowrap">
                    {l.type === "revenu" ? "+" : "−"}
                    {formatMontant(l.montant)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

    </div>
  );
}
