-- Migração 016 (28/10): alarme do fim do descanso pelo servidor (Web Push).
-- No iPhone o app para quando a tela apaga ou ela troca de app: só um aviso vindo do servidor toca e vibra.
-- A aluna avisa "meu descanso acaba às X"; a função push espera e manda. Se ela pular o descanso, cancela.
create table if not exists avisos_descanso (
  id text primary key,                 -- gerado no celular (um por descanso)
  aluna_id uuid not null references profiles(id) on delete cascade,
  em timestamptz not null,             -- quando o descanso acaba
  titulo text, corpo text,
  cancelado boolean not null default false,
  enviado_em timestamptz,
  created_at timestamptz default now()
);
alter table avisos_descanso enable row level security; -- sem políticas: só a função (chave de serviço) mexe
create index if not exists avisos_descanso_criado on avisos_descanso (created_at);
-- limpeza: o que tem mais de 2 dias sai (roda junto com os lembretes, de hora em hora)
select cron.unschedule('limpa-avisos-descanso') where exists (select 1 from cron.job where jobname = 'limpa-avisos-descanso');
select cron.schedule('limpa-avisos-descanso', '17 * * * *', $$ delete from avisos_descanso where created_at < now() - interval '2 days' $$);
select 'ok' as status;
