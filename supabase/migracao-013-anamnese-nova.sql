-- Migração 013 (27/10): anamnese nova (junta a do app com a do Mfit). Só acrescenta colunas, não apaga nada.
alter table profiles add column if not exists horario text;        -- cedo | manha | almoco | tarde | noite | varia
alter table profiles add column if not exists academia_tipo text;  -- rede | bairro | condominio
alter table profiles add column if not exists equipamento text[];  -- o que tem em casa
alter table profiles add column if not exists cardio text;         -- sim | as_vezes | nao (cardio no fim do treino)
alter table profiles add column if not exists evita text;          -- exercício que não gosta / não consegue
alter table profiles add column if not exists ciclo text;          -- regular | irregular | anticoncepcional | nao | nd
select 'ok' as status;
