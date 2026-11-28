-- Migração 029 (28/11/2026, rodada automática de críticas) — PRONTA, NÃO RODADA: decisão do Igor.
-- Problema (Renata e Júlia): o ranking do mês (bônus 700/400/200) conta o DIA com qualquer série marcada.
-- Uma série de 6 segundos e "Encerrar" já soma 1 dia no ranking, enquanto o app diz que esse treino "não pontua".
-- Regra proposta: o dia só conta no ranking se teve pelo menos 1 treino que pontua:
--   completo (todos os exercícios obrigatórios) OU parcial com 1+ exercício e 10+ min (mesma regra da migração 022).
-- Presencial (migração 023) entra como completo. Não mexe em pontos já dados nem no bônus já pago.
-- Rodar inteiro no SQL Editor do Supabase. Pode rodar de novo sem problema.
begin;
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
      and (fn_treino_completo(s.exercicios_feitos, s.exercicios_total, s.finalizada_em) or coalesce(s.duracao_s, 0) >= 600)
      and (s.finalizada_em at time zone 'America/Sao_Paulo')::date >= date_trunc('month', p_mes)::date
      and (s.finalizada_em at time zone 'America/Sao_Paulo')::date < (date_trunc('month', p_mes) + interval '1 month')::date
    group by 1, 2
  ),
  rk as (select d.aluna_id, count(*) as n, max(d.primeiro) as chegou from dias d group by d.aluna_id)
  select rk.aluna_id, a.nome, rk.n, rk.chegou, row_number() over (order by rk.n desc, rk.chegou asc, a.nome) as pos
  from rk join ativas a on a.id = rk.aluna_id
$$;
revoke all on function fn_ranking_mes(date) from public, anon, authenticated;
commit;
select 'ok' as status;
