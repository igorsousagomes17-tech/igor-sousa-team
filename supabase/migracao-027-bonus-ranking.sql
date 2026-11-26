-- Migração 027 (25/11/2026): bônus do ranking do mês ("O time"), pedido do Igor.
-- No fim de cada mês, as 3 primeiras do ranking ganham pontos sozinhas: 1º = 700, 2º = 400, 3º = 200.
-- Ranking = dias com treino no mês (igual já era: 3 treinos no mesmo dia = 1), só aluna ativa que aparece no time.
-- Empate: fica na frente quem chegou primeiro àquele número de dias (o treino que fechou o último dia dela foi antes).
-- O pg_cron roda no dia 1º às 00:05 de Brasília (03:05 UTC) e paga o mês que acabou. Não paga duas vezes (ref = mês).
-- Rodar inteiro no SQL Editor do Supabase. Pode rodar de novo sem problema.
begin;

-- Ranking de um mês com desempate, usado pela tela e pelo bônus (mesma ordem nos dois).
create or replace function fn_ranking_mes(p_mes date) returns table (aluna_id uuid, nome text, n bigint, chegou timestamptz, pos bigint)
language sql stable security definer set search_path = public as $$
  with ativas as (
    select id,
      coalesce(nullif(split_part(trim(coalesce(nome, '')), ' ', 1), ''), 'Aluna') ||
      case when split_part(trim(coalesce(nome, '')), ' ', 2) <> '' then ' ' || upper(left(split_part(trim(nome), ' ', 2), 1)) || '.' else '' end as nome
    from profiles where role = 'aluna' and ativa and comunidade
  ),
  dias as (
    select s.aluna_id, (s.finalizada_em at time zone 'America/Sao_Paulo')::date as dia, min(s.finalizada_em) as primeiro
    from sessoes s join ativas a on a.id = s.aluna_id
    where s.finalizada_em is not null and coalesce(s.exercicios_feitos, 0) > 0
      and (s.finalizada_em at time zone 'America/Sao_Paulo')::date >= date_trunc('month', p_mes)::date
      and (s.finalizada_em at time zone 'America/Sao_Paulo')::date < (date_trunc('month', p_mes) + interval '1 month')::date
    group by 1, 2
  ),
  rk as (select d.aluna_id, count(*) as n, max(d.primeiro) as chegou from dias d group by d.aluna_id)
  select rk.aluna_id, a.nome, rk.n, rk.chegou, row_number() over (order by rk.n desc, rk.chegou asc, a.nome) as pos
  from rk join ativas a on a.id = rk.aluna_id
$$;
revoke all on function fn_ranking_mes(date) from public, anon, authenticated;

-- Paga o bônus do mês (padrão: o mês que acabou). Só o banco (pg_cron) ou o Igor no SQL Editor chamam.
create or replace function fn_bonus_ranking(p_mes date default null) returns int
language plpgsql security definer set search_path = public as $$
declare m date := coalesce(p_mes, (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month')::date); k int;
begin
  insert into pontos_log (aluna_id, motivo, pontos, ref)
  select r.aluna_id, 'ranking', (array[700, 400, 200])[r.pos], to_char(m, 'YYYY-MM')
  from fn_ranking_mes(m) r where r.pos <= 3
  on conflict (aluna_id, motivo, ref) do nothing;
  get diagnostics k = row_count;
  return k;
end $$;
revoke all on function fn_bonus_ranking(date) from public, anon, authenticated;

-- Tela "O time": mesma ordem do bônus (com desempate) e a posição de cada uma.
create or replace function fn_comunidade() returns json
language sql stable security definer set search_path = public as $$
  with tz as (select (now() at time zone 'America/Sao_Paulo') as agora),
  ativas as (
    select id,
      coalesce(nullif(split_part(trim(coalesce(nome, '')), ' ', 1), ''), 'Aluna') ||
      case when split_part(trim(coalesce(nome, '')), ' ', 2) <> '' then ' ' || upper(left(split_part(trim(nome), ' ', 2), 1)) || '.' else '' end as nome
    from profiles where role = 'aluna' and ativa and comunidade
  ),
  feitas as (
    select s.aluna_id, s.finalizada_em, (s.finalizada_em at time zone 'America/Sao_Paulo')::date as dia,
      case when s.titulo ~ '^Treino [A-Z]$' or s.titulo = 'Cardio 20 min' then s.titulo
           else coalesce((select p.titulo from programas p where s.titulo = p.titulo or s.titulo like p.titulo || ' ·%' limit 1), 'um treino') end as titulo
    from sessoes s join ativas a on a.id = s.aluna_id
    where s.finalizada_em is not null and coalesce(s.exercicios_feitos, 0) > 0
  ),
  mes as (select f.* from feitas f, tz where f.dia >= date_trunc('month', tz.agora)::date),
  rk2 as (select r.* from tz, fn_ranking_mes(tz.agora::date) r)
  select case when exists (select 1 from profiles where id = auth.uid() and (ativa or role = 'admin')) then
    json_build_object(
      'hoje', (select count(distinct aluna_id) from feitas, tz where dia = tz.agora::date),
      'mes', (select count(*) from mes),
      'time', (select count(*) from ativas),
      'ativas_mes', (select count(*) from rk2),
      'feed', coalesce((select json_agg(x) from (
          select a.nome, f.titulo, f.finalizada_em from feitas f join ativas a on a.id = f.aluna_id, tz
          where f.dia = tz.agora::date order by f.finalizada_em desc limit 30) x), '[]'::json),
      'ranking', coalesce((select json_agg(x) from (
          select nome, n, pos, (aluna_id = auth.uid()) as eu from rk2 order by pos limit 10) x), '[]'::json),
      'minha', (select json_build_object('pos', pos, 'n', n) from rk2 where aluna_id = auth.uid()),
      'bonus', json_build_array(700, 400, 200)
    ) else null end
$$;
revoke all on function fn_comunidade() from public, anon;
grant execute on function fn_comunidade() to authenticated;

-- Agenda: dia 1º de cada mês, 03:05 UTC = 00:05 em Brasília.
create extension if not exists pg_cron;
select cron.unschedule('bonus-ranking-mes') where exists (select 1 from cron.job where jobname = 'bonus-ranking-mes');
select cron.schedule('bonus-ranking-mes', '5 3 1 * *', $$ select fn_bonus_ranking() $$);

commit;
select 'ok' as status;
