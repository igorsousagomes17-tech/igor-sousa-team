# Testes do app (modo demo)

Roda o fluxo completo de treino (login de aluna, sessão com bi-set, tempo, descanso,
recarregar no meio, voltar, trocar exercício, encerrar, feedback e card) no Chromium headless.

```
npm i playwright            # em qualquer pasta
OUT=/tmp/shots node tests/fluxo-treino.mjs
```
Sai com código 1 se aparecer erro de JavaScript ou pop-up do navegador.

`tests/regressao.mjs` testa as correções das críticas (pausa, treino pela metade, feedback, descanso único,
anamnese, evolução, fila offline sem duplicar, story). Rode em 375 e 360: `W=360 OUT=/tmp/shots node tests/regressao.mjs`.
No ambiente da Claude: `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`.

`tests/idiomas.mjs` percorre as telas da aluna nos 6 idiomas (pt, en, es, zh, hi, fr) e falha com erro, texto sem tradução,
português da interface sobrando ou tela estourando: `W=360 OUT=/tmp/shots node tests/idiomas.mjs` (`IDIOMAS=en,zh` pra rodar só alguns).
Os testes fixam `locale: 'pt-BR'` no navegador (sem isso o Chromium vem em inglês e o app abriria em inglês).

`tests/rodada-2410.mjs` testa as correções da rodada 24/10 (treino esquecido sem 840 min, pausado não some ao começar outro,
tempo fora não conta, desafio no fuso certo, duas abas, resposta vazia, sugestão de carga salva, carga absurda, toque duplo,
descanso após prancha, vídeo sem sinal, busca "bumbum", ficha do exercício, anamnese na revisão, sair pergunta, pontos, chat guardado, e-mail no esqueci):
`W=360 OUT=/tmp/shots node tests/rodada-2410.mjs` (fixa o fuso America/Sao_Paulo).

`tests/rodada-2510.mjs` testa as correções da rodada 25/10 (toque duplo na chave, voltar no pop-up não trava, cardio minimiza e registra
os minutos feitos, HIIT forte/leve, dúvida no descanso, fotos do mês com voltar no meio, anamnese com data impossível, painel com nota baixa
e bi-set no editor, Minhas cargas do banco, programa com exercícios, pontos, story em JPEG): `W=360 OUT=/tmp/shots node tests/rodada-2510.mjs`.

`tests/rodada-2510b.mjs` testa a rodada extra de 25/10 (tira-dúvidas: emergência/192, pergunta que não some ao sair, conversa apagada no logout;
botão de cardio que envia sozinho e "Começar cardio de 20 min"; cardio que continua depois de recarregar e não recomeça no 2º toque;
"Senti dor" sem série chega no painel; escolha da semana em 288 px; francês sem pontuação sozinha): `W=360 OUT=/tmp/shots node tests/rodada-2510b.mjs`.

`tests/rodada-2610.mjs` testa a rodada 26/10 (fila com dono e treino pausado da dona ao sair, "Já fiz" cedo pergunta, último exercício não fecha sem avisar,
contagem igual no topo/pop-up/feedback, chave com séries pela metade, "40kg" e "12+4+4", "Falta enviar" no Início, treino pela metade oferece repetir,
"Pular descanso" em destaque, lista pra ir direto e +série, foto que não abre, "i" sem vídeo, story que baixa quando o compartilhar falha, painel com ficha e contexto):
`W=360 OUT=/tmp/shots node tests/rodada-2610.mjs`.

`tests/rodada-2610b.mjs` testa a 2ª rodada de 26/10 (Pausar com cronômetro não marca a série e volta parado, "cada lado" em 1:00, card incompleto "registrado" e sem cardio, 🔥 só com treino completo,
recorde/Última só com a meta de reps, próxima série fora de ordem, anamnese que não apaga no Voltar, senha com espaço, aviso que deixa o toque passar, recomeçar do zero, "0/7 · 1 opcional",
voltar na aba Treino, feedback que diz o que falta, pausa sozinha com 10 min parado, Evolução com letra grande em 300 px, story do resumo +30): `W=360 OUT=/tmp/shots node tests/rodada-2610b.mjs`.

`tests/rodada-2710.mjs` testa a rodada 27/10 (IA do demo: "peito" do Treino C sem 192, peso do 1º dia, vídeo, "pressão é alta" freia o HIIT; Express 12/8 com a carga da série certa, só no dia e
avisado no Início/sessão; desmarcar série tira o ✓; "‹ Corrigir" logo depois de fechar o exercício; série preenchida sem ✓ perguntada no fim; volta depois de 40 min fora sem relógio negativo;
spinning: toque duplo, voltar pergunta, recarregar retoma, aula curta não pontua e tem story; login vazio; abas "Pts/Evol." com letra grande; treino pausado sem pop-up de pontos):
`W=360 OUT=/tmp/shots node tests/rodada-2710.mjs`.

`tests/rodada-2810.mjs` testa a rodada 28/10 (treino descartado não deixa carga fantasma, pirâmide na 1ª vez herda o peso, 30 → 300 pergunta com "Corrigir" em destaque,
"Ficar" em destaque no Sair, senha atual pra trocar, voltar não pula a troca de senha do 1º acesso, aviso fixo antigo some, "Pausar o treino" no descanso, corrigir série de treino passado,
IA do demo: execução/12-10-8/descanso/saldo, abas com nome inteiro quando cabe, card "<1 min", tira-dúvidas em 300 px): `W=360 OUT=/tmp/shots node tests/rodada-2810.mjs`.

`tests/rodada-3110.mjs` testa a rodada 31/10 (drop: quedas prescritas já aparecem, "12+4+4" sem contar em dobro, "10 + (4+4+4)", queda absurda pergunta, Meus treinos com as quedas, "4O" = 40;
bi-set com Senti dor à vista e Enter A1 → A2; "Onde é a dor?" com peito/192; "Pausar e terminar depois"; pausa congela o descanso; responder o Igor em caixa grande com rascunho e conversa de volta pelo painel;
Hyrox começando na Base, distância sem reps, voltas e PDF; registro do mês sem peso antigo; busca em frase e Hyrox; letra grande em 300 px; iPhone sem contradição do apito):
`W=360 OUT=/tmp/shots node tests/rodada-3110.mjs`. `rodada-2610b` agora fixa uma segunda-feira pro resumo da semana (antes falhava de quinta a domingo).
