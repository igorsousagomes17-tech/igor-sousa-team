-- Migração 008 (rodada 26/10): a aluna não consegue se dar pontos pelo console do navegador.
-- Antes a regra só olhava o motivo ('story', 'checkin', 'evolucao'): dava pra inserir pontos = 5000, ou o mesmo
-- story várias vezes com ref vazio (ref nulo não bloqueia repetido). Agora ela só registra exatamente:
--   story    = 30 pts, 1 por dia (ref = o dia, até 7 dias pra trás: treino que subiu depois sem sinal)
--   evolucao = 80 pts, 1 por mês (ref = o mês atual ou o anterior)
-- Treino, semana e desafio continuam vindo só dos gatilhos do banco. O Igor (admin) segue podendo tudo.
drop policy if exists "pontos: aluna registra story/checkin" on pontos_log;
create policy "pontos: aluna registra story/checkin" on pontos_log for insert with check (
  is_admin() or (
    aluna_id = auth.uid() and ref is not null and (
      (motivo = 'story' and pontos = 30 and ref ~ '^\d{4}-\d{2}-\d{2}$'
        and ref::date between (now() at time zone 'America/Sao_Paulo')::date - 7 and (now() at time zone 'America/Sao_Paulo')::date + 1)
      or (motivo = 'evolucao' and pontos = 80 and ref ~ '^\d{4}-\d{2}$'
        and ref in (to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM'), to_char((now() at time zone 'America/Sao_Paulo') - interval '1 month', 'YYYY-MM')))
    )
  )
);
select 'ok' as status;
