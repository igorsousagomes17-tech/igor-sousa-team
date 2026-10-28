-- Migração 017 (28/10): traduções do conteúdo do Igor (nomes de treino/exercício, dicas, recados) pra quem usa o app em outra língua.
-- A função "assistente" (acao: 'traduzir') traduz uma vez com a IA e guarda aqui; o app guarda no celular também.
create table if not exists traducoes (
  idioma text not null,
  pt text not null,
  texto text not null,
  criado_em timestamptz default now(),
  primary key (idioma, pt)
);
alter table traducoes enable row level security; -- sem políticas: só a função (chave de serviço) lê e grava
select 'ok' as status;
