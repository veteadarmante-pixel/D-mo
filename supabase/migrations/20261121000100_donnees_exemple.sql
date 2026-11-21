-- =====================================================================
-- Données d'exemple (seed) — fictives, pour tester le tableau de bord.
-- Appelée depuis l'app : Réglages → « Charger les données d'exemple ».
-- Insère uniquement pour l'utilisateur connecté (auth.uid()).
-- =====================================================================

create or replace function public.seed_donnees_exemple()
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Europe/Paris')::date;
  debut_mois date;
  c_courant uuid; c_visa uuid; c_livret uuid; c_especes uuid;
  cat_courses uuid; cat_resto uuid; cat_transport uuid; cat_logement uuid;
  cat_loisirs uuid; cat_abos uuid; cat_sante uuid; cat_shopping uuid; cat_revenus uuid;
  obj_urgence uuid; obj_voyage uuid;
  m int; i int; d date; jours_mois int; montant numeric; libelle text;
  nb int;
  courses text[] := array['CARREFOUR CITY', 'LIDL', 'MONOPRIX', 'FRANPRIX', 'BIOCOOP'];
  restos text[] := array['BRASSERIE DU MARCHE', 'SUSHI SHOP', 'BOULANGERIE PAUL', 'LE PETIT BISTROT', 'DELIVEROO'];
  loisirs text[] := array['UGC CINE CITE', 'FNAC', 'DECATHLON'];
  shopping text[] := array['ZARA', 'AMAZON', 'H&M'];
begin
  if uid is null then
    raise exception 'Non authentifié';
  end if;

  select count(*) into nb from categories where user_id = uid;
  if nb > 0 then
    return 'Des données existent déjà. Utilisez « Tout supprimer » avant de recharger les exemples.';
  end if;

  perform setseed(0.42);

  -- Comptes ------------------------------------------------------------
  insert into comptes (user_id, nom, type, solde_actuel)
    values (uid, 'Compte courant', 'debit', 1850.00) returning id into c_courant;
  insert into comptes (user_id, nom, type, jour_cloture, jour_limite_paiement, solde_actuel)
    values (uid, 'Carte Visa (•••• 4821)', 'credit', 25, 5, -420.00) returning id into c_visa;
  insert into comptes (user_id, nom, type, solde_actuel)
    values (uid, 'Livret A', 'epargne', 4200.00) returning id into c_livret;
  insert into comptes (user_id, nom, type, solde_actuel)
    values (uid, 'Espèces', 'especes', 60.00) returning id into c_especes;

  -- Catégories (budgets mensuels) -----------------------------------------
  insert into categories (user_id, nom, budget_mensuel, couleur_neutre) values (uid, 'Courses', 400, '#171717') returning id into cat_courses;
  insert into categories (user_id, nom, budget_mensuel, couleur_neutre) values (uid, 'Restaurants', 150, '#404040') returning id into cat_resto;
  insert into categories (user_id, nom, budget_mensuel, couleur_neutre) values (uid, 'Transport', 120, '#525252') returning id into cat_transport;
  insert into categories (user_id, nom, budget_mensuel, couleur_neutre) values (uid, 'Logement', 900, '#262626') returning id into cat_logement;
  insert into categories (user_id, nom, budget_mensuel, couleur_neutre) values (uid, 'Loisirs', 100, '#737373') returning id into cat_loisirs;
  insert into categories (user_id, nom, budget_mensuel, couleur_neutre) values (uid, 'Abonnements', 60, '#a3a3a3') returning id into cat_abos;
  insert into categories (user_id, nom, budget_mensuel, couleur_neutre) values (uid, 'Santé', 50, '#d4d4d4') returning id into cat_sante;
  insert into categories (user_id, nom, budget_mensuel, couleur_neutre) values (uid, 'Shopping', 150, '#8a8a8a') returning id into cat_shopping;
  insert into categories (user_id, nom, budget_mensuel, couleur_neutre) values (uid, 'Revenus', 0, '#e5e5e5') returning id into cat_revenus;

  -- Règles de catégorisation déjà apprises ----------------------------------
  insert into regles_categorisation (user_id, motif_texte, categorie_id) values
    (uid, 'carrefour', cat_courses),
    (uid, 'lidl', cat_courses),
    (uid, 'netflix', cat_abos),
    (uid, 'navigo', cat_transport);

  -- 6 mois de mouvements (mois courant inclus, jusqu'à aujourd'hui) ----------
  for m in 0..5 loop
    debut_mois := (date_trunc('month', today) - make_interval(months => m))::date;
    jours_mois := extract(day from (debut_mois + interval '1 month - 1 day'))::int;

    -- Récurrents
    perform public._seed_tx(uid, c_courant, debut_mois, 'VIREMENT SALAIRE ACME SAS', 'Acme SAS', 2800, 'revenu', cat_revenus, true, today);
    perform public._seed_tx(uid, c_courant, debut_mois + 2, 'PRLV LOYER SCI DES LILAS', 'SCI des Lilas', 900, 'depense', cat_logement, true, today);
    perform public._seed_tx(uid, c_courant, debut_mois + 1, 'PRLV NAVIGO ANNUEL', 'Navigo', 86.40, 'depense', cat_transport, true, today);
    perform public._seed_tx(uid, c_visa, debut_mois + 7, 'NETFLIX.COM', 'Netflix', 13.49, 'depense', cat_abos, true, today);
    perform public._seed_tx(uid, c_visa, debut_mois + 11, 'SPOTIFY P1234', 'Spotify', 10.99, 'depense', cat_abos, true, today);
    perform public._seed_tx(uid, c_courant, debut_mois + 14, 'PRLV FREE MOBILE', 'Free Mobile', 19.99, 'depense', cat_abos, true, today);

    -- Courses : 8 par mois
    for i in 1..8 loop
      d := debut_mois + least(jours_mois - 1, (i * 4 - 3 + floor(random() * 3))::int);
      montant := round((25 + random() * 70)::numeric, 2);
      libelle := courses[1 + floor(random() * array_length(courses, 1))::int];
      perform public._seed_tx(uid, c_visa, d, 'CB ' || libelle || ' ' || to_char(d, 'DD/MM'), initcap(libelle), montant, 'depense', cat_courses, false, today);
    end loop;

    -- Restaurants : 5 par mois (plus le mois courant, pour l'exemple « dépassé »)
    for i in 1..(case when m = 0 then 9 else 5 end) loop
      d := debut_mois + least(jours_mois - 1, (i * 3 + floor(random() * 2))::int);
      montant := round((12 + random() * 33)::numeric, 2);
      libelle := restos[1 + floor(random() * array_length(restos, 1))::int];
      perform public._seed_tx(uid, c_visa, d, 'CB ' || libelle || ' ' || to_char(d, 'DD/MM'), initcap(libelle), montant, 'depense', cat_resto, false, today);
    end loop;

    -- Transport occasionnel
    for i in 1..2 loop
      d := debut_mois + least(jours_mois - 1, (i * 9 + floor(random() * 4))::int);
      montant := round((14 + random() * 16)::numeric, 2);
      perform public._seed_tx(uid, c_visa, d, 'UBER *TRIP ' || to_char(d, 'DD/MM'), 'Uber', montant, 'depense', cat_transport, false, today);
    end loop;

    -- Loisirs
    for i in 1..2 loop
      d := debut_mois + least(jours_mois - 1, (i * 10 + floor(random() * 5))::int);
      montant := round((15 + random() * 30)::numeric, 2);
      libelle := loisirs[1 + floor(random() * array_length(loisirs, 1))::int];
      perform public._seed_tx(uid, c_visa, d, 'CB ' || libelle || ' ' || to_char(d, 'DD/MM'), initcap(libelle), montant, 'depense', cat_loisirs, false, today);
    end loop;

    -- Shopping
    for i in 1..2 loop
      d := debut_mois + least(jours_mois - 1, (i * 11 + floor(random() * 4))::int);
      montant := round((30 + random() * 60)::numeric, 2);
      libelle := shopping[1 + floor(random() * array_length(shopping, 1))::int];
      perform public._seed_tx(uid, c_visa, d, 'CB ' || libelle || ' ' || to_char(d, 'DD/MM'), initcap(libelle), montant, 'depense', cat_shopping, false, today);
    end loop;

    -- Santé
    d := debut_mois + least(jours_mois - 1, 17);
    perform public._seed_tx(uid, c_especes, d, 'PHARMACIE DU CENTRE', 'Pharmacie du Centre', 24.90, 'depense', cat_sante, false, today);
  end loop;

  -- Quelques mouvements « à revoir » (catégorie incertaine) -----------------
  perform public._seed_tx(uid, c_visa, greatest(date_trunc('month', today)::date, today - 2),
    'PAYPAL *MKTPLACE 8832', 'PayPal', 47.80, 'depense', cat_shopping, false, today, true);
  perform public._seed_tx(uid, c_courant, greatest(date_trunc('month', today)::date, today - 1),
    'CB SNCF INTERNET', 'SNCF', 64.00, 'depense', cat_loisirs, false, today, true);

  -- Objectifs d'épargne + versements des derniers mois -----------------------
  insert into objectifs_epargne (user_id, nom, montant_cible, montant_actuel, date_cible)
    values (uid, 'Fonds d''urgence', 6000, 2150, (today + interval '10 months')::date) returning id into obj_urgence;
  insert into objectifs_epargne (user_id, nom, montant_cible, montant_actuel, date_cible)
    values (uid, 'Voyage au Japon', 3500, 800, (today + interval '8 months')::date) returning id into obj_voyage;

  for m in 0..5 loop
    insert into versements_epargne (user_id, objectif_id, date, montant)
      values (uid, obj_urgence, (date_trunc('month', today) - make_interval(months => m))::date + 4, 250);
    insert into versements_epargne (user_id, objectif_id, date, montant)
      values (uid, obj_voyage, (date_trunc('month', today) - make_interval(months => m))::date + 4,
              case when m < 3 then 150 else 100 end);
  end loop;

  -- Paiements programmés -----------------------------------------------------
  insert into paiements_programmes (user_id, nom, montant, frequence, prochaine_echeance, compte_id) values
    (uid, 'Loyer', 900, 'mensuel',
       case when extract(day from today) < 3 then date_trunc('month', today)::date + 2
            else (date_trunc('month', today) + interval '1 month')::date + 2 end,
       c_courant),
    (uid, 'Assurance habitation', 186, 'annuel', today + 7, c_courant),
    (uid, 'Échéance carte Visa', 420, 'mensuel', today + 2, c_courant),
    (uid, 'Taxe foncière', 650, 'unique', today + 12, c_courant);

  return 'Données d''exemple chargées : 4 comptes, 9 catégories, 6 mois de mouvements, 2 objectifs, 4 paiements programmés.';
end;
$$;

-- Fonction interne : insère un mouvement s'il n'est pas dans le futur.
create or replace function public._seed_tx(
  p_user uuid, p_compte uuid, p_date date, p_desc text, p_commerce text,
  p_montant numeric, p_type text, p_categorie uuid, p_recurrente boolean,
  p_today date, p_revision boolean default false
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_date > p_today then
    return;
  end if;
  insert into transactions (user_id, compte_id, date, description_originale, commerce, montant,
                            type, categorie_id, necessite_revision, est_recurrente, hash_unique)
  values (p_user, p_compte, p_date, p_desc, p_commerce, p_montant, p_type, p_categorie,
          p_revision, p_recurrente, public.calcul_hash_unique(p_date, p_montant, p_desc))
  on conflict (user_id, hash_unique) do nothing;
end;
$$;

revoke execute on function public._seed_tx(uuid, uuid, date, text, text, numeric, text, uuid, boolean, date, boolean) from public, anon;
grant execute on function public._seed_tx(uuid, uuid, date, text, text, numeric, text, uuid, boolean, date, boolean) to authenticated;
grant execute on function public.seed_donnees_exemple() to authenticated;
