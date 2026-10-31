// Itens 35 (drop set) e 15 (aluna responde o Igor), modo demo: APP=/caminho node tests/drop-resposta.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [], ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA ') + m); if (!c) errs.push(m); };
const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 360, height: 780 }, serviceWorkers: 'block', hasTouch: true, isMobile: true });
const p = await ctx.newPage();
await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }).catch(() => r.abort()); } return r.abort(); });
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
const w = ms => p.waitForTimeout(ms);
const entrar = async email => { await p.goto('http://app.local/?demo'); await w(500); if (await p.locator('text=ENTRAR').count()) { await p.click('text=ENTRAR'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await w(1000); } };
const treinoB = async () => { await p.click('.tabs [data-go="treino"]'); await w(400); await p.click('[data-go="treino"][data-arg="B"]'); await w(400); await p.click('#ini'); await w(700); if (await p.locator('#m [data-o]').count()) { await p.locator('#m [data-o]').last().click(); await w(500); } };
const abducao = async () => { const j = await p.$$eval('[data-passo]', bs => bs.findIndex(x => /Abdu/i.test(x.getAttribute('aria-label') || ''))); await p.click(`[data-passo="${j}"]`); await w(500); return j; };
const pularDescanso = async () => { if (await p.locator('#rest-skip').count()) { await p.click('#rest-skip'); await w(300); } };
const fechar = async () => { await p.click('#fim'); await w(400); if (await p.locator('#enc').count()) { await p.click('#enc'); await w(600); } await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=8'); await p.click('#env'); await w(1200); };
const serieSalva = () => p.evaluate(() => { const st = JSON.parse(localStorage.getItem('demo:state') || '{}'); return (st.series || []).filter(x => /Abdu/.test(x.exercicio_nome)); });

await entrar('ana@demo.com');
// ---------- 35: drop set ----------
await treinoB(); await abducao();
ok(/ABDU/i.test(await p.innerText('.bloco h1')), '35: abriu a Abdução (drop prescrito no demo)');
ok(await p.locator('[data-dadd]').count() === 3, '35: cada série tem "+ drop"');
const alvo = await p.locator('[data-dadd]').first().boundingBox(); ok(alvo && alvo.height >= 40, `35: "+ drop" com alvo ≥ 40px (${Math.round(alvo?.height)})`);
await p.fill('.set[data-k="0"] input[data-f="kg"]', '40'); await p.fill('.set[data-k="0"] input[data-f="reps"]', '12');
await p.click('[data-dadd][data-k="0"]'); await w(300);
await p.fill('.dl[data-k="0"][data-d="0"] input[data-df="kg"]', '30'); await p.fill('.dl[data-k="0"][data-d="0"] input[data-df="reps"]', '8');
await p.click('[data-dadd][data-k="0"]'); await w(300);
await p.fill('.dl[data-k="0"][data-d="1"] input[data-df="kg"]', '20'); await p.fill('.dl[data-k="0"][data-d="1"] input[data-df="reps"]', '6');
// um 3º drop e tira de novo no ✕
await p.click('[data-dadd][data-k="0"]'); await w(300); ok(await p.locator('.dl[data-k="0"]').count() === 3, '35: dá pra pôr um 3º drop');
await p.click('.dl[data-k="0"][data-d="2"] [data-dx]'); await w(300); ok(await p.locator('.dl[data-k="0"]').count() === 2, '35: ✕ tira o drop');
const vaza = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('.dl, .dl *')].some(e => e.getBoundingClientRect().right > innerWidth + 1));
ok(!vaza, '35: nada estoura 360px');
await p.screenshot({ path: path.join(D, 'drop-360.png') });
await p.click('.set[data-k="0"] .rest'); await w(700); await pularDescanso();
await fechar();
const rows = await serieSalva(); console.log('   salvo:', JSON.stringify(rows));
const r0 = rows.find(x => x.n === 1);
ok(r0 && +r0.kg === 40, '35: kg da série = 1ª carga (40)');
ok(r0 && r0.reps === 26, `35: reps = soma 12+8+6 (${r0?.reps})`);
ok(r0 && JSON.stringify(r0.drops) === JSON.stringify([{ kg: 30, reps: 8 }, { kg: 20, reps: 6 }]), '35: quedas em drops [{30,8},{20,6}]');
// 2º treino: 1ª carga 35 e um drop "de 50" → não é recorde (só a 1ª carga conta)
await treinoB(); await abducao();
const ult = await p.innerText('.bloco');
ok(/40×12 → 30×8 → 20×6/.test(ult), '35: "Última vez" mostra 40×12 → 30×8 → 20×6');
ok(await p.inputValue('.set[data-k="0"] input[data-f="kg"]') === '' , '35: kg da série vazio (placeholder com a última)');
await p.click('[data-dadd][data-k="0"]'); await w(300);
ok(await p.inputValue('.dl[data-k="0"][data-d="0"] input[data-df="kg"]') === '30', '35: drop novo já vem com a carga da última vez (30)');
await p.click('.hist'); await w(800);
ok(/40×12 → 30×8 → 20×6/.test(await p.innerText('#hm')), '35: histórico mostra as quedas');
await p.click('#hc'); await w(300);
await p.fill('.set[data-k="0"] input[data-f="kg"]', '35'); await p.fill('.set[data-k="0"] input[data-f="reps"]', '12');
await p.fill('.dl[data-k="0"][data-d="0"] input[data-df="kg"]', '50'); await p.fill('.dl[data-k="0"][data-d="0"] input[data-df="reps"]', '5');
await p.click('.set[data-k="0"] .rest'); await w(700); if (await p.locator('#q-n').count()) { await p.click('#q-n'); await w(400); } await pularDescanso();
await fechar();
ok(!/Recorde/i.test(await p.innerText('.view')), '35: drop mais pesado não vira recorde (recorde só pela 1ª carga)');

// ---------- 15: aluna responde o Igor ----------
await p.click('.tabs [data-go="perfil"]'); await w(1000);
ok(await p.locator('[data-rin]').count() >= 1, '15: card "Respostas do Igor" tem o campo Responder');
const id = await p.getAttribute('[data-rin]', 'data-rin');
await p.click(`[data-rsend="${id}"]`); await w(300); ok(await p.evaluate(() => document.activeElement?.matches('[data-rin]')), '15: enviar vazio só põe o cursor no campo');
await p.fill(`[data-rin="${id}"]`, 'Valeu! Fiz com a perna mais baixa e melhorou'); await p.click(`[data-rsend="${id}"]`); await w(1200);
const perf = await p.innerText('.view');
ok(/Você: "Valeu! Fiz com a perna mais baixa e melhorou"/.test(perf), '15: resposta aparece embaixo da do Igor como "Você: …"');
ok(await p.locator(`[data-rin="${id}"]`).count() === 0, '15: campo some depois de responder');
await p.screenshot({ path: path.join(D, 'resposta-perfil-360.png') });
const vaza2 = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); ok(!vaza2, '15: Perfil não estoura 360px');
// Igor vê no painel e marca como vista
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.logado = false; localStorage.setItem('demo:state', JSON.stringify(s)); });
await entrar('igor@demo.com'); await w(600);
ok(/resposta nova/i.test(await p.innerText('#t-fb').catch(() => '')), '15: painel avisa "1 resposta nova"');
await p.click('#t-fb'); await w(600);
const fbt = await p.innerText('.view');
ok(/Valeu! Fiz com a perna mais baixa/.test(fbt), '15: Feedbacks mostram a resposta dela');
await p.click('[data-lida]'); await w(500);
ok(await p.locator('[data-lida]').count() === 0, '15: "já vi" tira o selo de nova');

console.log(errs.length ? 'ERROS: ' + errs.join(' | ') : 'tudo certo'); await b.close(); process.exit(errs.length ? 1 : 0);
