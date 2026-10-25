// Acolhimento: boas-vindas animada, passeio guiado, o time, resumo da semana, volta depois de dias e lembretes.
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'); const D=process.env.OUT||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[];
for (const vw of [375,360]) {
  const ctx=await b.newContext({locale:'pt-BR',viewport:{width:vw,height:800},deviceScaleFactor:2,serviceWorkers:'block'}); const p=await ctx.newPage();
  await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
  p.on('pageerror',e=>errs.push(vw+' '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/Failed to load|net::/.test(m.text())) errs.push(vw+' console '+m.text()); });
  await p.clock.install({ time: new Date('2026-10-27T09:00:00-03:00') }); // terça: aparece o resumo da semana passada
  const shot=async n=>{ await p.waitForTimeout(300); await p.screenshot({path:`${D}/ac-${vw}-${n}.png`}); };
  const larg=async n=>{ if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) errs.push(`${vw} scroll horizontal em ${n}`); };
  await p.goto('http://app.local/?demo&boasvindas'); await p.waitForTimeout(500);
  await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter');
  await p.waitForSelector('.bv', {timeout:4000}).catch(()=>errs.push(vw+' boas-vindas não apareceu'));
  await p.clock.runFor(2500); await shot('boasvindas'); await larg('boas-vindas');
  await p.click('#bvOk'); await p.clock.runFor(800);
  if (await p.isVisible('.bv')) errs.push(vw+' boas-vindas não fechou');
  await p.waitForSelector('.tour',{timeout:4000}).catch(()=>errs.push(vw+' passeio não apareceu'));
  let passos=0; while (await p.isVisible('.tour')) { passos++; if(passos===1) await shot('tour1'); if(passos===3) await shot('tour3'); const box=await p.$eval('.tour-box',e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}); if(!box) errs.push(`${vw} balão do passeio fora da tela no passo ${passos}`); await p.click('.tour-ok'); await p.clock.runFor(400); if(passos>12) break; }
  console.log(vw,'passos do passeio:',passos); if(passos<5) errs.push(vw+' passeio curto: '+passos);
  await p.reload(); await p.clock.runFor(1500); if(await p.isVisible('.bv')||await p.isVisible('.tour')) errs.push(vw+' boas-vindas/passeio repetiu');
  const home=(await p.innerText('.view')).replace(/\s+/g,' '); console.log(vw,'home:',home.slice(0,220));
  if(!/Sua semana passada/.test(home)) errs.push(vw+' sem card do resumo');
  await shot('home'); await larg('home');
  await p.click('#resumoSem'); await p.clock.runFor(800); await shot('resumo'); await larg('resumo'); console.log(vw,'resumo:',(await p.innerText('.view')).replace(/\s+/g,' ').slice(0,200));
  await p.click('[data-go="home"]'); await p.clock.runFor(800); if(await p.isVisible('#resumoSem')) errs.push(vw+' card do resumo não sumiu depois de visto');
  await p.click('.home-time'); await p.clock.runFor(1200); await shot('time'); await larg('time'); const tm=(await p.innerText('.view')).replace(/\s+/g,' '); console.log(vw,'time:',tm.slice(0,200)); if(!/ranking do mês/i.test(tm)) errs.push(vw+' time não carregou');
  await p.click('.tabs [data-go="perfil"]'); await p.clock.runFor(900); await shot('perfil'); if(!(await p.isVisible('#swTime'))) errs.push(vw+' sem opção do time no perfil');
  await p.click('#swTime'); await p.clock.runFor(500);
  await p.click('#tour'); await p.clock.runFor(1500); if(!(await p.isVisible('.tour'))) errs.push(vw+' rever passeio não funcionou'); else await p.click('.tour-pula');
  await p.click('.tabs [data-go="evolucao"]'); await p.clock.runFor(900); await p.click('[data-go="semana"]'); await p.clock.runFor(900); await larg('semana atual');
  await ctx.close();
}
// Volta depois de uns dias (demo: último treino há 1 dia → avança o relógio 6 dias)
{ const ctx=await b.newContext({locale:'pt-BR',viewport:{width:375,height:800},serviceWorkers:'block'}); const p=await ctx.newPage();
  await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
  p.on('pageerror',e=>errs.push('volta '+e.message));
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
  await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('demo:state')); const d=new Date(Date.now()-6*86400000).toISOString(); s.sessoes.forEach((x,i)=>{ if(x.finalizada_em) x.finalizada_em=new Date(Date.now()-(6+i)*86400000).toISOString(); }); localStorage.setItem('demo:state',JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(1200); const v=(await p.innerText('.view')).replace(/\s+/g,' ');
  console.log('volta:', v.slice(0,160)); if(!/Que bom te ver de volta/.test(v)) errs.push('sem card de volta');
  await p.screenshot({path:`${D}/ac-volta.png`}); await p.click('.volta-x'); await p.waitForTimeout(300); if(await p.isVisible('#volta')) errs.push('card de volta não fechou');
  await ctx.close(); }
console.log('erros:',errs); await b.close(); if(errs.length) process.exit(1);
