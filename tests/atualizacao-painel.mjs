// Tela "Atualização do mês" do painel (modo demo): lote da semana, pagamento, parecidas, amigas, aprovar e publicar no app.
//   OUT=/tmp/shots node tests/atualizacao-painel.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = [], falhas = [];
const ok = (c, m) => { console.log((c ? '  ok  ' : '  FALHOU ') + m); if (!c) falhas.push(m); };
const W = Number(process.env.W || 360);
const ctx = await b.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: W, height: 800 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
const txt = async s => (await p.innerText(s)).replace(/\s+/g, ' ');
const w = ms => p.waitForTimeout(ms);
await p.goto('http://app.local/?demo'); await w(400); await p.click('text=ENTRAR'); await p.fill('#em', 'igor@demo.com'); await p.press('#pw', 'Enter'); await w(1200);

await p.click('#t-lote'); await w(1200);
const t = await txt('#lote');
ok(/dia em que o dela vence/.test(t) && /novo de/.test(t), 'explica que cada aluna começa no dia em que o treino dela vence');
ok(/4 alunas no lote/.test(t), 'lote com as 4 alunas da demo');
ok(/Pagamento pra você conferir/.test(t) && /Ana Paula/.test(t) && /Lorena/.test(t), 'avisa quem está com pagamento em aberto');
ok(/só aviso/i.test(t), 'deixa claro que é só aviso');
ok(/parecida demais|parecidas demais/.test(t), 'aponta as amigas com treino parecido demais');
await p.screenshot({ path: `${D}/atu-1-lote.png`, fullPage: true });

await p.click('[data-lt-ver="a2"]'); await w(300);
const r = await txt('#m'); ok(/Inferior/.test(r) && /Superior/.test(r), 'rascunho abre com os treinos');
ok(/O que mudei da base pra ela/.test(r) && /não usou máquina/.test(r), 'rascunho mostra o que trocou e por quê');
ok(!/Leg press|Cadeira extensora|Puxada aberta/.test(r), 'aluna sem máquina no histórico não recebeu máquina');
await p.screenshot({ path: `${D}/atu-2-rascunho.png`, fullPage: true }); await p.click('#c'); await w(200);

await p.click('#lt-amigas'); await w(300); ok((await p.$$('[data-am-x]')).length === 2, 'lista os 2 pares de amigas');
await p.selectOption('#am1', 'a4'); await p.selectOption('#am2', 'a5'); await p.click('#am-ok'); await w(400);
ok((await p.$$('[data-am-x]')).length === 3, 'marca um par novo');
await p.screenshot({ path: `${D}/atu-3-amigas.png`, fullPage: true }); await p.click('#c'); await w(800);

ok(await p.$eval('#lt-pub', e => e.disabled), 'publicar fica desligado sem aprovação');
await p.click('[data-lt-ok="a0"]'); await w(800); await p.click('[data-lt-ok="a1"]'); await w(800);
ok(/Publicar 2 no app/.test(await txt('#lt-pub')), 'duas aprovadas');
await p.click('#lt-pub'); await w(300); ok(/Marcela/.test(await txt('#m')), 'confirmação mostra quem recebe');
await p.click('#ok'); await w(1500);
const st = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')));
const l0 = st.loteDemo.alunas.find(x => x.aluna_id === 'a0'), l1 = st.loteDemo.alunas.find(x => x.aluna_id === 'a1');
const fds = d => [0, 6].includes(new Date(d + 'T12:00').getDay());
ok(st.planos?.a0?.inicio === l0.inicio && st.planos?.a1?.inicio === l1.fim_anterior && fds(st.planos.a0.fim) && fds(st.planos.a1.fim), `cada uma começa no dia do vencimento dela (a1 vence ${l1.fim_anterior}, começa ${st.planos?.a1?.inicio}) e o novo vence no fim de semana (${st.planos?.a0?.fim}, ${st.planos?.a1?.fim})`);
ok(!st.planos?.a2, 'quem não foi aprovada não recebeu nada');
ok(/no app ✓/.test(await txt('#lote')), 'marca no app ✓');
await p.screenshot({ path: `${D}/atu-4-publicado.png`, fullPage: true });

const larg = await p.evaluate(() => document.documentElement.scrollWidth); ok(larg <= W, `sem rolagem de lado (${larg}px)`);
ok(!errs.length, 'sem erro de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
await b.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo'); process.exit(falhas.length ? 1 : 0);
