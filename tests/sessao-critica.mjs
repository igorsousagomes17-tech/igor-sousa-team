// Crítica 30/10 da tela de treino (itens 1, 2, 5, 6, 12, 13, 14, 16): APP=/caminho node tests/sessao-critica.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [], ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA ') + m); if (!c) errs.push(m); };
async function abrir() {
  const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 360, height: 780 }, serviceWorkers: 'block', hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }).catch(() => r.abort()); } return r.abort(); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(500);
  await p.click('text=ENTRAR'); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await p.waitForTimeout(900);
  return p;
}
const treino = async (p, l) => { await p.click('.tabs [data-go="treino"]'); await p.waitForTimeout(400); await p.click(`[data-go="treino"][data-arg="${l}"]`); await p.waitForTimeout(400); await p.click('#ini'); await p.waitForTimeout(700); };
const passo = async (p, j) => { await p.click(`[data-passo="${j}"]`); await p.waitForTimeout(500); };
const modal = async p => (await p.locator('#m').count()) ? (await p.innerText('#m')).replace(/\n+/g, ' | ') : '';

// ---------- Treino A ----------
let p = await abrir(); await treino(p, 'A');
ok(/Pausar treino/.test(await p.innerText('#sair')) && !/‹/.test(await p.innerText('#sair')), '13: topo "⏸ Pausar treino"');
ok(await p.locator('.ocup').count() === 0, '5: sem "Aparelho ocupado" na Mobilidade de quadril');
await passo(p, 6); ok(await p.locator('.ocup').count() === 0, '5: sem "Aparelho ocupado" no HIIT');
await passo(p, 2); // Leg press
const g = await p.evaluate(() => { const o = document.querySelector('.ocup'), sets = [...document.querySelectorAll('.bloco .set[data-k]')], ul = sets[sets.length - 1].getBoundingClientRect(), r = o?.getBoundingClientRect(), st = o && getComputedStyle(o); return o && { top: r.top, h: r.height, w: r.width, bw: o.closest('.bloco').clientWidth, ultBottom: ul.bottom, bg: st.backgroundColor, cor: st.color, txt: o.innerText }; });
ok(!!g, '1: leg press tem "Aparelho ocupado"');
if (g) {
  ok(g.ultBottom <= 780, `1: as 3 séries cabem na 1ª tela (última termina em ${Math.round(g.ultBottom)}px)`);
  ok(g.top >= g.ultBottom, '1: botão fica abaixo das séries');
  ok(g.h >= 42 && g.h <= 50, `1: altura normal (${Math.round(g.h)}px)`);
  ok(g.w >= g.bw - 30, '1: largura total do card');
  ok(/rgba\(0, 0, 0, 0\)|transparent/.test(g.bg) && /255, 106, 0|rgb\(2[45]\d, 1[01]\d/.test(g.cor), `1: contorno laranja, fundo transparente (${g.bg} / ${g.cor})`);
  ok(/Aparelho ocupado\? Trocar/i.test(g.txt), '1: texto "Aparelho ocupado? Trocar"');
}
ok(!/botão laranja/i.test(await p.innerText('.view')), '1: dica não fala mais em "botão laranja"');
await p.click('.ocup'); await p.waitForTimeout(400);
const ops = await p.$$eval('#m [data-o]', bs => bs.map(x => x.textContent.trim().toLowerCase()));
console.log('   opções:', ops.join(' / '));
ok(!(ops.some(x => /agachamento hack/.test(x)) && ops.some(x => /hack machine/.test(x))), '6: não oferece "Agachamento hack" e "Hack machine" juntos');
ok(!ops.some(x => /leg press/.test(x)), '6: não oferece variante do próprio leg press');
ok(ops.length >= 2, '6: pelo menos 1 opção + cancelar');
await p.locator('#m [data-o]').last().click(); await p.waitForTimeout(300);
// 16: −15s no descanso (com kg anotado pra não cair na pergunta do item 14)
await p.fill('.set[data-k="0"] input[data-f="kg"]', '80'); await p.fill('.set[data-k="0"] input[data-f="reps"]', '12');
await p.click('.set[data-k="0"] .rest'); await p.waitForTimeout(700);
ok(await p.locator('#rest-menos').count() === 1, '16: botão −15s no descanso');
const n0 = await p.evaluate(() => { const t = document.querySelector('#rest-n').textContent; return t.includes(':') ? t.split(':').reduce((a, x) => a * 60 + +x, 0) : +t; });
await p.click('#rest-menos'); await p.waitForTimeout(300);
const n1 = await p.evaluate(() => { const t = document.querySelector('#rest-n').textContent; return t.includes(':') ? t.split(':').reduce((a, x) => a * 60 + +x, 0) : +t; });
ok(n0 - n1 >= 14 && n0 - n1 <= 16, `16: −15s tira 15 s (${n0} → ${n1})`);
await p.click('#rest-menos'); await p.click('#rest-menos'); await p.click('#rest-menos'); await p.waitForTimeout(300);
ok(await p.locator('#rest').count() === 1, '16: −15s várias vezes não encerra o descanso sozinho');
await p.click('#rest-skip'); await p.waitForTimeout(400);
// 14: série sem kg num exercício com carga e sem histórico (Afundo) → pergunta uma vez
await passo(p, 3);
await p.click('.set[data-k="0"] .rest'); await p.waitForTimeout(600);
if (await p.locator('#rest-skip').count()) { await p.click('#rest-skip'); await p.waitForTimeout(300); }
ok(/Anotar o peso/i.test(await p.innerText('.bloco')), '14: 1ª série sem kg pergunta "Anotar o peso?" (na tela, sem travar o descanso)');
ok(await p.locator('[data-kgsem]').count() === 1, '14: tem a opção "Não uso peso"');
await p.click('[data-kgsem]'); await p.waitForTimeout(500);
ok(await p.locator('.bloco input[data-f="kg"]').count() === 0, '14: "Não uso peso" tira a coluna de kg');
await p.click('.set[data-k="1"] .rest'); await p.waitForTimeout(600);
if (await p.locator('#rest-skip').count()) { await p.click('#rest-skip'); await p.waitForTimeout(300); }
ok(!/Anotar o peso/i.test(await p.innerText('.bloco')), '14: não pergunta de novo no mesmo exercício');
await p.context().close();

// ---------- Treino C: descanso depois da última série mostra o próximo exercício (item 36) ----------
p = await abrir(); await treino(p, 'C'); await passo(p, 1); // Supino inclinado → Crucifixo
for (let k = 0; k < 3; k++) { await p.fill(`.set[data-k="${k}"] input[data-f="kg"]`, '20'); await p.fill(`.set[data-k="${k}"] input[data-f="reps"]`, '10'); await p.click(`.set[data-k="${k}"] .rest`); await p.waitForTimeout(900);
  if (k === 0) ok(/série 2 de 3/i.test(await p.innerText('#rest-p').catch(() => '')), '36: entre séries mostra "série 2 de 3"');
  if (k < 2 && await p.locator('#rest-skip').count()) { await p.click('#rest-skip'); await p.waitForTimeout(300); } }
await p.waitForTimeout(600);
const prox = (await p.innerText('#rest-p').catch(() => '')).replace(/\n+/g, ' | '); console.log('   próximo:', prox);
ok(/PRÓXIMO EXERCÍCIO/i.test(prox) && /Crucifixo/i.test(prox), '36: depois da última série o descanso mostra "PRÓXIMO EXERCÍCIO" + Crucifixo');
const cab = await p.evaluate(() => { const r = document.querySelector('#rest-pt')?.getBoundingClientRect(); return r && r.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth; });
ok(cab, '36: ring, cartão e botões cabem em 360x780');
ok(await p.locator('#rest.mini').count() === 0, '36: depois da última série o descanso abre em tela cheia (não minimizado)');
await p.click('#rest-x'); await p.waitForTimeout(400);
ok(/Próximo: Crucifixo/i.test(await p.innerText('#rest-n')), `36: barra minimizada também diz o próximo (${await p.innerText('#rest-n')})`);
await p.click('#rest-n'); await p.waitForTimeout(300);
// mesmo fluxo com o descanso anterior minimizado ("✎ anotar") e a última série marcada com ele rodando
await p.click('#rest-skip'); await p.waitForTimeout(300); await p.context().close();
p = await abrir(); await treino(p, 'C'); await passo(p, 1);
for (let k = 0; k < 3; k++) { await p.fill(`.set[data-k="${k}"] input[data-f="kg"]`, '20'); await p.click(`.set[data-k="${k}"] .rest`); await p.waitForTimeout(900); if (k < 2 && await p.locator('#rest:not(.mini)').count()) { await p.click('#rest-x'); await p.waitForTimeout(300); } }
await p.waitForTimeout(600);
ok(await p.locator('#rest:not(.mini)').count() === 1 && /PRÓXIMO EXERCÍCIO[\s\S]*Crucifixo/i.test(await p.innerText('#rest-p').catch(() => '')), '36: com o descanso anterior minimizado, a última série abre o descanso cheio com o próximo');
await p.screenshot({ path: path.join(process.env.SHOTS || '/tmp', 'sessao-critica-proximo.png') });
await p.context().close();

// ---------- Treino D: carga absurda (item 2) e reconhecimento (item 12) ----------
p = await abrir(); await treino(p, 'D');
await passo(p, 1); // R
const rec = await p.innerText('.bloco');
ok(/Reconhecimento/i.test(rec) && /Não conta como série válida/i.test(rec), '12: reconhecimento explica que é série leve e não conta');
ok(!/·/.test(await p.innerText('.bloco h1')), '12: título sem o "·" solto');
await passo(p, 2); // Puxada Pronada
await p.fill('.set[data-k="0"] input[data-f="kg"]', '300'); await p.fill('.set[data-k="0"] input[data-f="reps"]', '12');
await p.click('.set[data-k="0"] .rest'); await p.waitForTimeout(600);
ok(/Confere a carga/i.test(await modal(p)), '2: 300 kg no ✓ pergunta');
await p.click('#q-s'); await p.waitForTimeout(500); // Corrigir
ok(await p.inputValue('.set[data-k="0"] input[data-f="kg"]') === '', '2: "Corrigir" limpa o campo');
ok(await p.evaluate(() => document.activeElement?.matches('.set[data-k="0"] input[data-f="kg"]')), '2: "Corrigir" põe o cursor no kg');
// digita 300 de novo e não marca; preenche a 2ª e finaliza
await p.fill('.set[data-k="0"] input[data-f="kg"]', '300'); await p.fill('.set[data-k="1"] input[data-f="kg"]', '30'); await p.fill('.set[data-k="1"] input[data-f="reps"]', '10');
const ult = await p.locator('[data-passo]').count(); await passo(p, ult - 1);
await p.click('#fin'); await p.waitForTimeout(500);
ok(/preenchida|preenchidas/i.test(await modal(p)), '2: pergunta das séries preenchidas sem marcar');
await p.click('#m [data-o="0"]'); await p.waitForTimeout(500);
ok(/Confere a carga/i.test(await modal(p)) && /300/.test(await modal(p)), '2: "Marcar como feitas" passa pela conferência dos 300 kg');
await p.click('#q-s'); await p.waitForTimeout(600);
ok(/Puxada/i.test(await p.innerText('.bloco h1')), '2: "Corrigir" volta pra Puxada');
ok(await p.inputValue('.set[data-k="0"] input[data-f="kg"]') === '', '2: e limpa o 300');
const feitas = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao') || localStorage.getItem('sessao') || '{}').sets?.[3]?.filter(x => x.done && +x.kg >= 300).length || 0);
ok(feitas === 0, '2: nenhuma série de 300 kg marcada');
await p.context().close();

console.log(errs.length ? 'ERROS: ' + errs.join(' | ') : 'tudo certo'); await b.close(); process.exit(errs.length ? 1 : 0);
