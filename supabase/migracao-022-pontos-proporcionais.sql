-- Migração 022 (decisão do Igor, 03/11): treino incompleto ganha pontos PROPORCIONAIS, não zero.
-- "A intenção do app nunca é punir, é aderência": surgiu um compromisso e ela saiu no meio, ainda ganha pelo que fez.
-- Completo: +50 (como antes). Incompleto, com pelo menos 1 exercício feito e 10+ min: 50 × feitos/total,
-- arredondado de 5 em 5, mínimo 10. A contagem da semana (+100) e do desafio do mês continua só com treino completo.
-- Só muda daqui pra frente (treinos já finalizados não são recalculados). Pode rodar mais de uma vez.
create or replace function fn_pontos_treino(feitos int, total int, dur_s int) returns int language sql immutable as $$
  select case when coalesce(total,0) = 0 or coalesce(feitos,0) >= total then 50
              when coalesce(feitos,0) <= 0 or coalesce(dur_s,0) < 600 then 0
              else greatest(10, (round(50.0 * feitos / total / 5) * 5)::int) end
$$;
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer as $$
declare semana_count int; meta int; mes_count int; d record; mes_ini date; sem_ini date; pts int;
begin
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
select 'ok' as status;
