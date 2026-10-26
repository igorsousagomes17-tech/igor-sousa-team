// Spinning guiado: programa na lista, filtro por duração, aula do mês, player (sentada/em pé), fim registra como treino.
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'); const D=process.env.OUT||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[];
for (const vw of [375,360]) {
  const ctx=await b.newContext({locale:'pt-BR',viewport:{width:vw,height:800},deviceScaleFactor:2,serviceWorkers:'block'}); const p=await ctx.newPage();
  await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
  p.on('pageerror',e=>errs.push(vw+' '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/Failed to load|net::/.test(m.text())) errs.push(vw+' console '+m.text()); });
  const larg=async n=>{ if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) errs.push(`${vw} scroll horizontal em ${n}`); };
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
  if (!(await p.$('.hscroll [data-go="spin"]'))) errs.push(vw+' sem spinning no início');
  await p.click('[data-go="lib"]'); await p.waitForTimeout(500); await p.click('.grid2 [data-go="spin"]'); await p.waitForTimeout(800);
  const n=await p.$$eval('.spin-aula',x=>x.length); console.log(vw,'aulas',n); await p.screenshot({path:`${D}/spin-lista-${vw}.png`}); await larg('lista');
  const d10=await p.$('[data-dur="10"]'); if (d10){ await d10.click(); await p.waitForTimeout(400); const m=await p.$$eval('.spin-aula',x=>x.length); console.log(vw,'10 min:',m); await p.click('[data-dur=""]'); await p.waitForTimeout(300); }
  await p.click('.spin-mes [data-spin]'); await p.waitForTimeout(700); await larg('player');
  await p.click('#sGo'); await p.waitForTimeout(1200); await p.screenshot({path:`${D}/spin-player-${vw}.png`});
  // pula até um bloco em pé, se tiver
  let viuPe=false; for (let k=0;k<40;k++){ const sel=await p.textContent('#sSelo'); if(/em pé/i.test(sel)){ viuPe=true; await p.waitForTimeout(1500); await p.screenshot({path:`${D}/spin-pe-${vw}.png`}); break;} if(!(await p.$('#sGo'))) break; await p.click('#sGo'); await p.waitForTimeout(150); }
  if(!viuPe) errs.push(vw+' não achou bloco em pé');
  for (let k=0;k<60 && await p.$('#sGo');k++){ await p.click('#sGo'); await p.waitForTimeout(80); }
  await p.waitForTimeout(600); const fim=(await p.innerText('.view')).replace(/\s+/g,' '); console.log(vw,'fim:',fim.slice(0,90));
  if(!/Aula feita|registrado|outras aulas/i.test(fim)) errs.push(vw+' não chegou na tela final');
  await ctx.close();
}
console.log('erros:',errs); await b.close(); if(errs.length) process.exit(1);
