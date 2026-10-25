-- Migração 009 (25/10): "O time" (comunidade) no app.
-- Cada aluna pode sair do ranking (Perfil › Aparecer no time). Por padrão aparece.
-- Só aluna ATIVA (ou o Igor) recebe os dados. Devolve só primeiro nome + inicial do sobrenome;
-- nunca carga, peso, foto ou e-mail. Ranking conta DIAS com treino (3 treinos no mesmo dia = 1).
-- O feed só mostra títulos conhecidos (Treino A-Z, Cardio 20 min ou o nome do programa extra), nunca texto livre.
alter table profiles add column if not exists comunidade boolean not null default true;

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
  rk as (
    select a.id, a.nome, count(distinct m.dia) as n from mes m join ativas a on a.id = m.aluna_id group by a.id, a.nome
  ),
  rk2 as (select *, rank() over (order by n desc) as pos from rk)
  select case when exists (select 1 from profiles where id = auth.uid() and (ativa or role = 'admin')) then
    json_build_object(
      'hoje', (select count(distinct aluna_id) from feitas, tz where dia = tz.agora::date),
      'mes', (select count(*) from mes),
      'time', (select count(*) from ativas),
      'ativas_mes', (select count(*) from rk),
      'feed', coalesce((select json_agg(x) from (
          select a.nome, f.titulo, f.finalizada_em from feitas f join ativas a on a.id = f.aluna_id, tz
          where f.dia = tz.agora::date order by f.finalizada_em desc limit 30) x), '[]'::json),
      'ranking', coalesce((select json_agg(x) from (
          select nome, n, (id = auth.uid()) as eu from rk2 order by n desc, nome limit 10) x), '[]'::json),
      'minha', (select json_build_object('pos', pos, 'n', n) from rk2 where id = auth.uid())
    ) else null end
$$;
revoke all on function fn_comunidade() from public, anon;
grant execute on function fn_comunidade() to authenticated;
select 'ok' as status;
