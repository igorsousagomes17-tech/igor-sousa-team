-- Migração 026 (19/11/2026): cadastro por convite (transição do Mfit pro app).
-- A aluna se cadastra sozinha pelo app (função cadastro-convite): a conta nasce PAUSADA (ativa=false)
-- e marcada como aguardando. Ela preenche a anamnese e fica esperando o Igor liberar no painel.
-- Enquanto aguarda, não vê comunidade, ranking nem tira-dúvidas (tudo isso já exige ativa=true).
begin;
alter table profiles add column if not exists aguardando boolean not null default false;

-- A aluna não pode se liberar sozinha: "aguardando" entra na lista de campos que só o Igor/servidor mudam.
create or replace function public.fn_protege_perfil() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is not null and not is_admin() and pg_trigger_depth() < 2 then
    new.role := old.role; new.plano := old.plano; new.ativa := old.ativa;
    new.pontos := old.pontos; new.cod_indicacao := old.cod_indicacao;
    new.indicada_por := old.indicada_por; new.aguardando := old.aguardando;
  end if;
  return new;
end $function$;
commit;
select count(*) filter (where aguardando) as aguardando, count(*) as perfis from profiles;
