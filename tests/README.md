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
