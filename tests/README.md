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
