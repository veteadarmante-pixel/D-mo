-- =====================================================================
-- Droits d'accès aux tables pour l'API Supabase.
-- Les projets Supabase récents n'accordent plus ces droits automatiquement
-- aux tables créées en SQL. La RLS (migration initiale) continue de
-- limiter chaque utilisateur à ses propres lignes.
-- =====================================================================

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table
  public.comptes,
  public.categories,
  public.imports,
  public.transactions,
  public.regles_categorisation,
  public.objectifs_epargne,
  public.versements_epargne,
  public.paiements_programmes,
  public.alertes_envoyees
to authenticated;

-- Rôle serveur utilisé uniquement par les crons (contourne la RLS).
grant all on table
  public.comptes,
  public.categories,
  public.imports,
  public.transactions,
  public.regles_categorisation,
  public.objectifs_epargne,
  public.versements_epargne,
  public.paiements_programmes,
  public.alertes_envoyees
to service_role;

-- Aucun accès pour les visiteurs non connectés.
revoke all on table
  public.comptes,
  public.categories,
  public.imports,
  public.transactions,
  public.regles_categorisation,
  public.objectifs_epargne,
  public.versements_epargne,
  public.paiements_programmes,
  public.alertes_envoyees
from anon;

revoke execute on function public.seed_donnees_exemple() from public, anon;
revoke execute on function public.reinitialiser_mes_donnees() from public, anon;
grant execute on function public.calcul_hash_unique(date, numeric, text) to authenticated, service_role;
grant execute on function public.seed_donnees_exemple() to authenticated;
grant execute on function public.reinitialiser_mes_donnees() to authenticated;
