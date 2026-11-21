"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { chargerDonneesExemple, supprimerMesDonnees } from "./actions";

export function SeedButtons() {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await chargerDonneesExemple();
            if (r.ok) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Charger les données d&apos;exemple
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!confirm("Supprimer TOUTES vos données (comptes, mouvements, objectifs…) ?"))
            return;
          start(async () => {
            const r = await supprimerMesDonnees();
            if (r.ok) toast.success(r.message);
            else toast.error(r.message);
          });
        }}
      >
        Tout supprimer
      </Button>
    </div>
  );
}
