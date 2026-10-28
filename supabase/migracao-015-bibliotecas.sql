-- Migração 015 (28/10): biblioteca de exercícios e biblioteca de treinos (modelos) do Igor.
-- Só o Igor (admin) lê e escreve. A aluna continua recebendo o treino copiado no plano dela.

create table if not exists biblioteca_exercicios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  grupo text default 'Outros',      -- Glúteo, Quadríceps, Posterior, Costas, Peito, Ombro, Braços, Core, Cardio, Mobilidade, Outros
  video_url text,
  dica text,
  alternativa text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists biblioteca_exercicios_nome on biblioteca_exercicios (lower(nome));
alter table biblioteca_exercicios enable row level security;
drop policy if exists "biblioteca: só admin" on biblioteca_exercicios;
create policy "biblioteca: só admin" on biblioteca_exercicios for all using (is_admin()) with check (is_admin());

create table if not exists modelos_treino (
  id uuid primary key default gen_random_uuid(),
  nome text not null,               -- "Full Body 3x · iniciante"
  descricao text,
  treinos jsonb not null default '[]', -- [{letra,nome,duracao_min,exercicios:[{nome,series,reps,descanso_s,video_url,dica,alternativa,biset_com}]}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table modelos_treino enable row level security;
drop policy if exists "modelos: só admin" on modelos_treino;
create policy "modelos: só admin" on modelos_treino for all using (is_admin()) with check (is_admin());

-- Começa a biblioteca com os exercícios que já estão nos treinos das alunas (vindos do Mfit)
insert into biblioteca_exercicios (nome, grupo, video_url, dica, alternativa)
select distinct on (lower(trim(e.nome))) trim(e.nome),
  case
    when e.nome ~* 'caminhada lateral|mini ?band' then 'Glúteo'
    when e.nome ~* 'hiit|esteira|bike|bicicleta|escada|el[ií]ptico|corrida|caminhada|polichinelo|burpee|pular corda' then 'Cardio'
    when e.nome ~* 'mobilidade|alongamento|90/90|gato|libera' then 'Mobilidade'
    when e.nome ~* 'prancha|abdominal|dead ?bug|crunch|infra|obl[ií]quo|pallof|canivete|core' then 'Core'
    when e.nome ~* 'quadril|gl[uú]te|abdu|coice|ponte|thrust|caminhada lateral|mini ?band|kickback' then 'Glúteo'
    when e.nome ~* 'stiff|flexora|terra|romeno|good ?morning|posterior|nordic' then 'Posterior'
    when e.nome ~* 'panturrilha|g[eê]meos' then 'Panturrilha'
    when e.nome ~* 'agacha|leg|extensora|afundo|b[uú]lgaro|passada|avan[cç]o|hack|sumô|sumo|step|cadeira adutora|adutora|cossaco' then 'Quadríceps'
    when e.nome ~* 'remada|puxada|pulldown|pull ?down|barra fixa|serrote|pullover|face pull' then 'Costas'
    when e.nome ~* 'supino|crucifixo|flex[aã]o de bra|peck|crossover|voador' then 'Peito'
    when e.nome ~* 'desenvolvimento|eleva[cç][aã]o lateral|eleva[cç][aã]o frontal|ombro|arnold|remada alta' then 'Ombro'
    when e.nome ~* 'rosca|b[ií]ceps|tr[ií]ceps|testa|franc[eê]s|corda|mergulho' then 'Braços'
    else 'Outros' end,
  e.video_url, e.dica, e.alternativa
from exercicios e
where coalesce(trim(e.nome), '') <> ''
order by lower(trim(e.nome)), (e.video_url is null), (e.dica is null)
on conflict do nothing;

select count(*) as exercicios_na_biblioteca from biblioteca_exercicios;
