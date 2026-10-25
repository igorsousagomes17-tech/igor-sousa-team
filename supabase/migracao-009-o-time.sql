-- Migração 009 (25/10): "O time" (comunidade) no app.
-- Cada aluna pode sair do ranking (Perfil › Aparecer no time). Por padrão aparece.
-- A função devolve só o primeiro nome + a inicial do sobrenome; nunca carga, peso, foto ou e-mail.
alter table profiles add column if not exists comunidade boolean not null default true;

create or replace function fn_comunidade() returns json
language sql stable security definer set search_path = public as $$
  with tz as (select (now() at time zone 'America/Sao_Paulo') as agora),
  ativas as (
    select id,
      split_part(trim(nome), ' ', 1) ||
      case when split_part(trim(nome), ' ', 2) <> '' then ' ' || upper(left(split_part(trim(nome), ' ', 2), 1)) || '.' else '' end as nome
    from profiles where role = 'aluna' and ativa and comunidade
  ),
  feitas as (
    select s.aluna_id, s.titulo, s.finalizada_em from sessoes s join ativas a on a.id = s.aluna_id
    where s.finalizada_em is not null and coalesce(s.exercicios_feitos, 0) > 0
  ),
  mes as (select * from feitas, tz where (finalizada_em at time zone 'America/Sao_Paulo') >= date_trunc('month', tz.agora))
  select json_build_object(
    'hoje', (select count(distinct aluna_id) from feitas, tz where (finalizada_em at time zone 'America/Sao_Paulo')::date = tz.agora::date),
    'mes', (select count(*) from mes),
    'time', (select count(*) from ativas),
    'feed', coalesce((select json_agg(x) from (
        select a.nome, f.titulo, f.finalizada_em from feitas f join ativas a on a.id = f.aluna_id
        where f.finalizada_em >= now() - interval '48 hours' order by f.finalizada_em desc limit 30) x), '[]'::json),
    'ranking', coalesce((select json_agg(x) from (
        select a.nome, count(*) as n, (a.id = auth.uid()) as eu from mes m join ativas a on a.id = m.aluna_id
        group by a.id, a.nome order by n desc, a.nome limit 10) x), '[]'::json)
  )
$$;
revoke all on function fn_comunidade() from public, anon;
grant execute on function fn_comunidade() to authenticated;
select 'ok' as status;
