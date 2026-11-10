// Revisão 3 (painel do Igor): bi-set marcado só numa linha no modo texto, descanso "60s", "Acesso ao app" da ficha, ordem dos treinos
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = [], falhas = [];
const ok = (c, m) => { console.log((c ? '  ok  ' : '  FALHOU ') + m); if (!c) falhas.push(m); };
const p = await (await b.newContext({ locale: 'pt-BR', viewport: { width: 360, height: 800 }, serviceWorkers: 'block' })).newPage();
await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
const w = ms => p.waitForTimeout(ms);
await p.goto('http://app.local/?demo'); await w(400); await p.click('text=ENTRAR'); await p.fill('#em', 'igor@demo.com'); await p.press('#pw', 'Enter'); await w(1200);
// 1. Modo texto: "bi 2" só na linha do 3º exercício (como no exemplo) e descanso "45s"
await p.click('#t-treino'); await w(300); await p.click('[data-treino] >> nth=0'); await w(600);
await p.click('#modoTexto'); await w(200);
await p.fill('#t', '# A | Inferior | 40\nMobilidade | 1 | 1 min | 0\nAgachamento no Smith | 4 | 10 | 60s\nAgachamento goblet | 3 | 12 | 45s | | | | bi 2\nElevação pélvica | 4 | 12 | 1 min');
await p.click('#vis'); await w(250);
ok(await p.isChecked('[data-bi="1"]'), 'bi 2 escrito só no 3º exercício vira bi-set do 2º com o 3º');
const desc = await p.$$eval('[data-f="descanso_s"]', l => l.map(i => i.value));
ok(desc.join(',') === '0,60,45,60', `descanso "60s"/"45s" vira número (${desc})`);
await p.click('#mtS'); await w(600); ok(!(await p.isVisible('#mt')), 'publicou');
// 2. Ficha da aluna > Acesso ao app abre
await p.click('#ir-alunas').catch(() => {}); await w(400);
if (!(await p.$('[data-aluna]'))) { await p.click('#volta').catch(() => {}); await w(600); await p.click('#ir-alunas'); await w(400); }
await p.click('[data-aluna] >> nth=0'); await w(300); await p.click('[data-ac]'); await w(500);
ok(await p.isVisible('#pausa'), 'Acesso ao app abre com Enviar acesso / Pausar');
console.log('erros:', errs); await b.close(); if (errs.length || falhas.length) process.exit(1);
