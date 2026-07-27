-- ============================================================
-- Estimo — Schéma Supabase
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ------------------------------------------------------------
-- Table des scans (un scan = un objet estimé par l'IA)
-- ------------------------------------------------------------
create table if not exists public.scans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- Résultat de l'estimation IA
  title           text not null,
  brand           text not null default 'Inconnue',
  model           text not null default 'Inconnu',
  category        text not null default 'Autre',
  condition       text not null default 'Bon état',
  price_min       numeric not null default 0,
  price_max       numeric not null default 0,
  price_suggested numeric not null default 0,
  sell_ease       int not null default 3 check (sell_ease between 1 and 5),
  demand          text not null default 'Moyenne',
  competition     text not null default 'Moyenne',
  advice          text not null default '',
  description     text not null default '',
  confidence      text not null default 'Moyenne',

  -- Données utilisateur
  image_url       text,
  notes           text,
  status          text not null default 'kept' check (status in ('kept', 'selling', 'sold')),
  sold_price      numeric,
  is_favorite     boolean not null default false,

  created_at      timestamptz not null default now()
);

create index if not exists scans_user_created_idx
  on public.scans (user_id, created_at desc);

-- ------------------------------------------------------------
-- Row Level Security : chaque utilisateur ne voit que ses scans
-- ------------------------------------------------------------
alter table public.scans enable row level security;

create policy "Lire ses propres scans"
  on public.scans for select
  using (auth.uid() = user_id);

create policy "Créer ses propres scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

create policy "Modifier ses propres scans"
  on public.scans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Supprimer ses propres scans"
  on public.scans for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Stockage des photos : bucket public `scans`
-- (chaque utilisateur écrit dans son dossier <user_id>/...)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('scans', 'scans', true)
on conflict (id) do nothing;

create policy "Uploader ses photos de scan"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Lire les photos de scan"
  on storage.objects for select
  using (bucket_id = 'scans');

create policy "Supprimer ses photos de scan"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
