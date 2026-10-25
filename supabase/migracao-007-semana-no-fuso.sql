-- Migração 007 (rodada 25/10): bônus da semana (+100) no fuso de São Paulo.
-- Antes a semana era contada em horário de Londres: treino no domingo depois das 21h caía na semana seguinte
-- e os +100 não entravam (o app mostrava "Semana fechada 💪"). O mês já tinha sido corrigido na 006.
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer as $$
declare semana_count int; meta int; mes_count int; d record; mes_ini date; sem_ini date;
begin
  if new.finalizada_em is not null and (old.finalizada_em is null) and coalesce(new.exercicios_feitos,0) > 0 then
    insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'treino',50,new.id::text) on conflict do nothing;
    select coalesce(dias_semana,4) into meta from profiles where id=new.aluna_id;
    sem_ini := date_trunc('week', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select count(*) into semana_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and coalesce(exercicios_feitos,0) > 0
        and date_trunc('week', finalizada_em at time zone 'America/Sao_Paulo')::date = sem_ini;
    if semana_count >= meta then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'semana',100,to_char(sem_ini,'IYYY-IW')) on conflict do nothing;
    end if;
    -- desafio do mês
    mes_ini := date_trunc('month', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select * into d from desafios where mes = mes_ini;
    select count(*) into mes_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and coalesce(exercicios_feitos,0) > 0
        and date_trunc('month', finalizada_em at time zone 'America/Sao_Paulo')::date = mes_ini;
    if mes_count >= coalesce(d.meta_treinos,16) then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'desafio',coalesce(d.pontos_bonus,200),to_char(mes_ini,'YYYY-MM')) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
select 'ok' as status;
