-- Migração 027 (25/11, NÃO APLICADA): atualização mensal automática dos treinos.
-- Ramo atualizacao-automatica. Só rodar no SQL Editor depois do sim do Igor, junto com o lançamento (à noite).
-- Tudo aqui só cria coisa nova: nenhuma tabela ou coluna existente muda, e a aluna não vê nada disso.
--
-- O que guarda:
--   bases_mensais     o treino base do mês, com vagas e opções de exercício por vaga
--   assinaturas       o que cada aluna recebeu, pra NÃO repetir no mês seguinte
--   amigas            pares de alunas que são amigas (limite de parecido menor entre elas)
--   lotes / lote_alunas  o lote de cada semana (revisa no fim de semana; cada aluna começa no dia em que o treino dela vence) e o rascunho de cada aluna
--   profiles.pago_ate, profiles.tambem_mfit
--   biblioteca_exercicios.equipamento (halter, máquina...)
-- O histórico do Mfit de cada aluna é lido só na hora de montar o treino dela e não é guardado aqui.

-- Pagamento: a Kiwify passa a gravar até quando está pago (o webhook só liga/pausa hoje)
alter table profiles add column if not exists pago_ate date;
-- Transição: enquanto for true, o treino dela também sobe no Mfit (os dois iguais)
alter table profiles add column if not exists tambem_mfit boolean not null default true;

-- Equipamento de cada exercício da biblioteca: acréscimo novo só com halter
alter table biblioteca_exercicios add column if not exists equipamento text;
update biblioteca_exercicios set equipamento = case
  when nome ~* 'halter|dumbbell|goblet|kettlebell' then 'halter'
  when nome ~* 'm[aá]quina|cadeira|mesa flexora|leg ?press|hack|p[eê]ndulo|articulad|peck|voador|graviton|adutora|abdutora|extensora|flexora|crossover' then 'maquina'
  when nome ~* 'polia|cabo|corda|puxada|pulldown|face pull|pallof' then 'polia'
  when nome ~* 'smith' then 'smith'
  when nome ~* 'barra|terra|sum[oô]|stiff' then 'barra'
  when nome ~* 'el[aá]stico|mini ?band|band' then 'elastico'
  when nome ~* 'prancha|abdominal|dead ?bug|flex[aã]o|mobilidade|alongamento|ponte|cossaco' then 'peso_corpo'
  else 'outro' end
where equipamento is null;

create table if not exists bases_mensais (
  id uuid primary key default gen_random_uuid(),
  mes date not null unique,           -- 1º dia do mês
  nome text not null,                 -- "Base dezembro · força com pirâmide"
  treinos jsonb not null default '[]',-- [{letra,nome,duracao_min,vagas:[{id,opcoes:[nomes],series,reps,reps_opcoes,descanso_s,metodos,biset_com}]}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists assinaturas (
  aluna_id uuid primary key references profiles(id) on delete cascade,
  mes date not null,                  -- de qual base saiu
  escolhas jsonb not null default '{}', -- {vagaId: exercício}
  metodos jsonb not null default '{}',
  reps jsonb not null default '{}',
  ordem jsonb not null default '[]',  -- ordem dos dias dela
  updated_at timestamptz default now()
);

create table if not exists amigas (
  aluna_a uuid not null references profiles(id) on delete cascade,
  aluna_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (aluna_a, aluna_b),
  check (aluna_a < aluna_b)            -- cada par uma vez só
);

create table if not exists lotes (
  id uuid primary key default gen_random_uuid(),
  fechamento date not null unique check (extract(isodow from fechamento) in (6, 7)), -- fim de semana em que o Igor revisa
  ate date not null,                   -- entram as alunas cujo treino vence até esse dia (domingo seguinte)
  base_id uuid references bases_mensais(id),
  status text not null default 'rascunho' check (status in ('rascunho', 'revisado', 'publicado')),
  created_at timestamptz default now(),
  publicado_em timestamptz
);

create table if not exists lote_alunas (
  lote_id uuid not null references lotes(id) on delete cascade,
  aluna_id uuid not null references profiles(id) on delete cascade,
  fim_anterior date,                   -- quando o treino atual vence
  inicio date,                         -- o treino novo entra no dia em que vence o atual (Igor, 25/11)
  fim date check (fim is null or extract(isodow from fim) in (6, 7)), -- e vence num sábado ou domingo
  trocas jsonb not null default '[]',  -- o que mudou da base pra ela e por quê [{letra,vaga,de,para,motivo}]
  pagamento text check (pagamento in ('pago', 'pendente', 'nao_achei')),
  pagamento_obs text,                  -- "Kiwify até 20/11", "Pix"
  treinos jsonb,                       -- rascunho no formato do editor (letra, nome, exercicios...)
  avisos text[] not null default '{}', -- regras que precisam do olho do Igor
  parecido_pct int,                    -- % igual com a aluna mais parecida do lote
  parecido_com uuid references profiles(id),
  aprovado boolean not null default false,
  no_app_em timestamptz,               -- publicado no app
  no_mfit_em timestamptz,              -- subido no Mfit (preenchido depois de confirmar lá)
  divergencia text,                    -- se a comparação app x Mfit achou diferença
  primary key (lote_id, aluna_id)
);

-- Tudo só pro Igor (admin)
alter table bases_mensais enable row level security;
alter table assinaturas enable row level security;
alter table amigas enable row level security;
alter table lotes enable row level security;
alter table lote_alunas enable row level security;
drop policy if exists "bases: só admin" on bases_mensais;      create policy "bases: só admin" on bases_mensais for all using (is_admin()) with check (is_admin());
drop policy if exists "assinaturas: só admin" on assinaturas;  create policy "assinaturas: só admin" on assinaturas for all using (is_admin()) with check (is_admin());
drop policy if exists "amigas: só admin" on amigas;            create policy "amigas: só admin" on amigas for all using (is_admin()) with check (is_admin());
drop policy if exists "lotes: só admin" on lotes;              create policy "lotes: só admin" on lotes for all using (is_admin()) with check (is_admin());
drop policy if exists "lote_alunas: só admin" on lote_alunas;  create policy "lote_alunas: só admin" on lote_alunas for all using (is_admin()) with check (is_admin());

-- Desfazer (se precisar): drop table lote_alunas, lotes, amigas, assinaturas, bases_mensais;
--   alter table profiles drop column pago_ate, drop column tambem_mfit; alter table biblioteca_exercicios drop column equipamento;
