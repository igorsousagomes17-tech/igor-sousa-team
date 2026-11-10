-- Migração 025 (revisão final, 10/11): religa as séries que perderam o exercicio_id quando o Igor republicou o plano.
-- Por quê: até agora, republicar o treino no painel apagava e recriava os exercícios; o banco zerava (on delete set null)
-- o exercicio_id das séries que a aluna já tinha feito. O app já foi corrigido (republicar mantém o mesmo id);
-- isto conserta só o que ficou gravado antes.
-- É SEGURO: só faz UPDATE em série com exercicio_id vazio, e só quando acha UM exercício só com o mesmo nome,
-- no treino da mesma letra, no plano que valia pra ela naquele mês. Na dúvida (0 ou 2+ iguais), não mexe.
-- Não apaga nada, não muda carga/reps. Pode rodar mais de uma vez (na 2ª não acha mais nada). Rodar no SQL Editor do Supabase.

update series se
set exercicio_id = m.ex_id
from (
  select se2.id as serie_id, min(e.id::text)::uuid as ex_id
  from series se2
  join sessoes s on s.id = se2.sessao_id
  -- o plano que valia: o último publicado pra ela até o mês do treino (fuso de Brasília)
  join planos p on p.aluna_id = s.aluna_id
   and p.mes = (select max(p2.mes) from planos p2
                where p2.aluna_id = s.aluna_id
                  and p2.mes <= (coalesce(s.iniciada_em, s.finalizada_em) at time zone 'America/Sao_Paulo')::date)
  -- só treino do plano do mês ("Treino A", "Treino B"...), no treino da mesma letra
  join treinos t on t.plano_id = p.id and s.titulo = 'Treino ' || t.letra
  join exercicios e on e.treino_id = t.id
   and lower(btrim(e.nome)) = lower(btrim(se2.exercicio_nome))
  where se2.exercicio_id is null
    and se2.exercicio_nome is not null
  group by se2.id
  having count(distinct e.id) = 1
) m
where se.id = m.serie_id
  and se.exercicio_id is null;
