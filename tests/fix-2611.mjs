// Correções do Igor (26/11): carinhas do "Quanto cansou?" marcando no tema claro, ranking e loja no Início,
// story com a foto dela montado no app (foto + arte numa imagem só, sem depender de fundo transparente).
// Rodar com a pré-carga: NODE_OPTIONS=--import=./tests/_abre-detalhes.mjs OUT=/tmp/shots node tests/fix-2611.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 375, height: 812 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) errs.push(m); };
const w = (ms = 600) => p.waitForTimeout(ms); const txt = async s => (await p.innerText(s)).replace(/\s+/g, ' ');
const go = async (name, arg) => { await p.evaluate(([name, arg]) => { history.pushState({ name, arg }, '', '#' + name); dispatchEvent(new PopStateEvent('popstate', { state: { name, arg } })); }, [name, arg]); await w(900); };

await p.goto('http://app.local/?demo'); await p.evaluate(() => localStorage.setItem('tema', JSON.stringify('claro'))); await p.goto('http://app.local/?demo'); await w(800);
await p.click('text=ENTRAR'); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await w(1800);
const tema = await p.evaluate(() => document.documentElement.dataset.tema); if (tema !== 'claro') { await go('perfil'); const c = await p.$('[data-tema="claro"]'); if (c) { await c.click(); await w(500); } await go('home'); }
// Início: ranking e loja
ok(/Ranking do mês/i.test(await txt('#rankHome')) && (await p.$$('#rankHome .rk')).length >= 1, 'Início mostra o ranking do mês (pódio)');
ok(!!(await p.$('.home-loja')) && /Loja do time/i.test(await txt('.home-loja')), 'Início mostra a Loja do time');
await p.screenshot({ path: `${D}/fix-home.png`, fullPage: true });
await p.click('.home-loja'); await w(900); ok(/Loja do time/i.test(await txt('.view')) && (await p.$$('.pontos-premios .premio')).length === 2, 'Loja abre os prêmios');
await go('home'); await p.click('#rankHome'); await w(900); ok(/Ranking do mês/i.test(await txt('.view')) && /Quem treinou hoje/i.test(await txt('.view')), 'Ranking abre O time');

// Treino inteiro → feedback no tema claro
await go('treino'); await p.click('[data-go="treino"][data-arg="A"]'); await w(500); await p.click('#ini'); await w(900);
await terminarTudo(p); await w(800);
const corAntes = await p.$eval('#esf button >> nth=2', e => getComputedStyle(e).backgroundColor).catch(() => '');
await p.click('#esf button >> nth=2'); await w(200);
const corDepois = await p.$eval('#esf button.on', e => getComputedStyle(e).backgroundColor).catch(() => '');
ok(!!corDepois && corDepois !== corAntes, `tema claro: carinha escolhida muda de cor (${corAntes} → ${corDepois})`);
await p.click('#nota button >> nth=4'); await p.screenshot({ path: `${D}/fix-feedback-claro.png`, fullPage: true });
await p.click('#env'); await w(1500);

// Story com a foto: escolhe a foto e o app junta numa imagem só
await p.click('#shareFoto'); await w(1500);
ok(!!(await p.$('#fsArq')) && !(await p.$('#salvaArte')), 'story com foto: pede a foto (sem "Salvar na galeria")');
const png = await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 600; c.height = 800; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 600, 800); g.addColorStop(0, '#3a7bd5'); g.addColorStop(1, '#00d2ff'); x.fillStyle = g; x.fillRect(0, 0, 600, 800); return c.toDataURL('image/png').split(',')[1]; });
await p.setInputFiles('#fsArq', { name: 'eu.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }); await w(1500);
const prev = await p.$('#fsPrev img.foto-story');
ok(!!prev && !(await p.isHidden('#fsPost')), 'foto + arte numa imagem só, com "Postar no story"');
const dim = prev ? await prev.evaluate(i => [i.naturalWidth, i.naturalHeight]) : [];
ok(dim[0] === 1080 && dim[1] === 1920, `imagem do story 1080x1920 (${dim})`);
const fundo = prev ? await prev.evaluate(i => { const c = document.createElement('canvas'); c.width = 10; c.height = 10; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 10, 10); const d = x.getImageData(5, 0, 1, 1).data; return [d[0], d[1], d[2], d[3]]; }) : [];
ok(fundo[2] > 150 && fundo[3] === 255, `em cima aparece a foto (azul), não fundo preto (${fundo})`);
await p.screenshot({ path: `${D}/fix-story-foto.png`, fullPage: true });
console.log('erros:', errs); await b.close(); if (errs.length) process.exit(1);
