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
-- 1) Troca de senha obrigatória no 1º acesso
alter table profiles add column if not exists senha_trocada boolean not null default false;
update profiles set senha_trocada = true where role = 'admin';

-- 2) Aluna só edita os próprios dados pessoais: role, plano, ativa, pontos e código de indicação
--    só mudam pelo Igor (admin), pelo servidor (service role) ou pelos gatilhos de pontos.
create or replace function fn_protege_perfil() returns trigger language plpgsql security definer as $$
begin
  if auth.uid() is not null and not is_admin() and pg_trigger_depth() < 2 then
    new.role := old.role; new.plano := old.plano; new.ativa := old.ativa;
    new.pontos := old.pontos; new.cod_indicacao := old.cod_indicacao;
  end if;
  return new;
end $$;
drop trigger if exists trg_protege_perfil on profiles;
create trigger trg_protege_perfil before update on profiles for each row execute function fn_protege_perfil();
select count(*) filter (where senha_trocada) as ja_trocaram, count(*) as total from profiles;
-- Treino só vale pontos/metas se tiver pelo menos 1 exercício concluído.
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer as $$
declare semana_count int; meta int;
begin
  if new.finalizada_em is not null and (old.finalizada_em is null) and coalesce(new.exercicios_feitos,0) > 0 then
    insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'treino',50,new.id::text) on conflict do nothing;
    select coalesce(dias_semana,4) into meta from profiles where id=new.aluna_id;
    select count(*) into semana_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and coalesce(exercicios_feitos,0) > 0
        and date_trunc('week',finalizada_em)=date_trunc('week',new.finalizada_em);
    if semana_count = meta then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'semana',100,to_char(new.finalizada_em,'IYYY-IW')) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
select 'ok' as status;

-- Migração 004 (23/10): painel do Igor mostra o selo "Personalizado" na lista de alunas.
-- Só acrescenta a coluna plano no fim da view (não mexe em dado nenhum).
create or replace view v_alunas_status with (security_invoker = true) as
select p.id, p.nome, p.whatsapp, p.ativa, p.pontos, p.dias_semana,
       max(s.finalizada_em) as ultimo_treino,
       coalesce(extract(day from now() - max(s.finalizada_em))::int, 999) as dias_sem_treinar,
       count(s.id) filter (where s.finalizada_em >= date_trunc('month',now())) as treinos_mes,
       p.plano
from profiles p left join sessoes s on s.aluna_id=p.id and s.finalizada_em is not null
where p.role='aluna'
group by p.id;
select 'ok' as status;
-- Migração 005 (23/10): Assistente IA (tira-dúvidas) — guarda as conversas.
-- A aluna só lê as próprias mensagens; o Igor (admin) lê todas. Quem grava é a função do servidor.
create table if not exists assistente_msgs (
  id uuid primary key default gen_random_uuid(),
  aluna_id uuid not null references profiles(id) on delete cascade,
  papel text not null check (papel in ('user','assistant')),
  texto text not null,
  created_at timestamptz not null default now()
);
create index if not exists assistente_msgs_aluna_data on assistente_msgs (aluna_id, created_at desc);
alter table assistente_msgs enable row level security;
drop policy if exists "assistente: ler as próprias ou admin" on assistente_msgs;
create policy "assistente: ler as próprias ou admin" on assistente_msgs for select using (aluna_id = auth.uid() or is_admin());
select 'ok' as status;

-- ===== migracao-006-desafio-do-mes.sql (2026-10-24) =====
-- Migração 006 (rodada 24/10): os +200 pts do Desafio do mês entram de verdade.
-- O app mostrava "Batido! +200 pts", mas nenhum código dava os pontos. Agora o gatilho do fim do treino
-- dá o bônus uma vez por mês (ref = 'AAAA-MM'), contando os treinos no fuso de São Paulo.
-- Até rodar esta migração, o app só mostra "Batido! 🎉" (sem prometer pontos).
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer as $$
declare semana_count int; meta int; mes_count int; d record; mes_ini date;
begin
  if new.finalizada_em is not null and (old.finalizada_em is null) and coalesce(new.exercicios_feitos,0) > 0 then
    insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'treino',50,new.id::text) on conflict do nothing;
    select coalesce(dias_semana,4) into meta from profiles where id=new.aluna_id;
    select count(*) into semana_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and coalesce(exercicios_feitos,0) > 0
        and date_trunc('week',finalizada_em)=date_trunc('week',new.finalizada_em);
    if semana_count = meta then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'semana',100,to_char(new.finalizada_em,'IYYY-IW')) on conflict do nothing;
    end if;
    -- desafio do mês
    mes_ini := date_trunc('month', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select * into d from desafios where mes = mes_ini;
    select count(*) into mes_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and coalesce(exercicios_feitos,0) > 0
        and date_trunc('month', finalizada_em at time zone 'America/Sao_Paulo')::date = mes_ini;
    if mes_count >= coalesce(d.meta_treinos,16) then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'desafio',coalesce(d.pontos_bonus,200),to_char(mes_ini,'YYYY-MM')) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
select 'ok' as status;

-- ===== migracao-007-semana-no-fuso.sql =====
-- Migração 007 (rodada 25/10): bônus da semana (+100) no fuso de São Paulo.
-- Antes a semana era contada em horário de Londres: treino no domingo depois das 21h caía na semana seguinte
-- e os +100 não entravam (o app mostrava "Semana fechada 💪"). O mês já tinha sido corrigido na 006.
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer as $$
declare semana_count int; meta int; mes_count int; d record; mes_ini date; sem_ini date;
begin
  if new.finalizada_em is not null and (old.finalizada_em is null) and coalesce(new.exercicios_feitos,0) > 0 then
    insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'treino',50,new.id::text) on conflict do nothing;
    select coalesce(dias_semana,4) into meta from profiles where id=new.aluna_id;
    sem_ini := date_trunc('week', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select count(*) into semana_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and coalesce(exercicios_feitos,0) > 0
        and date_trunc('week', finalizada_em at time zone 'America/Sao_Paulo')::date = sem_ini;
    if semana_count >= meta then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'semana',100,to_char(sem_ini,'IYYY-IW')) on conflict do nothing;
    end if;
    -- desafio do mês
    mes_ini := date_trunc('month', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select * into d from desafios where mes = mes_ini;
    select count(*) into mes_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and coalesce(exercicios_feitos,0) > 0
        and date_trunc('month', finalizada_em at time zone 'America/Sao_Paulo')::date = mes_ini;
    if mes_count >= coalesce(d.meta_treinos,16) then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'desafio',coalesce(d.pontos_bonus,200),to_char(mes_ini,'YYYY-MM')) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
select 'ok' as status;

-- ===== migracao-008-pontos-protegidos.sql =====
-- Migração 008 (rodada 26/10): a aluna não consegue se dar pontos pelo console do navegador.
-- Antes a regra só olhava o motivo ('story', 'checkin', 'evolucao'): dava pra inserir pontos = 5000, ou o mesmo
-- story várias vezes com ref vazio (ref nulo não bloqueia repetido). Agora ela só registra exatamente:
--   story    = 30 pts, 1 por dia (ref = o dia, até 7 dias pra trás: treino que subiu depois sem sinal)
--   evolucao = 80 pts, 1 por mês (ref = o mês atual ou o anterior)
-- Treino, semana e desafio continuam vindo só dos gatilhos do banco. O Igor (admin) segue podendo tudo.
drop policy if exists "pontos: aluna registra story/checkin" on pontos_log;
create policy "pontos: aluna registra story/checkin" on pontos_log for insert with check (
  is_admin() or (
    aluna_id = auth.uid() and ref is not null and (
      (motivo = 'story' and pontos = 30 and ref ~ '^\d{4}-\d{2}-\d{2}$'
        and ref::date between (now() at time zone 'America/Sao_Paulo')::date - 7 and (now() at time zone 'America/Sao_Paulo')::date + 1)
      or (motivo = 'evolucao' and pontos = 80 and ref ~ '^\d{4}-\d{2}$'
        and ref in (to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM'), to_char((now() at time zone 'America/Sao_Paulo') - interval '1 month', 'YYYY-MM')))
    )
  )
);
select 'ok' as status;

-- Migração 009 (25/10): "O time" (comunidade) no app.
-- Cada aluna pode sair do ranking (Perfil › Aparecer no time). Por padrão aparece.
-- Só aluna ATIVA (ou o Igor) recebe os dados. Devolve só primeiro nome + inicial do sobrenome;
-- nunca carga, peso, foto ou e-mail. Ranking conta DIAS com treino (3 treinos no mesmo dia = 1).
-- O feed só mostra títulos conhecidos (Treino A-Z, Cardio 20 min ou o nome do programa extra), nunca texto livre.
alter table profiles add column if not exists comunidade boolean not null default true;

create or replace function fn_comunidade() returns json
language sql stable security definer set search_path = public as $$
  with tz as (select (now() at time zone 'America/Sao_Paulo') as agora),
  ativas as (
    select id,
      coalesce(nullif(split_part(trim(coalesce(nome, '')), ' ', 1), ''), 'Aluna') ||
      case when split_part(trim(coalesce(nome, '')), ' ', 2) <> '' then ' ' || upper(left(split_part(trim(nome), ' ', 2), 1)) || '.' else '' end as nome
    from profiles where role = 'aluna' and ativa and comunidade
  ),
  feitas as (
    select s.aluna_id, s.finalizada_em, (s.finalizada_em at time zone 'America/Sao_Paulo')::date as dia,
      case when s.titulo ~ '^Treino [A-Z]$' or s.titulo = 'Cardio 20 min' then s.titulo
           else coalesce((select p.titulo from programas p where s.titulo = p.titulo or s.titulo like p.titulo || ' ·%' limit 1), 'um treino') end as titulo
    from sessoes s join ativas a on a.id = s.aluna_id
    where s.finalizada_em is not null and coalesce(s.exercicios_feitos, 0) > 0
  ),
  mes as (select f.* from feitas f, tz where f.dia >= date_trunc('month', tz.agora)::date),
  rk as (
    select a.id, a.nome, count(distinct m.dia) as n from mes m join ativas a on a.id = m.aluna_id group by a.id, a.nome
  ),
  rk2 as (select *, rank() over (order by n desc) as pos from rk)
  select case when exists (select 1 from profiles where id = auth.uid() and (ativa or role = 'admin')) then
    json_build_object(
      'hoje', (select count(distinct aluna_id) from feitas, tz where dia = tz.agora::date),
      'mes', (select count(*) from mes),
      'time', (select count(*) from ativas),
      'ativas_mes', (select count(*) from rk),
      'feed', coalesce((select json_agg(x) from (
          select a.nome, f.titulo, f.finalizada_em from feitas f join ativas a on a.id = f.aluna_id, tz
          where f.dia = tz.agora::date order by f.finalizada_em desc limit 30) x), '[]'::json),
      'ranking', coalesce((select json_agg(x) from (
          select nome, n, (id = auth.uid()) as eu from rk2 order by n desc, nome limit 10) x), '[]'::json),
      'minha', (select json_build_object('pos', pos, 'n', n) from rk2 where id = auth.uid())
    ) else null end
$$;
revoke all on function fn_comunidade() from public, anon;
grant execute on function fn_comunidade() to authenticated;
select 'ok' as status;

-- Migração 010 (25/10): segurança do cadastro.
-- Antes, qualquer conta logada podia inserir o próprio perfil com role='admin' (a regra aceitava id=auth.uid()).
-- Os perfis são criados só pelo servidor (funções criar-aluna e kiwify-webhook, com a chave de serviço),
-- então só o Igor (admin) precisa inserir pelo app.
drop policy if exists "perfil: admin insere" on profiles;
create policy "perfil: admin insere" on profiles for insert with check (is_admin());
select 'ok' as status;

-- ===== migracao-011-so-treino-completo-pontua.sql =====
-- Migração 011 (decisão do Igor, 26/10): só treino COMPLETO pontua.
-- +50 do treino, contagem da semana (+100) e do desafio do mês só valem quando a aluna fez todos os exercícios
-- obrigatórios (o HIIT/cardio "opcional" não precisa). O app manda exercicios_feitos = exercícios completos e
-- exercicios_total = exercícios obrigatórios. Treinos finalizados antes de 26/10/2026 seguem a regra antiga
-- (1 exercício com série já contava), pra ninguém perder o que já tinha na semana/mês.
-- Substitui a função da migração 007 (mantém o fuso de São Paulo).
create or replace function fn_treino_completo(feitos int, total int, quando timestamptz) returns boolean language sql immutable as $$
  select case when quando < '2026-10-26 00:00:00-03' then coalesce(feitos,0) > 0
              else coalesce(total,0) = 0 or coalesce(feitos,0) >= total end
$$;
create or replace function fn_sessao_finalizada() returns trigger language plpgsql security definer as $$
declare semana_count int; meta int; mes_count int; d record; mes_ini date; sem_ini date;
begin
  if new.finalizada_em is not null and (old.finalizada_em is null) and fn_treino_completo(new.exercicios_feitos, new.exercicios_total, new.finalizada_em) then
    insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'treino',50,new.id::text) on conflict do nothing;
    select coalesce(dias_semana,4) into meta from profiles where id=new.aluna_id;
    sem_ini := date_trunc('week', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select count(*) into semana_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and fn_treino_completo(exercicios_feitos, exercicios_total, finalizada_em)
        and date_trunc('week', finalizada_em at time zone 'America/Sao_Paulo')::date = sem_ini;
    if semana_count >= meta then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'semana',100,to_char(sem_ini,'IYYY-IW')) on conflict do nothing;
    end if;
    mes_ini := date_trunc('month', new.finalizada_em at time zone 'America/Sao_Paulo')::date;
    select * into d from desafios where mes = mes_ini;
    select count(*) into mes_count from sessoes
      where aluna_id=new.aluna_id and finalizada_em is not null and fn_treino_completo(exercicios_feitos, exercicios_total, finalizada_em)
        and date_trunc('month', finalizada_em at time zone 'America/Sao_Paulo')::date = mes_ini;
    if mes_count >= coalesce(d.meta_treinos,16) then
      insert into pontos_log(aluna_id,motivo,pontos,ref) values (new.aluna_id,'desafio',coalesce(d.pontos_bonus,200),to_char(mes_ini,'YYYY-MM')) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
select 'ok' as status;
