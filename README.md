# Conseiller Financier

Application web personnelle : dépenses, comptes, budget par catégorie, objectifs
d'épargne et alertes email avant les paiements importants.

Stack : Next.js 16 (App Router, TypeScript) · Tailwind CSS · composants shadcn/ui ·
Recharts · Supabase (Postgres, Auth, Storage, RLS) · API Anthropic · Resend · Vercel Cron.

> README complet (installation locale + déploiement) livré à la fin du projet (phase f).

## État d'avancement

- [x] (a) Base, connexion par lien magique, schéma de base de données, données d'exemple
- [x] (b) Comptes, catégories et saisie manuelle
- [x] (c) Import CSV / Excel / PDF, saisie rapide en une ligne
- [ ] (d) Catégorisation et règles
- [ ] (e) Tableau de bord et objectifs
- [ ] (f) Crons et emails

## Démarrage rapide (local)

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs Supabase + ALLOWED_EMAIL
npm run dev                  # http://localhost:3000
```

Base de données : exécuter, dans l'ordre, les fichiers de `supabase/migrations/`
dans le **SQL Editor** de Supabase.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification des types TypeScript |
| `npm run lint` | Lint |
