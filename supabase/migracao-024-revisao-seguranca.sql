-- Migração 024 (revisão de segurança, 09/11): fecha brechas que uma aluna conseguia usar pelo console do navegador.
-- NÃO muda nada que o app faz no dia a dia. Pode rodar mais de uma vez. Rodar no SQL Editor do Supabase.

-- 1) "Indicada por" só muda pelo Igor ou pelo servidor (como o código de indicação, migração 002).
--    Antes a aluna podia gravar qualquer pessoa como quem a indicou (o app nunca faz isso por ela).
create or replace function fn_protege_perfil() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() and pg_trigger_depth() < 2 then
    new.role := old.role; new.plano := old.plano; new.ativa := old.ativa;
    new.pontos := old.pontos; new.cod_indicacao := old.cod_indicacao;
    new.indicada_por := old.indicada_por;
  end if;
  return new;
end $$;

-- 2) Treino: a aluna não escreve a resposta "do Igor" nem marca treino no futuro.
--    - resposta_igor / respondida_em: só o Igor (antes ela podia apagar o próprio recado da fila dele
--      gravando uma "resposta" qualquer, e o Igor nunca via o feedback).
--    - finalizada_em no futuro vira "agora" (não perde o treino; só impede adiantar treino pra pontuar/ranking).
create or replace function fn_sessao_guarda() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if tg_op = 'UPDATE' then
      new.resposta_igor := old.resposta_igor; new.respondida_em := old.respondida_em;
    else
      new.resposta_igor := null; new.respondida_em := null;
    end if;
    if new.finalizada_em > now() then new.finalizada_em := now(); end if;
    if new.iniciada_em > now() then new.iniciada_em := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_sessao_guarda on sessoes;
create trigger trg_sessao_guarda before insert or update on sessoes for each row execute function fn_sessao_guarda();

-- 3) Pontos do treino só pra treino finalizado nos últimos 8 dias (mesma folga do story na migração 008:
--    treino que ficou na fila sem internet ainda pontua). Antes dava pra criar treinos com data antiga
--    pelo console e ganhar +50 por treino e +100 por cada semana passada, sem limite.
--    Igual à função da migração 022 + a checagem da data (o Igor/servidor continuam podendo lançar treino antigo).
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer set search_path = public as $$
declare semana_count int; meta int; mes_count int; d record; mes_ini date; sem_ini date; pts int;
begin
  if new.finalizada_em is not null and old.finalizada_em is null
     and auth.uid() is not null and not is_admin() and new.finalizada_em < now() - interval '8 days' then
    return new; -- treino antigo lançado agora: fica no histórico, mas não pontua
  end if;
  if new.finalizada_em is not null and (old.finalizada_em is null) then
    if fn_treino_completo(new.exercicios_feitos, new.exercicios_total, new.finalizada_em) then pts := 50;
    else pts := fn_pontos_treino(new.exercicios_feitos, new.exercicios_total, new.duracao_s); end if;
    if pts > 0 then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'treino',pts,new.id::text) on conflict do nothing;
    end if;
  end if;
  if new.finalizada_em is not null and (old.finalizada_em is null) and fn_treino_completo(new.exercicios_feitos, new.exercicios_total, new.finalizada_em) then
    select coalesce(dias_semana,4) into meta from profiles where id=new.aluna_id;
    sem_ini := date_trunc('week', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select count(*) into semana_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and fn_treino_completo(exercicios_feitos, exercicios_total, finalizada_em)
        and date_trunc('week', finalizada_em at time zone 'America/Sao_Paulo')::date = sem_ini;
    if semana_count >= meta then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'semana',100,to_char(sem_ini,'IYYY-IW')) on conflict do nothing;
    end if;
    mes_ini := date_trunc('month', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select * into d from desafios where mes = mes_ini;
    select count(*) into mes_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and fn_treino_completo(exercicios_feitos, exercicios_total, finalizada_em)
        and date_trunc('month', finalizada_em at time zone 'America/Sao_Paulo')::date = mes_ini;
    if mes_count >= coalesce(d.meta_treinos,16) then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'desafio',coalesce(d.pontos_bonus,200),to_char(mes_ini,'YYYY-MM')) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;

-- 4) Funções com SECURITY DEFINER sem search_path fixo (aviso "function_search_path_mutable" do Supabase).
alter function public.fn_soma_pontos() set search_path = public;
alter function public.email_de(uuid) set search_path = public;

-- 5) OPCIONAL (decisão do Igor): limite de treinos que pontuam por dia. Hoje dá pra criar treino vazio
--    (presencial/sem exercício conta como completo) várias vezes no mesmo dia e ganhar +50 em cada.
--    Pra limitar a 2 por dia, descomente e rode:
-- create or replace function fn_limite_pontos_dia() returns trigger language plpgsql security definer set search_path = public as $$
-- begin
--   if new.motivo = 'treino' and auth.uid() is not null and not is_admin() and (
--     select count(*) from pontos_log where aluna_id = new.aluna_id and motivo = 'treino'
--       and (created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date) >= 2 then
--     return null; -- não grava (o treino continua salvo)
--   end if;
--   return new;
-- end $$;
-- drop trigger if exists trg_limite_pontos_dia on pontos_log;
-- create trigger trg_limite_pontos_dia before insert on pontos_log for each row execute function fn_limite_pontos_dia();

notify pgrst, 'reload schema';
select 'ok' as status;
