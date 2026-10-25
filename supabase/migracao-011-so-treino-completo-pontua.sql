-- Migração 011 (decisão do Igor, 26/10): só treino COMPLETO pontua.
-- +50 do treino, contagem da semana (+100) e do desafio do mês só valem quando a aluna fez todos os exercícios
-- obrigatórios (o HIIT/cardio "opcional" não precisa). O app manda exercicios_feitos = exercícios completos e
-- exercicios_total = exercícios obrigatórios. Treinos finalizados antes de 26/10/2026 seguem a regra antiga
-- (1 exercício com série já contava), pra ninguém perder o que já tinha na semana/mês.
-- Substitui a função da migração 007 (mantém o fuso de São Paulo).
create or replace function fn_treino_completo(feitos int, total int, quando timestamptz) returns boolean language sql immutable as $$
  select case when quando < '2026-10-26 00:00:00-03' then coalesce(feitos,0) > 0
              else coalesce(total,0) = 0 or coalesce(feitos,0) >= total end
$$;
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer as $$
declare semana_count int; meta int; mes_count int; d record; mes_ini date; sem_ini date;
begin
  if new.finalizada_em is not null and (old.finalizada_em is null) and fn_treino_completo(new.exercicios_feitos, new.exercicios_total, new.finalizada_em) then
    insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'treino',50,new.id::text) on conflict do nothing;
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
