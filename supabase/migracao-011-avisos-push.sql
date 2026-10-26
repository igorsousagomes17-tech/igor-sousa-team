-- Migração 011 (26/10): avisos no celular com o app fechado (Web Push).
-- 1º uso: "Terminou o treino?" quando o treino fica aberto 1h30 sem finalizar.
-- Nada de chave pra copiar: a função "push" gera as chaves e guarda em config_privada (sem acesso pelo app).
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists config_privada (chave text primary key, valor text not null);
alter table config_privada enable row level security; -- sem políticas: só a função (chave de serviço) lê
insert into config_privada (chave, valor) values ('cron', replace(gen_random_uuid()::text, '-', '')) on conflict (chave) do nothing;

create table if not exists push_inscricoes (
  endpoint text primary key,
  aluna_id uuid not null references profiles(id) on delete cascade,
  p256dh text not null, auth text not null,
  atualizado_em timestamptz default now()
);
alter table push_inscricoes enable row level security;
drop policy if exists "push: a aluna vê e apaga as suas" on push_inscricoes;
create policy "push: a aluna vê e apaga as suas" on push_inscricoes for select using (aluna_id = auth.uid() or is_admin());
drop policy if exists "push: apagar as suas" on push_inscricoes;
create policy "push: apagar as suas" on push_inscricoes for delete using (aluna_id = auth.uid());

alter table sessoes add column if not exists lembrete_aberto_em timestamptz;

-- A cada 10 min o banco chama a função push (que confere o segredo do cabeçalho)
select cron.unschedule('lembretes-push') where exists (select 1 from cron.job where jobname = 'lembretes-push');
select cron.schedule('lembretes-push', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://wwajmwrtobowmheadssv.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select valor from config_privada where chave = 'cron')),
    body := '{"acao":"cron"}'::jsonb)
$$);
select 'ok' as status;
