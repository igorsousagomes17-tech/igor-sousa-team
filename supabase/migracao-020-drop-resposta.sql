-- Migração 020: drop set (cargas das quedas) e resposta da aluna pro Igor.
-- Só ADICIONA colunas que aceitam vazio (sem NOT NULL, sem default, sem renomear): o app que está no ar
-- continua funcionando com isso aplicado antes do código novo. Pode rodar mais de uma vez.

-- 1) Drop set: as cargas das quedas de cada série, ex.: [{"kg":30,"reps":8},{"kg":20,"reps":6}]
--    A série continua com kg = 1ª carga (a do recorde) e reps = soma de tudo (12+8+6 = 26), como já era.
alter table series add column if not exists drops jsonb;

-- 2) Resposta da aluna pro Igor (embaixo da resposta dele no Perfil)
alter table sessoes add column if not exists resposta_aluna text;
alter table sessoes add column if not exists resposta_aluna_em timestamptz;
alter table sessoes add column if not exists resposta_aluna_lida_em timestamptz; -- o Igor marca "já vi" no painel

-- A aluna responde por esta função (e não por update direto): só na sessão dela, só depois que o Igor respondeu,
-- até 1000 caracteres, e só mexe nessas duas colunas. O Igor lê pela política "sessoes: aluna" (is_admin()).
create or replace function responder_igor(p_sessao uuid, p_texto text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_txt text := nullif(btrim(coalesce(p_texto, '')), ''); v_em timestamptz := now();
begin
  if auth.uid() is null then raise exception 'sem login'; end if;
  if v_txt is null then raise exception 'resposta vazia'; end if;
  if char_length(v_txt) > 1000 then raise exception 'resposta maior que 1000 caracteres'; end if;
  update sessoes set resposta_aluna = v_txt, resposta_aluna_em = v_em, resposta_aluna_lida_em = null
   where id = p_sessao and aluna_id = auth.uid() and resposta_igor is not null;
  if not found then raise exception 'sessão não encontrada'; end if;
  return v_em;
end $$;
revoke all on function responder_igor(uuid, text) from public;
grant execute on function responder_igor(uuid, text) to authenticated;

-- Igor marca a resposta da aluna como lida (só admin)
create or replace function marcar_resposta_aluna_lida(p_sessao uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'só o Igor'; end if;
  update sessoes set resposta_aluna_lida_em = now() where id = p_sessao;
end $$;
revoke all on function marcar_resposta_aluna_lida(uuid) from public;
grant execute on function marcar_resposta_aluna_lida(uuid) to authenticated;

-- PostgREST enxerga as colunas e funções novas sem reiniciar
notify pgrst, 'reload schema';
