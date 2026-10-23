-- 1) Troca de senha obrigatória no 1º acesso
alter table profiles add column if not exists senha_trocada boolean not null default false;
update profiles set senha_trocada = true where role = 'admin';

-- 2) Aluna só edita os próprios dados pessoais: role, plano, ativa, pontos e código de indicação
--    só mudam pelo Igor (admin), pelo servidor (service role) ou pelos gatilhos de pontos.
create or replace function fn_protege_perfil() returns trigger language plpgsql security definer as $$
begin
  if auth.uid() is not null and not is_admin() and pg_trigger_depth() < 2 then
    new.role := old.role; new.plano := old.plano; new.ativa := old.ativa;
    new.pontos := old.pontos; new.cod_indicacao := old.cod_indicacao;
  end if;
  return new;
end $$;
drop trigger if exists trg_protege_perfil on profiles;
create trigger trg_protege_perfil before update on profiles for each row execute function fn_protege_perfil();
select count(*) filter (where senha_trocada) as ja_trocaram, count(*) as total from profiles;
