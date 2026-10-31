-- 021 · Biblioteca de exercícios: foto ou vídeo enviado direto pelo Igor (além do link do YouTube)
-- Bucket público (as alunas só leem pelo link do exercício); só o admin envia, troca ou apaga.
insert into storage.buckets (id, name, public, file_size_limit)
values ('exercicios-midia', 'exercicios-midia', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;
drop policy if exists "midia exercicios: admin envia" on storage.objects;
create policy "midia exercicios: admin envia" on storage.objects for insert with check (bucket_id = 'exercicios-midia' and is_admin());
drop policy if exists "midia exercicios: admin troca" on storage.objects;
create policy "midia exercicios: admin troca" on storage.objects for update using (bucket_id = 'exercicios-midia' and is_admin());
drop policy if exists "midia exercicios: admin apaga" on storage.objects;
create policy "midia exercicios: admin apaga" on storage.objects for delete using (bucket_id = 'exercicios-midia' and is_admin());
