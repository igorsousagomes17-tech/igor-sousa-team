// Anamnese nova (perguntas que somem quando não se aplicam) → fotos do início → registro aberto;
// painel do Igor: avaliação postural com achados, observação e histórico.
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = [], falhas = [];
const ok = (c, m) => { console.log((c ? '  ok  ' : '  FALHOU ') + m); if (!c) falhas.push(m); };
async function nova() {
  const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 360, height: 800 }, serviceWorkers: 'block', isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  return { ctx, p };
}
// zera a anamnese antes do app carregar (senão ele regrava o perfil) e abre a anamnese
async function zera(ctx, p, campos) {
  await ctx.addInitScript(c => { if (sessionStorage.getItem('zerou')) return; const s = JSON.parse(localStorage.getItem('demo:state') || 'null'); if (!s) return; sessionStorage.setItem('zerou', '1'); Object.assign(s.perfil, c); localStorage.setItem('demo:state', JSON.stringify(s)); localStorage.removeItem('demo:anamnese'); }, campos);
  await p.reload(); await p.waitForTimeout(1200);
  if (!(await p.isVisible('#m'))) { await p.click('#anam'); await p.waitForTimeout(400); }
}
const txt = async (p, s) => (await p.innerText(s)).replace(/\s+/g, ' ');

// 1. Aluna: anamnese do zero, só academia → não vê "o que tem em casa"; vê "como é a sua academia"; depois pede as fotos
{ const { ctx, p } = await nova();
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await p.waitForTimeout(900);
  await zera(ctx, p, { objetivo: null, anamnese_em: null, sexo: null, foco: [], saude: [], gestacao: null, nascimento: null });
  await p.click('#next'); await p.waitForTimeout(200);
  const vistas = [];
  for (let k = 0; k < 40; k++) {
    const m = await txt(p, '#m'); if (/Tá tudo certo/i.test(m)) break;
    vistas.push((await p.innerText('#m h2')).trim());
    if (await p.$('#pk')) { await p.fill('#pk', '64'); await p.fill('#al', '165'); }
    else if (await p.$('#tx[type=date]')) await p.fill('#tx', '1995-05-10');
    else if (await p.$('#ops') && !(await p.$('#ops .opc.on'))) await p.click('#ops .opc'); // 1ª opção: academia, mulher, "Nenhuma"...
    await p.click('#next'); await p.waitForTimeout(150);
  }
  ok(vistas.some(v => /Como é a sua academia/i.test(v)), 'quem treina na academia vê "como é a sua academia"');
  ok(!vistas.some(v => /em casa\?/i.test(v)), 'quem só treina na academia não vê "o que tem em casa"');
  ok(vistas.some(v => /ciclo/i.test(v)) && vistas.some(v => /Você é/i.test(v)), 'pergunta sexo e ciclo');
  ok(!vistas.some(v => /incomoda/i.test(v)), '"qual parte mais te incomoda" saiu');
  console.log('  perguntas vistas:', vistas.length);
  const rev = await txt(p, '#m'); ok(!/em casa\?/i.test(rev), 'revisão não lista pergunta que não se aplica');
  await p.click('#next'); await p.waitForTimeout(1800);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')).perfil);
  ok(st.sexo === 'F' && st.local_treino === 'academia' && st.academia_tipo === 'rede' && st.anamnese_em, 'salvou sexo, local e tipo de academia');
  ok(await p.isVisible('#m') && /fotos do início/i.test(await txt(p, '#m')), 'depois da 1ª anamnese pede as fotos do início');
  await p.click('text=Tirar agora'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => location.hash) === '#evolucao' && /Registro do mês/i.test(await txt(p, '#m')), '"Tirar agora" abre o registro com as 3 fotos');
  await p.screenshot({ path: `${D}/postural-1-fotos.png` });
  await ctx.close(); }

// 2. Homem: não vê gestação nem ciclo
{ const { ctx, p } = await nova();
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await p.waitForTimeout(900);
  await zera(ctx, p, { objetivo: null, anamnese_em: null, sexo: null }); await p.click('#next'); await p.waitForTimeout(200);
  const vistas = [];
  for (let k = 0; k < 40; k++) {
    if (/Tá tudo certo/i.test(await txt(p, '#m'))) break; const h = (await p.innerText('#m h2')).trim(); vistas.push(h);
    if (/Você é/i.test(h)) await p.click('#ops .opc >> nth=1'); // Homem
    else if (/Onde vai treinar/i.test(h)) await p.click('#ops .opc >> nth=1'); // Casa
    else if (await p.$('#pk')) { await p.fill('#pk', '80'); await p.fill('#al', '1,78'); }
    else if (await p.$('#tx[type=date]')) await p.fill('#tx', '1990-01-10');
    else if (await p.$('#ops') && !(await p.$('#ops .opc.on'))) await p.click('#ops .opc');
    await p.click('#next'); await p.waitForTimeout(150);
  }
  ok(!vistas.some(v => /grávida|ciclo/i.test(v)), 'homem não vê gestação nem ciclo');
  ok(vistas.some(v => /em casa\?/i.test(v)) && !vistas.some(v => /Como é a sua academia/i.test(v)), 'quem treina em casa vê equipamento e não vê tipo de academia');
  await ctx.close(); }

// 2b. Veio do Mfit (o Igor preencheu o perfil, sem anamnese enviada): abre direto na conferência, marca o que falta, envia
{ const { ctx, p } = await nova();
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await p.waitForTimeout(900);
  await zera(ctx, p, { anamnese_em: null, sexo: null, horario: null });
  const m = await txt(p, '#m');
  ok(/Tá tudo certo/i.test(m) && /já preencheu/i.test(m) && /Emagrecer/.test(m), 'veio do Mfit: abre na conferência com as respostas já preenchidas');
  ok(/falta responder/i.test(m), 'mostra o que falta responder');
  await p.click('#next'); await p.waitForTimeout(300); // Enviar → vai pra 1ª que falta (sexo)
  ok(/Você é/i.test(await txt(p, '#m')), 'enviar leva direto pra pergunta que falta');
  await p.click('#ops .opc'); await p.click('#next'); await p.waitForTimeout(300);
  ok(/Tá tudo certo/i.test(await txt(p, '#m')), 'depois de responder volta pra conferência');
  const salvo = () => p.evaluate(() => !!JSON.parse(localStorage.getItem('demo:state')).perfil.anamnese_em);
  for (let k = 0; k < 20 && !(await salvo()); k++) { // responde o que mais faltar (ex. saúde) e envia
    if (await p.$('#ops') && !(await p.$('#ops .opc.on'))) await p.click('#ops .opc');
    if (await p.$('#next')) await p.click('#next'); await p.waitForTimeout(700); }
  ok(await salvo(), 'enviou');
  await ctx.close(); }

// 3. Igor: avaliação postural
{ const { ctx, p } = await nova();
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em', 'igor@demo.com'); await p.press('#pw', 'Enter'); await p.waitForTimeout(1200);
  await p.click('#t-postural'); await p.waitForTimeout(300); await p.click('[data-postural] >> nth=0'); await p.waitForTimeout(700);
  ok(/Postural/i.test(await txt(p, '#m')) && (await p.$$('[data-ach]')).length >= 15, 'abre a avaliação com a lista de achados');
  await p.click('[data-ach="Joelho pra dentro (valgo)"]'); await p.click('[data-ach="Ombros projetados à frente"]'); await p.fill('#obs', 'reforçar glúteo médio');
  await p.screenshot({ path: `${D}/postural-2-painel.png`, fullPage: true });
  await p.click('#s'); await p.waitForTimeout(800);
  ok(!(await p.isVisible('#m')), 'salvou e fechou');
  await p.click('[data-postural] >> nth=0'); await p.waitForTimeout(700);
  ok((await p.$$('[data-ach].on')).length === 2 && (await p.inputValue('#obs')) === 'reforçar glúteo médio' && /Avaliações anteriores \(1\)/i.test(await txt(p, '#m')), 'reabre com os achados marcados e o histórico');
  await ctx.close(); }

console.log('erros:', errs); await b.close(); if (errs.length || falhas.length) process.exit(1);
