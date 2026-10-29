-- Migração 019 (29/10): conexão com o Strava. A aluna autoriza uma vez; ao finalizar o treino o app lança a atividade lá.
-- Tabelas sem política: só a função "strava" (chave de serviço) lê e grava. Os tokens nunca chegam ao celular.
create table if not exists strava_conexoes (
  aluna_id uuid primary key references profiles(id) on delete cascade,
  atleta_id bigint, atleta_nome text,
  access_token text not null, refresh_token text not null, expira_em timestamptz not null,
  escopo text, criado_em timestamptz default now()
);
alter table strava_conexoes enable row level security;
create table if not exists strava_estados (
  estado text primary key, aluna_id uuid not null references profiles(id) on delete cascade, criado_em timestamptz default now()
);
alter table strava_estados enable row level security;
create table if not exists strava_envios (
  aluna_id uuid not null references profiles(id) on delete cascade, chave text not null,
  atividade_id bigint, criado_em timestamptz default now(), primary key (aluna_id, chave)
);
alter table strava_envios enable row level security;
select cron.unschedule('limpa-strava-estados') where exists (select 1 from cron.job where jobname = 'limpa-strava-estados');
select cron.schedule('limpa-strava-estados', '23 * * * *', $$ delete from strava_estados where criado_em < now() - interval '1 hour' $$);
