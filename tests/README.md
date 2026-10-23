# Testes do app (modo demo)

Roda o fluxo completo de treino (login de aluna, sessão com bi-set, tempo, descanso,
recarregar no meio, voltar, trocar exercício, encerrar, feedback e card) no Chromium headless.

```
npm i playwright            # em qualquer pasta
OUT=/tmp/shots node tests/fluxo-treino.mjs
```
Sai com código 1 se aparecer erro de JavaScript ou pop-up do navegador.
No ambiente da Claude: `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`.
