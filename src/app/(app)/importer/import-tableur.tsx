"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { readSheet } from "read-excel-file/universal";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import {
  convertirLignes,
  detecterColonnes,
  type Cellule,
  type Correspondance,
  type ModeSigne,
} from "@/lib/import/colonnes";
import { Apercu, type OptionCompte } from "./apercu";

type Etape = "fichier" | "colonnes" | "apercu";

async function lireFichier(fichier: File): Promise<Cellule[][]> {
  const nom = fichier.name.toLowerCase();
  if (nom.endsWith(".xlsx")) {
    return (await readSheet(fichier)) as Cellule[][];
  }
  if (nom.endsWith(".xls")) {
    throw new Error("Format .xls ancien non pris en charge : enregistrez le fichier en .xlsx ou .csv.");
  }
  // CSV : détection automatique du séparateur ( ; , tabulation ) et de l'encodage courant.
  let texte = await fichier.text();
  if (texte.includes("�")) {
    const buf = await fichier.arrayBuffer();
    texte = new TextDecoder("windows-1252").decode(buf);
  }
  const res = Papa.parse<string[]>(texte, { skipEmptyLines: "greedy" });
  return res.data;
}

export function ImportTableur({ comptes }: { comptes: OptionCompte[] }) {
  const [etape, setEtape] = useState<Etape>("fichier");
  const [nomFichier, setNomFichier] = useState("");
  const [lignes, setLignes] = useState<Cellule[][]>([]);
  const [corr, setCorr] = useState<Correspondance | null>(null);
  const [modeDebitCredit, setModeDebitCredit] = useState(false);
  const [modeSigne, setModeSigne] = useState<ModeSigne>("negatif_depense");

  const conversion = useMemo(
    () => (corr ? convertirLignes(lignes, corr, modeSigne) : { mouvements: [], ignorees: 0 }),
    [lignes, corr, modeSigne],
  );

  const reinitialiser = () => {
    setEtape("fichier");
    setLignes([]);
    setCorr(null);
    setNomFichier("");
  };

  if (etape === "fichier") {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor="fichier-tableur">Fichier CSV ou Excel (.xlsx)</Label>
        <Input
          id="fichier-tableur"
          type="file"
          accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const data = await lireFichier(f);
              if (!data.length) throw new Error("Fichier vide.");
              const c = detecterColonnes(data);
              setLignes(data);
              setCorr(c);
              setModeDebitCredit(c.montant === null && (c.debit !== null || c.credit !== null));
              setNomFichier(f.name);
              setEtape("colonnes");
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          Exportez le relevé depuis le site de votre banque. Les colonnes sont détectées
          automatiquement ; vous pourrez les corriger avant d&apos;enregistrer.
        </p>
      </div>
    );
  }

  if (!corr) return null;
  const entete = corr.ligneEntete >= 0 ? lignes[corr.ligneEntete] : null;
  const nbCol = Math.max(...lignes.slice(0, 50).map((l) => l.length));
  const libelleCol = (j: number) => {
    const ex = lignes.slice(corr.ligneEntete + 1).find((l) => l[j] != null && String(l[j]).trim() !== "")?.[j];
    const nom = entete?.[j] ? String(entete[j]) : `Colonne ${j + 1}`;
    const exemple = ex instanceof Date ? ex.toISOString().slice(0, 10) : ex != null ? String(ex) : "";
    return exemple ? `${nom} (ex. ${exemple.slice(0, 25)})` : nom;
  };
  const choixColonne = (cle: keyof Correspondance, label: string) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`col-${cle}`}>{label}</Label>
      <NativeSelect
        id={`col-${cle}`}
        value={corr[cle] === null ? "" : String(corr[cle])}
        onChange={(e) => setCorr({ ...corr, [cle]: e.target.value === "" ? null : Number(e.target.value) })}
      >
        <option value="">—</option>
        {Array.from({ length: nbCol }, (_, j) => (
          <option key={j} value={j}>
            {libelleCol(j)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );

  if (etape === "colonnes") {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm">
          <span className="font-medium">{nomFichier}</span> — vérifiez la correspondance des colonnes.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ligne-entete">Ligne d&apos;en-tête</Label>
            <NativeSelect
              id="ligne-entete"
              value={corr.ligneEntete}
              onChange={(e) => setCorr({ ...corr, ligneEntete: Number(e.target.value) })}
            >
              <option value={-1}>Aucune (données dès la 1ʳᵉ ligne)</option>
              {lignes.slice(0, 20).map((l, i) => (
                <option key={i} value={i}>
                  Ligne {i + 1} : {l.filter(Boolean).slice(0, 4).join(" · ").slice(0, 50)}
                </option>
              ))}
            </NativeSelect>
          </div>
          {choixColonne("date", "Date")}
          {choixColonne("description", "Description / libellé")}
          <div className="flex flex-col gap-2">
            <Label htmlFor="mode-montant">Format des montants</Label>
            <NativeSelect
              id="mode-montant"
              value={modeDebitCredit ? "dc" : "signe"}
              onChange={(e) => {
                const dc = e.target.value === "dc";
                setModeDebitCredit(dc);
                setCorr(dc ? { ...corr, montant: null } : { ...corr, debit: null, credit: null });
              }}
            >
              <option value="signe">Une colonne « Montant »</option>
              <option value="dc">Deux colonnes « Débit » et « Crédit »</option>
            </NativeSelect>
          </div>
          {modeDebitCredit ? (
            <>
              {choixColonne("debit", "Débit (dépenses)")}
              {choixColonne("credit", "Crédit (revenus)")}
            </>
          ) : (
            <>
              {choixColonne("montant", "Montant")}
              <div className="flex flex-col gap-2">
                <Label htmlFor="mode-signe">Signe des montants</Label>
                <NativeSelect
                  id="mode-signe"
                  value={modeSigne}
                  onChange={(e) => setModeSigne(e.target.value as ModeSigne)}
                >
                  <option value="negatif_depense">Négatif = dépense (le plus courant)</option>
                  <option value="positif_depense">Positif = dépense (relevés de carte)</option>
                </NativeSelect>
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border p-3 text-sm">
          <div className="mb-2 font-medium">
            Aperçu : {conversion.mouvements.length} mouvements reconnus
            {conversion.ignorees > 0 && (
              <span className="font-normal text-muted-foreground"> · {conversion.ignorees} lignes ignorées</span>
            )}
          </div>
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {conversion.mouvements.slice(0, 5).map((m, i) => (
              <li key={i} className="truncate">
                <span className="montant">{m.date}</span> · {m.description} ·{" "}
                <span className="montant text-foreground">
                  {m.type === "revenu" ? "+" : "−"}
                  {m.montant.toFixed(2).replace(".", ",")} €
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button disabled={conversion.mouvements.length === 0} onClick={() => setEtape("apercu")}>
            Continuer
          </Button>
          <Button variant="outline" onClick={reinitialiser}>
            Changer de fichier
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Apercu
      mouvements={conversion.mouvements}
      comptes={comptes}
      nomFichier={nomFichier}
      onTermine={reinitialiser}
      note="Décochez les lignes à ne pas importer. Les doublons déjà enregistrés seront ignorés automatiquement."
    />
  );
}
