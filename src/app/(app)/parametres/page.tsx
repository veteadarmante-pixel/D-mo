import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SeedButtons } from "./seed-buttons";

export default function ParametresPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>
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
