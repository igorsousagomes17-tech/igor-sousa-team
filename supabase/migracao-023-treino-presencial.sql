-- Migração 023 (Igor, 03/11): alunas do plano misto (2 dias presencial com o Igor + 3 sozinhas) registram o dia presencial
-- no app com uma foto de prova. A foto vai pro bucket "evolucao" (pasta da aluna, política "evolucao: dona" já cobre)
-- e o caminho fica aqui. Só acrescenta uma coluna que aceita vazio: o app no ar continua igual. Pode rodar mais de uma vez.
alter table sessoes add column if not exists foto_path text;
notify pgrst, 'reload schema';
select 'ok' as status;
