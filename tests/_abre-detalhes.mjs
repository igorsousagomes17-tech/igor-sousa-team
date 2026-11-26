// Pré-carga dos testes antigos (crítica 25/11): "⚙️ Configurações" do Perfil e "⋯ Mais opções" do exercício
// passaram a vir fechados; os testes antigos clicam direto nos botões de dentro, então aqui eles já abrem.
// Uso: NODE_OPTIONS="--import ./tests/_abre-detalhes.mjs" node tests/xxx.mjs  (tests/ux-2511.mjs testa o fechado)
import { chromium } from 'playwright';
const ABRE = () => { const f = () => document.querySelectorAll('details.cfg:not([open]),details.mais.opc:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); };
const L = chromium.launch.bind(chromium);
chromium.launch = async (...a) => { const b = await L(...a); const NC = b.newContext.bind(b); b.newContext = async (...o) => { const c = await NC(...o); await c.addInitScript(ABRE); return c; }; const NP = b.newPage.bind(b); b.newPage = async (...o) => { const pg = await NP(...o); await pg.addInitScript(ABRE); return pg; }; return b; };
// O interruptor "Exercício concluído?" saiu (crítica 25/11). Os testes antigos usavam ele + "Fiz, marcar as séries"
// pra terminar o treino rápido: terminarTudo(p) marca cada série como a aluna faria, até sair da tela do treino.
globalThis.terminarTudo = async (p, { semOpcional = false } = {}) => {
  for (let j = 0; j < 120; j++) {
    await p.waitForTimeout(280);
    if (!(await p.$('.sessao'))) return;
    if (await p.$('#m #q-s')) { await p.click('#m #q-s'); continue; }
    if (await p.$('#m [data-o="0"]')) { await p.click('#m [data-o="0"]'); continue; }
    if (await p.$('#rest:not(.mini) #rest-x')) { await p.click('#rest-x'); continue; }
    if (semOpcional && /opcional/i.test(await p.innerText('.bloco h1').catch(() => ''))) { if (await p.$('#fin')) await p.click('#fin'); else if (await p.$('#fim')) await p.click('#fim'); await p.waitForTimeout(600); return; }
    const tm = await p.$('.set.tset:not(.done) .rest.tm'); if (tm) { await tm.click(); await p.waitForTimeout(400); if (await p.$('#rest-skip')) await p.click('#rest-skip'); continue; }
    const r = await p.$('.set:not(.done) .rest'); if (r) { await r.click(); continue; }
    const ab = await p.$('.bitab:not(.ok):not(.on)'); if (ab) { await ab.click(); continue; }
    if (await p.$('#fin')) { await p.click('#fin'); continue; }
    if (await p.$('#pular')) { await p.click('#pular'); continue; }
    return;
  }
};
