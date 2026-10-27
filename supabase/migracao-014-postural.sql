-- Migração 014 (27/10): avaliação postural. Só o Igor (admin) lê e escreve; a aluna não vê.
create table if not exists postural (
  id uuid primary key default gen_random_uuid(),
  aluna_id uuid not null references profiles(id) on delete cascade,
  achados text[] not null default '{}',
  obs text,
  foto_data date,              -- de qual registro de fotos da evolução ele avaliou
  created_at timestamptz default now()
);
create index if not exists postural_aluna on postural(aluna_id, created_at desc);
alter table postural enable row level security;
drop policy if exists "postural: só admin" on postural;
create policy "postural: só admin" on postural for all using (is_admin()) with check (is_admin());
select 'ok' as status;
