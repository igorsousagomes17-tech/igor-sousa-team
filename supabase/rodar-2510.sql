-- Pacote 25/10: migrações 007 (inclui a 006), 008, 009 e 010. Pode rodar mais de uma vez.
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

-- Migração 010 (25/10): segurança do cadastro.
-- Antes, qualquer conta logada podia inserir o próprio perfil com role='admin' (a regra aceitava id=auth.uid()).
-- Os perfis são criados só pelo servidor (funções criar-aluna e kiwify-webhook, com a chave de serviço),
-- então só o Igor (admin) precisa inserir pelo app.
drop policy if exists "perfil: admin insere" on profiles;
create policy "perfil: admin insere" on profiles for insert with check (is_admin());

select 'ok' as status;
