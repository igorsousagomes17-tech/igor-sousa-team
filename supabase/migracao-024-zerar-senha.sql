-- Migração 024 (13/11): Igor zera a senha da aluna pelo painel, sem depender de e-mail.
-- A senha volta a ser o WhatsApp dela (só números) e o app pede pra ela criar uma nova no próximo acesso.
create or replace function public.zerar_senha(uid uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare w text;
begin
  if not is_admin() then raise exception 'só o Igor pode zerar senha'; end if;
  select regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') into w from profiles where id = uid and role <> 'admin';
  if w is null then raise exception 'aluna não encontrada'; end if;
  if length(w) < 8 then raise exception 'WhatsApp da aluna está incompleto no cadastro'; end if;
  update auth.users set encrypted_password = extensions.crypt(w, extensions.gen_salt('bf')), updated_at = now() where id = uid;
  update profiles set senha_trocada = false where id = uid;
  return w;
end $$;
revoke all on function public.zerar_senha(uuid) from public, anon;
grant execute on function public.zerar_senha(uuid) to authenticated;
