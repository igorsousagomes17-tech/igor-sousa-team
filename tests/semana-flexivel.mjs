// Semana flexível: no começo da semana a aluna escolhe por qual treino começar; a semana segue a partir dele.
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'); const D=process.env.OUT||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const errs=[];
for (const vw of [375,360]) {
  const ctx=await b.newContext({locale:'pt-BR',viewport:{width:vw,height:800},deviceScaleFactor:2,serviceWorkers:'block'}); const p=await ctx.newPage();
  await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
  p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-26T10:00:00-03:00') }); // segunda-feira: semana ainda sem treino (no demo, os treinos são de 1-2 dias atrás)
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(500);
  await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
  const temCard = await p.isVisible('#semana');
  console.log(vw,'card da semana:', temCard);
  if (!temCard) errs.push('card da semana não apareceu '+vw);
  else {
    await p.screenshot({path:`${D}/semana-${vw}.png`});
    const opc = await p.$$eval('.semop', bs=>bs.map(b=>b.innerText.replace(/\s+/g,' ')));
    console.log('  opções:', opc);
    const larg = await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth); if (larg) errs.push('scroll horizontal '+vw);
    await p.click('.semop[data-letra="C"]'); await p.waitForTimeout(700);
    const hero = (await p.innerText('.card.hero')).replace(/\s+/g,' ');
    console.log('  depois de escolher C:', hero.slice(0,80)); if(!/treino c/i.test(hero)) errs.push('não começou pelo C');
    if (await p.isVisible('#semana')) errs.push('card não sumiu');
    await p.reload(); await p.waitForTimeout(900);
    if (await p.isVisible('#semana')) errs.push('perguntou de novo depois de escolher');
    if (!/treino c/i.test(await p.innerText('.card.hero'))) errs.push('escolha não ficou salva');
  }
  await ctx.close();
}
console.log('erros:', errs); await b.close(); if (errs.length) process.exit(1);
