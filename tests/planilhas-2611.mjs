// Até 3 planilhas por aluna (Igor, 26/11: "cada perfil só aceita uma planilha"). Aluna escolhe qual usar;
// no painel o Igor cria/edita a 2ª e a 3ª com nome próprio.
// Rodar: NODE_OPTIONS=--import=./tests/_abre-detalhes.mjs OUT=/tmp/shots node tests/planilhas-2611.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = []; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) errs.push(m); };
async function nova() {
  const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 375, height: 812 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
  p.on('pageerror', e => errs.push(e.message)); return { ctx, p };
}
const w = (p, ms = 600) => p.waitForTimeout(ms); const txt = async (p, s) => (await p.innerText(s)).replace(/\s+/g, ' ');
const go = async (p, name, arg) => { await p.evaluate(([name, arg]) => { history.pushState({ name, arg }, '', '#' + name); dispatchEvent(new PopStateEvent('popstate', { state: { name, arg } })); }, [name, arg]); await w(p, 900); };

{ // Aluna com 2 planilhas
  const { ctx, p } = await nova();
  await p.goto('http://app.local/?demo'); await p.evaluate(() => localStorage.setItem('demo:planilhaExtra', 'true')); await p.goto('http://app.local/?demo'); await w(p, 800);
  await p.click('text=ENTRAR'); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await w(p, 1800);
  ok((await p.$$('.planilhas [data-planilha]')).length === 2, 'Início: escolhe entre as 2 planilhas');
  await go(p, 'treino'); ok(/Academia/i.test(await txt(p, '.planilhas')) && /Em casa/i.test(await txt(p, '.planilhas')), 'Treino: mostra Academia e Em casa');
  const antes = (await p.$$('.big-pill')).length;
  await p.click('[data-planilha="2"]'); await w(p, 1000);
  const depois = (await p.$$('.big-pill')).length;
  ok(antes > 2 && depois === 2 && /Em casa/.test(await txt(p, '.view h1 + p, .view')), `trocou pra "Em casa": ${antes} → ${depois} treinos`);
  ok(await p.$eval('[data-planilha="2"]', e => e.classList.contains('on')), 'planilha escolhida fica marcada');
  await p.reload(); await w(p, 1800); await go(p, 'treino'); ok((await p.$$('.big-pill')).length === 2, 'a escolha fica salva no celular');
  await p.screenshot({ path: `${D}/planilhas-aluna.png`, fullPage: true });
  await ctx.close();
}
{ // Aluna com 1 planilha: nada muda
  const { ctx, p } = await nova();
  await p.goto('http://app.local/?demo'); await w(p, 800); await p.click('text=ENTRAR'); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await w(p, 1800);
  ok(!(await p.$('.planilhas')), 'com 1 planilha: sem seletor'); await ctx.close();
}
{ // Painel: criar a 2ª planilha com nome
  const { ctx, p } = await nova();
  await p.goto('http://app.local/?demo'); await w(p, 600); await p.click('text=ENTRAR'); await p.fill('#em', 'igor@demo.com'); await p.press('#pw', 'Enter'); await w(p, 1500);
  await p.click('#ir-alunas'); await w(p, 400); await p.click('[data-fa="todas"]').catch(() => {}); await w(p, 300);
  await p.click('#lista .aluna >> nth=0'); await w(p, 700); await p.click('#m [data-treino]'); await w(p, 1200);
  ok((await p.$$('[data-plslot]')).length >= 1 && !!(await p.$('#plTit')), 'editor: planilhas dela e nome da planilha');
  await p.click('[data-plslot="2"]'); await w(p, 1200);
  ok(/2 · nova/i.test(await txt(p, '.cab-planilhas')), 'abre a planilha 2 vazia');
  await p.fill('#plTit', 'Em casa');
  await p.evaluate(() => { const b = [...document.querySelectorAll('#mt button')].find(x => /modo texto|texto/i.test(x.textContent)); b && b.click(); }); await w(p, 400);
  const ta = await p.$('#mt textarea#t');
  if (ta) { await ta.fill('# A | Casa | 30\nAgachamento livre | 3 | 15 | 45'); }
  else { await p.click('#mt [data-add], #mt .addEx').catch(() => {}); }
  await p.evaluate(() => { const b = [...document.querySelectorAll('#mt button')].find(x => /Publicar pra aluna/i.test(x.textContent)); b && b.click(); }); await w(p, 1500);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state') || '{}').planos || {});
  const k = Object.keys(st).find(x => x.endsWith(':2'));
  ok(!!k && st[k].titulo === 'Em casa' && st[k].slot === 2, `salvou a planilha 2 "Em casa" (${k})`);
  await p.click('#lista .aluna >> nth=0').catch(() => {}); await w(p, 700); if (await p.$('#m [data-treino]')) { await p.click('#m [data-treino]'); await w(p, 1200); }
  ok(/Em casa/i.test(await txt(p, '.cab-planilhas').catch(() => '')), 'editor lista a planilha nova');
  await p.screenshot({ path: `${D}/planilhas-painel.png`, fullPage: true });
  await ctx.close();
}
console.log('erros:', errs); await b.close(); if (errs.length) process.exit(1);
