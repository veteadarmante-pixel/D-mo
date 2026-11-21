import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SeedButtons } from "./seed-buttons";

export default function ParametresPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>
      <ul className="flex flex-col divide-y rounded-xl border">
        {[
          { href: "/categories", titre: "Catégories et budgets", desc: "Budget mensuel par catégorie" },
          { href: "/comptes", titre: "Comptes", desc: "Soldes, jours de clôture et de paiement" },
        ].map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center gap-3 p-4 hover:bg-muted/50">
              <div className="flex-1">
                <div className="font-medium">{l.titre}</div>
                <div className="text-sm text-muted-foreground">{l.desc}</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Card>
        <CardHeader>
          <CardTitle>Données d&apos;exemple</CardTitle>
          <CardDescription>
            Remplit l&apos;application avec 6 mois de mouvements fictifs pour tester le
            tableau de bord. Utilisez « Tout supprimer » avant d&apos;importer vos vraies
            données.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeedButtons />
        </CardContent>
      </Card>
    </div>
  );
}
