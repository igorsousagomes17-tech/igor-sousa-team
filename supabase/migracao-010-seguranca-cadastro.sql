-- Migração 010 (25/10): segurança do cadastro.
-- Antes, qualquer conta logada podia inserir o próprio perfil com role='admin' (a regra aceitava id=auth.uid()).
-- Os perfis são criados só pelo servidor (funções criar-aluna e kiwify-webhook, com a chave de serviço),
-- então só o Igor (admin) precisa inserir pelo app.
drop policy if exists "perfil: admin insere" on profiles;
create policy "perfil: admin insere" on profiles for insert with check (is_admin());
select 'ok' as status;
