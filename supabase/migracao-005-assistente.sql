-- Migração 005 (23/10): Assistente IA (tira-dúvidas) — guarda as conversas.
-- A aluna só lê as próprias mensagens; o Igor (admin) lê todas. Quem grava é a função do servidor.
create table if not exists assistente_msgs (
  id uuid primary key default gen_random_uuid(),
  aluna_id uuid not null references profiles(id) on delete cascade,
  papel text not null check (papel in ('user','assistant')),
  texto text not null,
  created_at timestamptz not null default now()
);
create index if not exists assistente_msgs_aluna_data on assistente_msgs (aluna_id, created_at desc);
alter table assistente_msgs enable row level security;
drop policy if exists "assistente: ler as próprias ou admin" on assistente_msgs;
create policy "assistente: ler as próprias ou admin" on assistente_msgs for select using (aluna_id = auth.uid() or is_admin());
select 'ok' as status;
