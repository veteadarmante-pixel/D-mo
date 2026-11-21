"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OptionCompte } from "./apercu";
import { ImportTableur } from "./import-tableur";
import { ImportPdf } from "./import-pdf";
import { SaisieRapide } from "./saisie-rapide";

const ONGLETS = [
  { id: "rapide", label: "Saisie rapide" },
  { id: "tableur", label: "CSV / Excel" },
  { id: "pdf", label: "Relevé PDF" },
] as const;

export function ImporterOnglets({ comptes, categories }: { comptes: OptionCompte[]; categories: OptionCompte[] }) {
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]["id"]>("rapide");
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={cn(
              "rounded-md px-2 py-2 text-sm font-medium transition-colors",
              onglet === o.id ? "bg-background shadow-xs" : "text-muted-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {onglet === "rapide" && <SaisieRapide comptes={comptes} categories={categories} />}
        {onglet === "tableur" && <ImportTableur comptes={comptes} />}
        {onglet === "pdf" && <ImportPdf comptes={comptes} />}
      </div>
    </div>
  );
}
