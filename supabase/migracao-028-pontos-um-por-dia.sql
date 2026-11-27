-- Migração 028 (26/11/2026, aprovada pelo Igor: "Pode pôr tudo"). Rodar no SQL Editor do Supabase junto com o lançamento da noite.
-- Problema: hoje cada sessão finalizada dá +50, sem limite por dia. Como a aluna grava as próprias sessões
-- (RLS "sessoes: aluna" é for all), dá pra repetir treino curto ou criar sessão "completa" direto pela API
-- e acumular pontos, e o desafio do mês (16 treinos) pode ser batido num dia só. Com prêmio de verdade, isso é risco.
-- Regra nova: pontos de treino só no 1º treino que pontua no dia (horário de Brasília).
-- Meta da semana e desafio do mês passam a contar DIAS com treino completo, não sessões.
-- Treino incompleto continua proporcional (migração 022). Só vale daqui pra frente. Pode rodar mais de uma vez.
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer as $$
declare semana_count int; meta int; mes_count int; d record; mes_ini date; sem_ini date; pts int; dia date; ja_pontuou boolean;
begin
  if new.finalizada_em is not null and (old.finalizada_em is null) then
    if fn_treino_completo(new.exercicios_feitos, new.exercicios_total, new.finalizada_em) then pts := 50;
    else pts := fn_pontos_treino(new.exercicios_feitos, new.exercicios_total, new.duracao_s); end if;
    dia := (new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select exists (
      select 1 from pontos_log pl join sessoes s on s.id::text = pl.ref
       where pl.aluna_id = new.aluna_id and pl.motivo = 'treino' and s.id <> new.id
         and (s.finalizada_em at time zone 'America/Sao_Paulo')::date = dia
    ) into ja_pontuou;
    if pts > 0 and not ja_pontuou then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'treino',pts,new.id::text) on conflict do nothing;
    end if;
  end if;
  if new.finalizada_em is not null and (old.finalizada_em is null) and fn_treino_completo(new.exercicios_feitos, new.exercicios_total, new.finalizada_em) then
    select coalesce(dias_semana,4) into meta from profiles where id=new.aluna_id;
    sem_ini := date_trunc('week', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select count(distinct (finalizada_em at time zone 'America/Sao_Paulo')::date) into semana_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and fn_treino_completo(exercicios_feitos, exercicios_total, finalizada_em)
        and date_trunc('week', finalizada_em at time zone 'America/Sao_Paulo')::date = sem_ini;
    if semana_count >= meta then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'semana',100,to_char(sem_ini,'IYYY-IW')) on conflict do nothing;
    end if;
    mes_ini := date_trunc('month', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select * into d from desafios where mes = mes_ini;
    select count(distinct (finalizada_em at time zone 'America/Sao_Paulo')::date) into mes_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and fn_treino_completo(exercicios_feitos, exercicios_total, finalizada_em)
        and date_trunc('month', finalizada_em at time zone 'America/Sao_Paulo')::date = mes_ini;
    if mes_count >= coalesce(d.meta_treinos,16) then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'desafio',coalesce(d.pontos_bonus,200),to_char(mes_ini,'YYYY-MM')) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
select 'ok' as status;
