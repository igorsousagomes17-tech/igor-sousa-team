// Versão express: alterna no treino, reduz séries/descanso, tira HIIT, mantém mobilidade; sessão começa com a versão escolhida.
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'); const D=process.env.OUT||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[];
for (const vw of [375,360]) {
  const ctx=await b.newContext({locale:'pt-BR',viewport:{width:vw,height:800},deviceScaleFactor:2,serviceWorkers:'block'}); const p=await ctx.newPage();
  await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
  p.on('pageerror',e=>errs.push(vw+' '+e.message));
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
  await p.click('.tabs [data-go="treino"]'); await p.waitForTimeout(500); await p.click('[data-go="treino"][data-arg="A"]'); await p.waitForTimeout(500);
  const series=async()=>p.$$eval('.ex .t span:first-of-type', xs=>xs.map(x=>x.textContent.replace(/\s+/g,' ').trim()));
  const nomes=async()=>p.$$eval('.ex .t b', xs=>xs.map(x=>x.textContent));
  const c=await series(), cn=await nomes();
  await p.click('[data-ver="1"]'); await p.waitForTimeout(500); const e=await series(), en=await nomes();
  await p.screenshot({path:`${D}/express-${vw}.png`, fullPage:false});
  console.log(vw,'completo',cn.length,c.slice(0,4)); console.log(vw,'express',en.length,e.slice(0,4));
  if (cn.some(n=>/hiit/i.test(n)) && en.some(n=>/hiit/i.test(n))) errs.push('HIIT continuou no express');
  if (JSON.stringify(c)===JSON.stringify(e)) errs.push('express não mudou nada');
  if (!(await p.innerText('.view')).includes('Express: mesmos exercícios')) errs.push('sem explicação do express');
  if (await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) errs.push(vw+' scroll horizontal');
  await p.click('#ini'); await p.waitForTimeout(800); const ses=await p.evaluate(()=>JSON.parse(localStorage.getItem('demo:sessao')||localStorage.getItem('sessao')||'null'));
  if (!ses?.express) errs.push('sessão não marcou express'); 
  if (await p.evaluate(()=>{ const d=new Date(), k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); return localStorage.getItem('demo:versaoExpress')===JSON.stringify(k); })!==true) errs.push('não lembrou a escolha (no dia)'); // Express vale só no dia (27/10)
  await ctx.close();
}
console.log('erros:',errs); await b.close(); if(errs.length) process.exit(1);
