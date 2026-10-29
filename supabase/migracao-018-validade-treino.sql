-- Migração 018 (28/10): validade do treino (início e vencimento, como no Mfit) + "marcar como lida" nas Atualizações do painel.
-- As datas das 10 contas atuais foram preenchidas a partir do Mfit na hora de aplicar.
alter table planos add column if not exists inicio date;
alter table planos add column if not exists fim date;
alter table planos add column if not exists visto_em timestamptz;
