-- 027 · Até 3 planilhas de treino por aluna (Igor, 26/11): ex. Academia, Em casa, Viagem.
-- Cada planilha é um "slot" (1, 2 ou 3) com nome próprio; a aluna escolhe qual usar no app.
-- Antes: unique (aluna_id, mes) = uma planilha por mês. Agora: unique (aluna_id, mes, slot).
begin;
alter table planos add column if not exists slot smallint not null default 1;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'planos_slot_chk') then
    alter table planos add constraint planos_slot_chk check (slot between 1 and 3);
  end if;
end $$;
do $$ declare c text; begin
  for c in select con.conname from pg_constraint con join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'planos' and con.contype = 'u'
      and (select array_agg(att.attname::text order by att.attname) from unnest(con.conkey) k join pg_attribute att on att.attrelid = rel.oid and att.attnum = k) = array['aluna_id','mes']
  loop execute format('alter table planos drop constraint %I', c); end loop;
end $$;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'planos_aluna_mes_slot_key') then
    alter table planos add constraint planos_aluna_mes_slot_key unique (aluna_id, mes, slot);
  end if;
end $$;
commit;
