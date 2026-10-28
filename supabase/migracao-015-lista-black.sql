-- Migração 015 (28/10): lista de espera da Black Friday 2026 (formulário do igorsousa.com.br).
-- Qualquer visitante pode SE CADASTRAR (insert), mas só o Igor (admin) consegue LER a lista.
create table if not exists lista_black (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 80),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 120),
  origem text default 'site' check (char_length(origem) <= 40),
  created_at timestamptz default now()
);
create unique index if not exists lista_black_whatsapp on lista_black(whatsapp);
alter table lista_black enable row level security;
drop policy if exists "lista_black: qualquer um entra" on lista_black;
create policy "lista_black: qualquer um entra" on lista_black for insert to anon, authenticated with check (true);
drop policy if exists "lista_black: só admin lê" on lista_black;
create policy "lista_black: só admin lê" on lista_black for select using (is_admin());
drop policy if exists "lista_black: só admin apaga" on lista_black;
create policy "lista_black: só admin apaga" on lista_black for delete using (is_admin());
grant insert on lista_black to anon, authenticated;
select 'ok' as status;
