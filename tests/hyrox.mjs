// Hyrox na academia: card no Início e em Programas, escolha de nível, treinos do mês, circuito abre como sessão.
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'); const D=process.env.OUT||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[];
for (const vw of [375,360]) {
  const ctx=await b.newContext({locale:'pt-BR',viewport:{width:vw,height:800},deviceScaleFactor:2,serviceWorkers:'block'}); const p=await ctx.newPage();
  await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
  p.on('pageerror',e=>errs.push(vw+' '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/Failed to load|net::/.test(m.text())) errs.push(vw+' console '+m.text()); });
  const larg=async n=>{ if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) errs.push(`${vw} scroll horizontal em ${n}`); };
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
  if (!(await p.$('.hscroll [data-go="hyrox"]'))) errs.push(vw+' sem Hyrox no início');
  await p.click('[data-go="lib"]'); await p.waitForTimeout(500); await p.click('.grid2 [data-go="hyrox"]'); await p.waitForTimeout(800);
  const nv=await p.$$eval('[data-nv]',x=>x.length); if(nv!==3) errs.push(vw+' níveis: '+nv); await p.screenshot({path:`${D}/hyrox-nivel-${vw}.png`}); await larg('nível');
  await p.click('[data-nv="int"]'); await p.waitForTimeout(600);
  const tr=await p.$$eval('[data-ht]',x=>x.length); if(tr!==3) errs.push(vw+' treinos: '+tr); await p.screenshot({path:`${D}/hyrox-mes-${vw}.png`,fullPage:true}); await larg('mês');
  await p.click('[data-ht="0"]'); await p.waitForTimeout(1200); await larg('sessão');
  const txt=(await p.innerText('.view')).replace(/\s+/g,' '); console.log(vw,'sessão:',txt.slice(0,160)); await p.screenshot({path:`${D}/hyrox-sessao-${vw}.png`});
  if(!/Corrida na esteira|Mobilidade/i.test(txt)) errs.push(vw+' sessão não abriu');
  await ctx.close();
}
console.log('erros:',errs); await b.close(); if(errs.length) process.exit(1);
