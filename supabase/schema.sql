-- Igor Sousa Team · v1 schema
-- Rodar no SQL Editor do Supabase (uma vez).

create extension if not exists pgcrypto;

-- PERFIS ---------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'aluna' check (role in ('aluna','admin')),
  nome text not null,
  whatsapp text,
  nascimento date,
  sexo text check (sexo in ('F','M','outro')),
  objetivo text,
  dias_semana int default 4,
  local_treino text default 'academia',
  limitacoes text,
  peso_kg numeric,
  altura_m numeric,
  tempo_treino_min int,
  experiencia text,
  foco text[],
  incomoda text,
  saude text[],
  gestacao text default 'nao',
  sono_estresse int,
  nutri text,
  desistiu text,
  atividade text default 'leve',        -- sedentaria | leve | moderada | alta (fora do treino)
  plano text not null default 'basico' check (plano in ('basico','personalizado')),
  anamnese_em timestamptz,
  ativa boolean not null default true,
  pontos int not null default 0,
  cod_indicacao text unique default encode(gen_random_bytes(4),'hex'),
  indicada_por uuid references profiles(id),
  created_at timestamptz default now()
);

-- TREINOS (template mensal por aluna) ----------------------------------
create table if not exists planos (
  id uuid primary key default gen_random_uuid(),
  aluna_id uuid not null references profiles(id) on delete cascade,
  mes date not null,               -- 1º dia do mês
  titulo text default 'Treino mensal',
  obs text,
  created_at timestamptz default now(),
  unique (aluna_id, mes)
);

create table if not exists treinos (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references planos(id) on delete cascade,
  letra text not null,             -- A, B, C, D
  nome text not null,              -- "Inferior · glúteo e quadríceps"
  duracao_min int default 40,
  ordem int default 0
);

create table if not exists exercicios (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references treinos(id) on delete cascade,
  ordem int not null,
  nome text not null,
  series int not null default 3,
  reps text not null default '12',  -- "12", "10 cada", "30s"
  descanso_s int not null default 60,
  video_url text,                   -- YouTube não listado / arquivo
  dica text,
  alternativa text,                 -- exercício equivalente aprovado
  biset_com int                     -- ordem do exercício pareado
);

-- PROGRAMAS EXTRAS (pra todas) ----------------------------------------
create table if not exists programas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titulo text not null,
  subtitulo text,
  capa_url text,
  ativo boolean default true,
  ordem int default 0
);
create table if not exists programa_treinos (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid references programas(id) on delete cascade,
  nome text not null,
  duracao_min int,
  ordem int default 0,
  exercicios jsonb not null default '[]'   -- [{nome,series,reps,descanso_s,video_url}]
);

-- SESSÕES (treino executado) ------------------------------------------
create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  aluna_id uuid not null references profiles(id) on delete cascade,
  treino_id uuid references treinos(id) on delete set null,
  programa_treino_id uuid references programa_treinos(id) on delete set null,
  titulo text,
  iniciada_em timestamptz default now(),
  finalizada_em timestamptz,
  duracao_s int,
  exercicios_feitos int default 0,
  exercicios_total int default 0,
  esforco int check (esforco between 0 and 10),
  nota int check (nota between 0 and 10),
  comentario text,
  resposta_igor text,
  respondida_em timestamptz
);

create table if not exists series (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references sessoes(id) on delete cascade,
  exercicio_id uuid references exercicios(id) on delete set null,
  exercicio_nome text,
  n int not null,
  kg numeric,
  reps int,
  feita boolean default true
);

-- CARDIO MANUAL (corrida, caminhada, bike...) ----------------------------
create table if not exists cardio (
  id uuid primary key default gen_random_uuid(),
  aluna_id uuid not null references profiles(id) on delete cascade,
  data date not null default current_date,
  tipo text not null,          -- corrida | caminhada | bike | eliptico | outro
  minutos int not null,
  km numeric,
  kcal int,
  created_at timestamptz default now()
);

-- PONTOS / EVOLUÇÃO / RECADOS -------------------------------------------
create table if not exists pontos_log (
  id uuid primary key default gen_random_uuid(),
  aluna_id uuid not null references profiles(id) on delete cascade,
  motivo text not null,     -- treino, semana, desafio, story, checkin, evolucao, indicacao, renovacao
  pontos int not null,
  ref text,                 -- id da sessão etc. (evita duplicar)
  created_at timestamptz default now(),
  unique (aluna_id, motivo, ref)
);

create table if not exists evolucao (
  id uuid primary key default gen_random_uuid(),
  aluna_id uuid not null references profiles(id) on delete cascade,
  data date not null default current_date,
  peso_kg numeric,
  cintura_cm numeric,
  quadril_cm numeric,
  foto_path text,           -- frente: storage evolucao/<aluna_id>/<data>-frente.jpg
  foto_lado text,
  foto_costas text,
  unique (aluna_id, data)
);

create table if not exists recados (
  id uuid primary key default gen_random_uuid(),
  texto text,
  midia_url text,
  publicado_em timestamptz default now(),
  ativo boolean default true
);

create table if not exists desafios (
  id uuid primary key default gen_random_uuid(),
  mes date not null unique,
  titulo text not null,
  meta_treinos int not null default 16,
  pontos_bonus int not null default 200
);

-- PONTOS: trigger que soma no perfil -----------------------------------
create or replace function fn_soma_pontos() returns trigger language plpgsql security definer as $$
begin
  update profiles set pontos = pontos + new.pontos where id = new.aluna_id;
  return new;
end $$;
drop trigger if exists trg_soma_pontos on pontos_log;
create trigger trg_soma_pontos after insert on pontos_log for each row execute function fn_soma_pontos();

-- Ao finalizar sessão: +50 pts (uma vez por sessão) + bônus semana (4 treinos na semana ISO)
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer as $$
declare semana_count int; meta int;
begin
  if new.finalizada_em is not null and (old.finalizada_em is null) then
    insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'treino',50,new.id::text) on conflict do nothing;
    select coalesce(dias_semana,4) into meta from profiles where id=new.aluna_id;
    select count(*) into semana_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null
        and date_trunc('week',finalizada_em)=date_trunc('week',new.finalizada_em);
    if semana_count = meta then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'semana',100,to_char(new.finalizada_em,'IYYY-IW')) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_sessao_finalizada on sessoes;
create trigger trg_sessao_finalizada after update on sessoes for each row execute function fn_sessao_finalizada();

-- VIEWS ÚTEIS ------------------------------------------------------------
create or replace view v_alunas_status as
select p.id, p.nome, p.whatsapp, p.ativa, p.pontos, p.dias_semana,
       max(s.finalizada_em) as ultimo_treino,
       coalesce(extract(day from now() - max(s.finalizada_em))::int, 999) as dias_sem_treinar,
       count(s.id) filter (where s.finalizada_em >= date_trunc('month',now())) as treinos_mes
from profiles p left join sessoes s on s.aluna_id=p.id and s.finalizada_em is not null
where p.role='aluna'
group by p.id;

-- RLS --------------------------------------------------------------------
alter table profiles enable row level security;
alter table planos enable row level security;
alter table treinos enable row level security;
alter table exercicios enable row level security;
alter table programas enable row level security;
alter table programa_treinos enable row level security;
alter table sessoes enable row level security;
alter table series enable row level security;
alter table pontos_log enable row level security;
alter table evolucao enable row level security;
alter table recados enable row level security;
alter table desafios enable row level security;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists(select 1 from profiles where id=auth.uid() and role='admin')
$$;

-- cardio
alter table cardio enable row level security;
create policy "cardio: aluna" on cardio for all using (aluna_id=auth.uid() or is_admin()) with check (aluna_id=auth.uid() or is_admin());

-- profiles
create policy "perfil: ler o próprio ou admin" on profiles for select using (id=auth.uid() or is_admin());
create policy "perfil: editar o próprio" on profiles for update using (id=auth.uid() or is_admin()) with check (id=auth.uid() or is_admin());
create policy "perfil: admin insere" on profiles for insert with check (is_admin() or id=auth.uid());

-- planos/treinos/exercicios: aluna lê os seus; admin tudo
create policy "planos: aluna lê" on planos for select using (aluna_id=auth.uid() or is_admin());
create policy "planos: admin escreve" on planos for all using (is_admin()) with check (is_admin());
create policy "treinos: aluna lê" on treinos for select using (exists(select 1 from planos p where p.id=plano_id and (p.aluna_id=auth.uid() or is_admin())));
create policy "treinos: admin escreve" on treinos for all using (is_admin()) with check (is_admin());
create policy "exercicios: aluna lê" on exercicios for select using (exists(select 1 from treinos t join planos p on p.id=t.plano_id where t.id=treino_id and (p.aluna_id=auth.uid() or is_admin())));
create policy "exercicios: admin escreve" on exercicios for all using (is_admin()) with check (is_admin());

-- programas: todas leem; admin escreve
create policy "programas: todas leem" on programas for select using (auth.uid() is not null);
create policy "programas: admin" on programas for all using (is_admin()) with check (is_admin());
create policy "programa_treinos: todas leem" on programa_treinos for select using (auth.uid() is not null);
create policy "programa_treinos: admin" on programa_treinos for all using (is_admin()) with check (is_admin());

-- sessoes/series: aluna cria/lê/edita as suas; admin lê e responde
create policy "sessoes: aluna" on sessoes for all using (aluna_id=auth.uid() or is_admin()) with check (aluna_id=auth.uid() or is_admin());
create policy "series: aluna" on series for all using (exists(select 1 from sessoes s where s.id=sessao_id and (s.aluna_id=auth.uid() or is_admin()))) with check (exists(select 1 from sessoes s where s.id=sessao_id and (s.aluna_id=auth.uid() or is_admin())));

-- pontos: aluna lê os seus e pode registrar story/checkin; admin tudo
create policy "pontos: ler" on pontos_log for select using (aluna_id=auth.uid() or is_admin());
create policy "pontos: aluna registra story/checkin" on pontos_log for insert with check ((aluna_id=auth.uid() and motivo in ('story','checkin','evolucao')) or is_admin());

create policy "evolucao: aluna" on evolucao for all using (aluna_id=auth.uid() or is_admin()) with check (aluna_id=auth.uid() or is_admin());
create policy "recados: todas leem" on recados for select using (auth.uid() is not null);
create policy "recados: admin" on recados for all using (is_admin()) with check (is_admin());
create policy "desafios: todas leem" on desafios for select using (auth.uid() is not null);
create policy "desafios: admin" on desafios for all using (is_admin()) with check (is_admin());

-- STORAGE: bucket privado "evolucao" (criar no painel) com policy por pasta = aluna_id
insert into storage.buckets (id,name,public) values ('evolucao','evolucao',false) on conflict do nothing;
create policy "evolucao: dona" on storage.objects for all using (bucket_id='evolucao' and (split_part(name,'/',1)=auth.uid()::text or is_admin()));

-- SEED: programas extras
insert into programas (slug,titulo,subtitulo,capa_url,ordem) values
 ('corrida','Fortalecimento pra corrida','8 treinos · 25 min','icons/corrida_s.jpg',1),
 ('abdomen','Abdômen 10 min','6 treinos','icons/abdomen_s.jpg',2),
 ('mobilidade','Mobilidade','5 rotinas · 8 min','icons/mobilidade_s.jpg',3),
 ('casa','Treino em casa','4 treinos · sem aparelho','icons/casa_s.jpg',4)
on conflict (slug) do nothing;

insert into desafios (mes,titulo,meta_treinos,pontos_bonus) values (date_trunc('month',now())::date,'Desafio do mês',16,200) on conflict do nothing;

-- E-mail de uma aluna (admin) pra montar a mensagem de acesso
create or replace function email_de(uid uuid) returns text language sql security definer stable as $$
  select case when is_admin() then (select email from auth.users where id=uid) else null end
$$;

-- Depois de rodar tudo: tornar o Igor admin (troque o e-mail)
-- update profiles set role='admin' where id=(select id from auth.users where email='igorsousagomes17@gmail.com');
