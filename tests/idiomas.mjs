// Percorre o app da aluna nos 6 idiomas (pt, en, es, zh, hi, fr) no modo demo.
// Falha se: erro de página/console, texto sem tradução, frase da interface em português sobrando,
// ou algo estourando a largura (padrão 360px). Tira screenshot de cada tela.
// Uso: W=360 OUT=/tmp/shots node tests/idiomas.mjs   (IDIOMAS=en,zh pra rodar só alguns)
import { chromium } from 'playwright';
import path from 'path';
const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const D = process.env.OUT || '/tmp'; const W = +(process.env.W || 360);
const LINGUAS = (process.env.IDIOMAS || 'pt,en,es,zh,hi,fr').split(',');
// Frases da interface que não podem aparecer em português nos outros idiomas (o que o Igor digita fica de fora)
const FRASES = ['Bora,', 'Treino de hoje', 'Meta da semana', 'Programas extras', 'Abrir treino', 'Iniciar treino', 'Baixar treino em PDF', 'Encerrar treino',
  'Exercício concluído', 'Bi-set concluído', 'exercícios feitos', 'Pausar', 'Terminou a série', 'Pular', 'anotar', 'Mandou bem', 'Boa, registrado', 'Quanto esforço',
  'Enviar e gerar', 'Postar no story', 'Meus pontos', 'Como ganhar', 'Prêmios do trimestre', 'Minha evolução', 'Treinos por mês', 'Minhas cargas',
  'Minha anamnese', 'Respostas do Igor', 'Indique uma amiga', 'Lembretes', 'Chamar o Igor', 'Como fazer cada exercício', 'em gravação', 'Tira-dúvidas',
  'Sou a assistente', 'Início', 'Evolução', 'Pontos', 'Vídeos', 'Perfil', 'Descanso', 'Faltam', 'Nenhuma série', 'Continuar treino', 'Treino feito', 'semanas', 'séries'];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const falhas = [], avisos = []; let n = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  FALHOU ') + m); if (!c) falhas.push(m); };

for (const L of LINGUAS) {
  console.log(`\n== ${L} ==`);
  const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: W, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = [];
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errs.push('console: ' + m.text()); });
  const espera = (ms = 450) => p.waitForTimeout(ms);
  // Confere a tela: português sobrando, chave sem tradução, estouro de largura. Depois tira a foto.
  async function tela(nome) {
    await espera(350);
    const r = await p.evaluate(async ({ L, FRASES, W }) => {
      const m = await import('/js/i18n.js');
      const faltando = [...(window.__i18nFaltando || [])]; // antes do teste consultar o dicionário
      const txt = document.body.innerText;
      const sobrando = L === 'pt' ? [] : FRASES.filter(f => txt.includes(f) && !m.tl(L, f).includes(f));
      const estouro = [], cortado = [];
      const visivel = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
      for (const el of document.querySelectorAll('body *')) {
        if (!visivel(el) || el.closest('.hscroll') || ['svg', 'path', 'circle', 'i'].includes(el.tagName.toLowerCase())) continue;
        const r = el.getBoundingClientRect();
        if (r.right > W + 1 || r.left < -1) estouro.push(el.tagName + '.' + el.className + ' "' + (el.innerText || '').slice(0, 30) + '" ' + Math.round(r.left) + '-' + Math.round(r.right));
      }
      for (const el of document.querySelectorAll('.btn, .pill, h1, h2, h3, .opc, .linha, label.l, .set .h, .tab span, .back, .langbtn, .sw, .big, .lib b')) {
        if (!visivel(el)) continue;
        if (el.scrollWidth > el.clientWidth + 1) (el.matches('.tab span') ? cortado : estouro).push('texto maior que a caixa: ' + el.tagName + '.' + el.className + ' "' + (el.innerText || '').slice(0, 40) + '"');
      }
      FRASES.forEach(f => { if (!faltando.includes(f)) window.__i18nFaltando?.delete(f); });
      return { sobrando, estouro: estouro.slice(0, 6), cortado, faltando, larg: document.documentElement.scrollWidth };
    }, { L, FRASES, W });
    ok(!r.sobrando.length, `${L}/${nome}: sem português da interface sobrando ${r.sobrando.length ? JSON.stringify(r.sobrando) : ''}`);
    ok(!r.faltando.length, `${L}/${nome}: todo texto tem tradução ${r.faltando.length ? JSON.stringify(r.faltando.slice(0, 8)) : ''}`);
    ok(r.larg <= W + 1 && !r.estouro.length, `${L}/${nome}: nada estoura ${W}px ${r.estouro.length ? JSON.stringify(r.estouro) : ''}`);
    if (r.cortado.length) avisos.push(`${L}/${nome}: aba cortada com reticências ${JSON.stringify(r.cortado)}`);
    await p.screenshot({ path: `${D}/i-${L}-${String(++n).padStart(2, '0')}-${nome}.png`, fullPage: true });
  }

  // Entrada: botão de idioma
  await p.goto('http://app.local/?demo'); await espera(700);
  await p.click('#lang'); await espera(300);
  ok((await p.$$('[data-l]')).length === 6, `${L}: seletor mostra os 6 idiomas`);
  await p.click(`[data-l="${L}"]`); await espera(400);
  ok(await p.evaluate(() => document.documentElement.lang) === ({ pt: 'pt-BR', zh: 'zh-Hans' }[L] || L), `${L}: <html lang> trocou`);
  await tela('entrada');
  await p.click('[data-go="login"]'); await espera(400); await tela('login');
  await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await espera(1200);
  await tela('inicio');
  await p.click('.tabs [data-go="treino"]'); await espera(600); await p.click('[data-go="treino"][data-arg="A"]'); await espera(500); await tela('treino');
  await p.click('#ini'); await espera(900); await tela('sessao-tempo');
  await p.click('#pular'); await espera(400); await tela('sessao-biset');
  await p.click('#pular'); await espera(400);
  await p.fill('.set[data-k="0"] input[data-f="kg"]', '40'); // com kg: sem o "Anotar o peso?" (crítica 30/10) o descanso abre direto
  await p.click('.set[data-k="0"] .rest'); await espera(700);
  ok(await p.$('#rest') !== null, `${L}: descanso abriu`); await tela('descanso');
  await p.click('#rest-x'); await espera(300); await tela('descanso-mini');
  await p.click('#fim'); await espera(400); await tela('confirma-fim');
  await p.click('#enc'); await espera(600);
  await p.click('#esf button >> nth=7'); await p.click('#nota button >> nth=9'); await tela('feedback');
  await p.click('#env'); await espera(1000); await tela('card');
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null); if (await p.$('#share')) { await p.click('#share'); await dl; } /* treino incompleto não tem story (crítica 30/10) */ await espera(600);
  await p.click('.tabs [data-go="pontos"]'); await espera(700); await tela('pontos');
  await p.click('.tabs [data-go="evolucao"]'); await espera(800); await tela('evolucao');
  await p.click('#add'); await espera(400); await tela('registro-mes'); await p.click('#c'); await espera(200);
  await p.click('.tabs [data-go="videos"]'); await espera(700); await tela('videos');
  await p.click('.vid >> nth=0'); await espera(400); await tela('video'); await p.click('#vm-close'); await espera(200);
  await p.click('.tabs [data-go="perfil"]'); await espera(800); await tela('perfil');
  await p.click('#pw'); await espera(300); await tela('senha'); await p.click('#c'); await espera(200);
  await p.click('.tabs [data-go="home"]'); await espera(800); await p.click('[data-go="assistente"]'); await espera(900);
  await p.click('.sug [data-q] >> nth=5'); await espera(1600); await tela('tira-duvidas');
  // Anamnese (perguntas e opções) e a tela de conferir
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.perfil.objetivo = null; s.perfil.anamnese_em = null; localStorage.setItem('demo:state', JSON.stringify(s)); localStorage.removeItem('demo:anamnese'); });
  await p.reload(); await espera(1200); await tela('anamnese-boas-vindas');
  await p.click('#next'); await espera(300); await tela('anamnese-1');
  await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('demo:anamnese')); a.i = 13; localStorage.setItem('demo:anamnese', JSON.stringify(a)); }); await p.reload(); await espera(1200); await tela('anamnese-saude');
  await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('demo:anamnese')); a.i = 17; localStorage.setItem('demo:anamnese', JSON.stringify(a)); }); await p.reload(); await espera(1200); await tela('anamnese-dia-a-dia');
  await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('demo:anamnese')); a.i = 99; localStorage.setItem('demo:anamnese', JSON.stringify(a)); }); await p.reload(); await espera(1200); await tela('anamnese-confere');
  // Troca de idioma no Perfil re-desenha a tela na hora
  await p.evaluate(() => { localStorage.removeItem('demo:anamnese'); const s = JSON.parse(localStorage.getItem('demo:state')); s.perfil.objetivo = 'Emagrecer'; s.perfil.anamnese_em = new Date().toISOString(); localStorage.setItem('demo:state', JSON.stringify(s)); }); await p.reload(); await espera(1200);
  await p.click('.tabs [data-go="perfil"]'); await espera(800);
  const outro = L === 'pt' ? 'en' : 'pt';
  await p.click('#idi'); await espera(300); await p.click(`[data-l="${outro}"]`); await espera(700);
  const h2 = await p.textContent('.topbar h2'), aba = await p.textContent('.tabs [data-go="perfil"] span.l'); // aba tem nome inteiro + curto (letra grande)
  ok(h2 === (outro === 'pt' ? 'Perfil' : 'Profile') && aba.trim() === h2, `${L}: trocar no Perfil re-desenha na hora (${h2} / ${aba.trim()})`);
  ok(!errs.length, `${L}: sem erro de página/console ${errs.length ? JSON.stringify(errs.slice(0, 5)) : ''}`);
  await ctx.close();
}
await b.close();
if (avisos.length) console.log('\navisos:', avisos);
if (falhas.length) { console.log('\nFALHAS:', falhas.length); process.exit(1); }
console.log('\ntudo ok');
