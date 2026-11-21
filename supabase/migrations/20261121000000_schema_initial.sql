-- =====================================================================
-- Conseiller Financier — schéma initial
-- Tables, Row Level Security (RLS) par user_id, bucket privé « releves ».
-- À exécuter une seule fois (SQL Editor de Supabase ou `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Comptes
-- ---------------------------------------------------------------------
create table if not exists public.comptes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom text not null,
  type text not null check (type in ('debit', 'credit', 'especes', 'epargne')),
  jour_cloture smallint check (jour_cloture between 1 and 31),
  jour_limite_paiement smallint check (jour_limite_paiement between 1 and 31),
  solde_actuel numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Catégories
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom text not null,
  budget_mensuel numeric(14, 2) not null default 0 check (budget_mensuel >= 0),
  couleur_neutre text not null default '#737373',
  created_at timestamptz not null default now(),
  unique (user_id, nom)
);

-- ---------------------------------------------------------------------
-- Imports (fichiers CSV / Excel / PDF)
-- ---------------------------------------------------------------------
create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom_fichier text not null,
  chemin_storage text,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'analyse', 'apercu', 'enregistre', 'erreur')),
  mouvements_detectes integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Transactions
-- montant est toujours positif ; le sens est donné par type.
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  compte_id uuid references public.comptes (id) on delete set null,
  date date not null,
  description_originale text not null,
  commerce text,
  montant numeric(14, 2) not null check (montant >= 0),
  type text not null check (type in ('depense', 'revenu')),
  categorie_id uuid references public.categories (id) on delete set null,
  necessite_revision boolean not null default false,
  est_recurrente boolean not null default false,
  hash_unique text not null,
  import_id uuid references public.imports (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, hash_unique)
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_categorie_idx on public.transactions (categorie_id);
create index if not exists transactions_revision_idx
  on public.transactions (user_id) where necessite_revision;

-- ---------------------------------------------------------------------
-- Règles de catégorisation apprises
-- ---------------------------------------------------------------------
create table if not exists public.regles_categorisation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  motif_texte text not null,
  categorie_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, motif_texte)
);

-- ---------------------------------------------------------------------
-- Objectifs d'épargne
-- ---------------------------------------------------------------------
create table if not exists public.objectifs_epargne (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom text not null,
  montant_cible numeric(14, 2) not null check (montant_cible > 0),
  montant_actuel numeric(14, 2) not null default 0 check (montant_actuel >= 0),
  date_cible date not null,
  created_at timestamptz not null default now()
);

-- Historique des versements, pour calculer le rythme des 3 derniers mois.
create table if not exists public.versements_epargne (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  objectif_id uuid not null references public.objectifs_epargne (id) on delete cascade,
  date date not null default current_date,
  montant numeric(14, 2) not null,
  created_at timestamptz not null default now()
);
create index if not exists versements_objectif_idx on public.versements_epargne (objectif_id, date);

-- ---------------------------------------------------------------------
-- Paiements programmés
-- ---------------------------------------------------------------------
create table if not exists public.paiements_programmes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom text not null,
  montant numeric(14, 2) not null check (montant >= 0),
  frequence text not null check (frequence in ('mensuel', 'annuel', 'unique')),
  prochaine_echeance date not null,
  compte_id uuid references public.comptes (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Journal des alertes envoyées (évite d'envoyer deux fois le même email).
create table if not exists public.alertes_envoyees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cle text not null,
  envoye_le timestamptz not null default now(),
  unique (user_id, cle)
);

-- ---------------------------------------------------------------------
-- Row Level Security : chaque ligne n'est visible que par son propriétaire.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'comptes', 'categories', 'imports', 'transactions', 'regles_categorisation',
    'objectifs_epargne', 'versements_epargne', 'paiements_programmes', 'alertes_envoyees'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "proprietaire" on public.%I', t);
    execute format(
      'create policy "proprietaire" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------
-- Stockage : bucket privé pour les relevés PDF (10 Mo max, PDF seulement).
-- Chaque fichier est rangé sous « <user_id>/… ».
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('releves', 'releves', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "releves_lecture" on storage.objects;
drop policy if exists "releves_ajout" on storage.objects;
drop policy if exists "releves_modif" on storage.objects;
drop policy if exists "releves_suppr" on storage.objects;

create policy "releves_lecture" on storage.objects for select to authenticated
  using (bucket_id = 'releves' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "releves_ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'releves' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "releves_modif" on storage.objects for update to authenticated
  using (bucket_id = 'releves' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "releves_suppr" on storage.objects for delete to authenticated
  using (bucket_id = 'releves' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- Empreinte anti-doublon : identique à lib/dedupe.ts côté application.
-- sha256("AAAA-MM-JJ|montant.00|description normalisée")
-- ---------------------------------------------------------------------
create or replace function public.calcul_hash_unique(p_date date, p_montant numeric, p_description text)
returns text
language sql
immutable
as $$
  select encode(
    sha256(convert_to(
      to_char(p_date, 'YYYY-MM-DD') || '|' ||
      trim(to_char(round(p_montant, 2), 'FM9999999999990.00')) || '|' ||
      lower(regexp_replace(trim(p_description), '\s+', ' ', 'g')),
      'UTF8')),
    'hex');
$$;

-- ---------------------------------------------------------------------
-- Supprimer toutes ses données (utile après les tests).
-- security invoker : la RLS s'applique, on ne touche qu'à ses propres lignes.
-- ---------------------------------------------------------------------
create or replace function public.reinitialiser_mes_donnees()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;
  delete from transactions where user_id = auth.uid();
  delete from regles_categorisation where user_id = auth.uid();
  delete from versements_epargne where user_id = auth.uid();
  delete from objectifs_epargne where user_id = auth.uid();
  delete from paiements_programmes where user_id = auth.uid();
  delete from imports where user_id = auth.uid();
  delete from alertes_envoyees where user_id = auth.uid();
  delete from categories where user_id = auth.uid();
  delete from comptes where user_id = auth.uid();
end;
$$;

grant execute on function public.reinitialiser_mes_donnees() to authenticated;
