# Acolhimento e aderência (25/10, pedido do Igor por voz)
Princípio: o app tem que acolher e vender pra quem tá entrando e continuar encantando quem já tá dentro.

## No ar (v18)
- [x] Boas-vindas animada no 1º acesso (foto do Igor, recado dele). Vídeo do Igor entra no lugar da foto: `VIDEO_BOAS_VINDAS` em js/acolhe.js.
- [x] Passeio guiado de 4 passos (Treino de hoje, Tira-dúvidas, O time, Perfil); dá pra rever no Perfil.
- [x] Resumo da semana: card no Início (seg–qua, semana passada), tela com anel + cargas que subiram, imagem pro story (só semana passada ou semana com meta batida).
- [x] "Que bom te ver de volta" (3+ dias sem treinar) com botão direto pro próximo treino.
- [x] Lembretes: Android com app instalado (periodic sync) avisa em 3, 5, 8 e 14 dias sem treino, 7h–21h; liga/desliga no Perfil; para ao sair da conta. iPhone: precisa de Web Push (fase 2, servidor).
- [x] O time: quantas treinaram hoje, ranking do mês (dias com treino, empate = mesma posição, top 5 + posição dela), quem treinou hoje. Só primeiro nome + inicial; opção de sair no Perfil.
- [x] Indicar amiga pelo WhatsApp com mensagem e código prontos (Perfil, card de treino feito, resumo).

## Banco (Supabase)
- [x] 25/10 10h55: rodado o pacote supabase/rodar-2510.sql (007 que inclui a 006, 008, 009, 010) e conferido: função do time, coluna comunidade, cadastro só pelo admin, pontos protegidos, semana no fuso.

## Decisões do Igor pendentes
- Comunidade com fotos: as alunas veem as fotos umas das outras, ou só o Igor vê e escolhe o que aparece?
- Aviso no WhatsApp do Igor a cada dúvida no chat: na hora toda vez, ou na hora só dor/urgência + resumo do resto no fim do dia? (precisa do número/acesso).
- Foto melhor do Igor pra boas-vindas (academia) ou o vídeo dele.
