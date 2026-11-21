import { APP_CURRENCY, APP_LOCALE, APP_TIMEZONE } from "./env";

const euro = new Intl.NumberFormat(APP_LOCALE, {
  style: "currency",
  currency: APP_CURRENCY,
});

/** 1 234,56 € — séparateur de milliers et devise. */
export function formatMontant(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return euro.format(Number.isFinite(n) ? n : 0);
}

/** +12 % / −8 % */
export function formatPourcentage(value: number, signe = false): string {
  const s = new Intl.NumberFormat(APP_LOCALE, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: signe ? "exceptZero" : "auto",
  });
  return s.format(Number.isFinite(value) ? value : 0);
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau de l'application. */
export function aujourdhui(timeZone = APP_TIMEZONE, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** 21 nov. 2026 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
