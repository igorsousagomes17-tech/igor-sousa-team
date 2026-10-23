-- Treino só vale pontos/metas se tiver pelo menos 1 exercício concluído.
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer as $$
declare semana_count int; meta int;
begin
  if new.finalizada_em is not null and (old.finalizada_em is null) and coalesce(new.exercicios_feitos,0) > 0 then
    insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'treino',50,new.id::text) on conflict do nothing;
    select coalesce(dias_semana,4) into meta from profiles where id=new.aluna_id;
    select count(*) into semana_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and coalesce(exercicios_feitos,0) > 0
        and date_trunc('week',finalizada_em)=date_trunc('week',new.finalizada_em);
    if semana_count = meta then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'semana',100,to_char(new.finalizada_em,'IYYY-IW')) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
select 'ok' as status;
