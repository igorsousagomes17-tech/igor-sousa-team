-- Migração 012 (27/10): is_admin() lia a tabela profiles passando pela própria regra de segurança de profiles,
-- que chama is_admin() de novo → loop infinito ("stack depth limit exceeded"). Resultado: aluna logada não
-- conseguia ler o próprio perfil. Com SECURITY DEFINER a função lê profiles direto, sem passar pela regra.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Conferência (não muda nada): uma aluna logada tem que ver exatamente 1 perfil, o dela.
begin;
select set_config('request.jwt.claims', json_build_object('sub', (select id from profiles where role <> 'admin' limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
select count(*)::text as perfis_visiveis_pra_aluna from profiles;
rollback;
