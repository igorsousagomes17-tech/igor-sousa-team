-- Migração 004 (23/10): painel do Igor mostra o selo "Personalizado" na lista de alunas.
-- Só acrescenta a coluna plano no fim da view (não mexe em dado nenhum).
create or replace view v_alunas_status as
select p.id, p.nome, p.whatsapp, p.ativa, p.pontos, p.dias_semana,
       max(s.finalizada_em) as ultimo_treino,
       coalesce(extract(day from now() - max(s.finalizada_em))::int, 999) as dias_sem_treinar,
       count(s.id) filter (where s.finalizada_em >= date_trunc('month',now())) as treinos_mes,
       p.plano
from profiles p left join sessoes s on s.aluna_id=p.id and s.finalizada_em is not null
where p.role='aluna'
group by p.id;
select 'ok' as status;
