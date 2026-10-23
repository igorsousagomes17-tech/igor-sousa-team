-- Treino de teste (4x, base nov/dez revisada pelo Igor) na conta do Igor, pra ver como aluna.
do $$
declare uid uuid; pid uuid; t uuid;
begin
  select id into uid from auth.users where email = 'igorsousagomes17@gmail.com';
  insert into planos (aluna_id, mes, titulo, obs)
  values (uid, date_trunc('month', now())::date, 'Treino do mês · 4x', 'Redução de gordura/hipertrofia · Intermediário')
  on conflict (aluna_id, mes) do update set titulo = excluded.titulo, obs = excluded.obs
  returning id into pid;
  delete from treinos where plano_id = pid;

  insert into treinos (plano_id, letra, nome, duracao_min, ordem) values (pid, 'A', 'Quadríceps', 40, 0) returning id into t;
  insert into exercicios (treino_id, ordem, nome, series, reps, descanso_s, dica, alternativa, biset_com) values
  (t,1,'Mobilidade de quadril',1,'1 min cada lado',0,'Solta o quadril antes de colocar carga',null,null),
  (t,2,'Agachamento Smith',3,'12/10/8',90,'Pirâmide: aumenta a carga a cada série. Emenda direto no goblet','Agachamento livre',3),
  (t,3,'Goblet com anilha no calcanhar',3,'15',90,'Desce controlando, joelho acompanha a ponta do pé','Agachamento goblet',2),
  (t,4,'Leg Press 45 pés mais fechados',3,'10-12',60,'2s na descida, sem tirar o quadril do banco','Agachamento hack',null),
  (t,5,'Afundo com Halteres entre Steps',3,'10 cada perna',60,'Tronco levemente à frente, desce fundo','Agachamento búlgaro com halter',null),
  (t,6,'Cadeira Extensora Unilateral + Parciais Alongadas',3,'12 cada + parciais',45,'Na falha, faz meias repetições na parte de baixo',null,null),
  (t,7,'Panturrilha em Pé + Parciais Alongadas',3,'15 + parciais',30,'Segura 1s embaixo, alongando bem',null,null),
  (t,8,'HIIT (opcional)',1,'até 20 min',0,'Escada, esteira ou bike: 30s forte / 30s leve',null,null);

  insert into treinos (plano_id, letra, nome, duracao_min, ordem) values (pid, 'B', 'Posterior e Glúteo', 40, 1) returning id into t;
  insert into exercicios (treino_id, ordem, nome, series, reps, descanso_s, dica, alternativa, biset_com) values
  (t,1,'Caminhada Lateral com Mini Band',2,'15 passos cada lado',30,'Ativação: mantém a tensão no elástico o tempo todo',null,null),
  (t,2,'Agachamento Cossaco (mobilidade)',2,'8 cada lado',30,'Devagar, só até onde o quadril deixa',null,null),
  (t,3,'Elevação de Quadril',4,'12/10/8/8',90,'Segura 2s em cima. Sobe a carga a cada série','Elevaçao de quadril solo com barra',null),
  (t,4,'Cadeira Flexora com Tronco Inclinado',3,'12/10/8',60,'Tronco à frente pra alongar mais o posterior','Mesa flexora',null),
  (t,5,'Levantamento terra Sumo',3,'10-12',90,'2s na descida, coluna neutra','Stiff com halteres',null),
  (t,6,'Agachamento búlgaro com halter',3,'8-10 cada perna',60,'Carga alta, tronco levemente à frente','Búlgaro no smith',null),
  (t,7,'Abdução de Quadril Máquina com Tronco à Frente',3,'12 + 4 + 4',45,'Drop: tira peso e faz +4, tira de novo e faz +4','Abdução de quadril maquina em pé',null),
  (t,8,'HIIT (opcional)',1,'até 20 min',0,'Escada, esteira ou bike: 30s forte / 30s leve',null,null);

  insert into treinos (plano_id, letra, nome, duracao_min, ordem) values (pid, 'C', 'Peito, ombro e tríceps', 40, 2) returning id into t;
  insert into exercicios (treino_id, ordem, nome, series, reps, descanso_s, dica, alternativa, biset_com) values
  (t,1,'Dead Bug',3,'10 cada lado',30,'Lombar colada no chão o tempo todo',null,2),
  (t,2,'Abs infra no banco declinado',3,'15',30,'Sobe o quadril, não só as pernas','Abdominal infra solo',1),
  (t,3,'Supino inclinado maquina',3,'12/10/8',90,'Pirâmide: aumenta a carga a cada série','Supino com Halteres Inclinado Baixo',null),
  (t,4,'Crucifixo na maquina',4,'12',60,'Abre até sentir o peito alongar','Crucifixo com halteres',null),
  (t,5,'Elevação Lateral em Y',4,'12',45,'Sobe até a linha do ombro, sem balanço',null,null),
  (t,6,'Tríceps Acima da Cabeça na Polia',3,'12',45,'Cotovelos apontando pra frente','Tríceps Francês com Halter',null),
  (t,7,'Tríceps polia barra reta',3,'12',45,'Cotovelo colado no corpo','Tríceps máquina paralela',null),
  (t,8,'HIIT (opcional)',1,'até 20 min',0,'Escada, esteira ou bike: 30s forte / 30s leve',null,null);

  insert into treinos (plano_id, letra, nome, duracao_min, ordem) values (pid, 'D', 'Costas e bíceps', 40, 3) returning id into t;
  insert into exercicios (treino_id, ordem, nome, series, reps, descanso_s, dica, alternativa, biset_com) values
  (t,1,'Pallof Press',3,'12 cada lado',30,'Não deixa o tronco girar',null,2),
  (t,2,'Abdominal Infra Solo',3,'15',30,'Desce as pernas devagar',null,1),
  (t,3,'Puxada Pronada',3,'12/10/8',90,'Puxa com o cotovelo, peito pra cima','Puxada Pegada Supinada',null),
  (t,4,'Remada curvada pegada pronada',3,'12/10/8',60,'Coluna neutra, puxa a barra no umbigo','remada maquina pegada neutra',null),
  (t,5,'Puxada Pegada Supinada',2,'10 + (4+4+4)',60,'Na última série: tira peso e faz 4, tira e faz 4, tira e faz 4',null,null),
  (t,6,'Face Pull',3,'15',45,'Puxa a corda na direção da testa','Crucifixo invertido com halter',null),
  (t,7,'Rosca Inclinada com Halteres',3,'10',45,'Ombro pra trás, braço alongado embaixo','Rosca direta no banco inclinado',null),
  (t,8,'Rosca Scott maquina',3,'12',45,'Não tira o cotovelo do apoio',null,null),
  (t,9,'HIIT (opcional)',1,'até 20 min',0,'Escada, esteira ou bike: 30s forte / 30s leve',null,null);
end $$;
select t.letra, t.nome, count(e.*) exercicios from treinos t join planos p on p.id=t.plano_id left join exercicios e on e.treino_id=t.id
where p.aluna_id=(select id from auth.users where email='igorsousagomes17@gmail.com') group by 1,2 order by 1;
