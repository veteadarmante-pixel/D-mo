import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";

// Phase (a) : page de vérification. Le vrai tableau de bord arrive en phase (e).
export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const tables = [
    "comptes",
    "categories",
    "transactions",
    "objectifs_epargne",
    "paiements_programmes",
  ] as const;

  const counts = await Promise.all(
    tables.map(async (t) => {
      const { count, error } = await supabase
        .from(t)
        .select("*", { count: "exact", head: true });
      return { table: t, count: count ?? 0, error: error?.message };
    }),
  );
  const erreur = counts.find((c) => c.error);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-sm text-muted-foreground">Connecté : {user.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>État de la base de données</CardTitle>
          <CardDescription>
            {erreur
              ? "La connexion fonctionne mais les tables sont introuvables : exécutez la migration SQL (voir README)."
              : "Connexion à Supabase réussie."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {counts.map((c) => (
              <li key={c.table} className="rounded-md border px-3 py-2">
                <div className="text-muted-foreground">{c.table}</div>
                <div className="montant text-lg font-medium">
                  {c.error ? "—" : c.count}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="self-start">
        <Link href="/parametres">Charger les données d&apos;exemple</Link>
      </Button>
    </div>
  );
}
