// Meta de água: aparece no Início, meta pelo peso (35 ml/kg), +250/+500, desfazer, ajustar na mão, voltar pro automático, sobrevive ao recarregar.
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'); const D=process.env.OUT||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[];
for (const vw of [375,360]) {
  const ctx=await b.newContext({locale:'pt-BR',timezoneId:'America/Sao_Paulo',viewport:{width:vw,height:800},deviceScaleFactor:2,serviceWorkers:'block'}); const p=await ctx.newPage();
  await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
  p.on('pageerror',e=>errs.push(vw+' '+e.message));
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(1200);
  await p.evaluate(()=>document.querySelector('.tour')?.remove());
  const txt=async()=>(await p.innerText('#agua')).replace(/\s+/g,' ');
  if (!await p.$('#agua')) { errs.push(vw+' card de água não apareceu'); await ctx.close(); continue; }
  let a=await txt(); console.log(vw,'início:',a.slice(0,140));
  if (!/de 2,3 L|de 2,25 L/.test(a) && !/2,8 L|2,7 L/.test(a)) errs.push(vw+' meta inesperada: '+a); // 64,2 kg × 35 = 2,25 L (+ treino se tiver hoje)
  await p.click('[data-agua="500"]'); await p.click('[data-agua="250"]'); await p.waitForTimeout(300);
  a=await txt(); if (!a.includes('0,8 L')) errs.push(vw+' soma errada: '+a);
  await p.click('#aguaDesfaz'); await p.waitForTimeout(200); a=await txt(); if (!a.includes('0,5 L')) errs.push(vw+' desfazer não tirou o último: '+a);
  await p.screenshot({path:`${D}/agua-${vw}.png`}); await (await p.$('#agua')).screenshot({path:`${D}/agua-card-${vw}.png`});
  await p.reload(); await p.waitForTimeout(1200); await p.evaluate(()=>document.querySelector('.tour')?.remove()); a=await txt(); if (!a.includes('0,5 L')) errs.push(vw+' perdeu ao recarregar: '+a);
  await p.click('#aguaAjusta'); await p.fill('#aguaL','1,5'); await p.click('#aguaSalva'); await p.waitForTimeout(300); a=await txt();
  if (!a.includes('de 1,5 L') || !a.includes('Meta que você definiu')) errs.push(vw+' ajuste manual não pegou: '+a);
  await p.click('[data-agua="500"]'); await p.click('[data-agua="500"]'); await p.waitForTimeout(400); a=await txt(); if (!a.includes('Meta batida')) errs.push(vw+' não comemorou a meta: '+a);
  await (await p.$('#agua')).screenshot({path:`${D}/agua-batida-${vw}.png`});
  await p.click('#aguaAjusta'); await p.click('#aguaAuto'); await p.waitForTimeout(300); a=await txt(); if (a.includes('Meta que você definiu')) errs.push(vw+' não voltou pro automático');
  if (await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) errs.push(vw+' scroll horizontal');
  // inglês: sem português sobrando no card
  await p.evaluate(()=>localStorage.setItem('idioma','en')); await p.reload(); await p.waitForTimeout(1200); a=await txt(); console.log(vw,'en:',a.slice(0,120));
  if (/Água|Garrafa|Copo|desfazer/.test(a)) errs.push(vw+' português sobrando em inglês: '+a);
  await ctx.close();
}
// conta pura (roda no navegador porque o i18n usa document)
{ const ctx=await b.newContext({serviceWorkers:'block'}); const p=await ctx.newPage();
  await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(300);
  const r=await p.evaluate(async()=>{ const W=await import('/js/agua.js'); const c=(p,m,man)=>W.metaDia(p,m,man).ml;
    return [['60 kg descanso',c({peso_kg:60},0),2100],['60 kg 1h',c({peso_kg:60},60),2600],['40 kg trava mínima',c({peso_kg:40},0),1600],['110 kg 3h trava máxima',c({peso_kg:110},180),4000],['sem peso',c({},0),2000],['grávida 60 kg',c({peso_kg:60,gestacao:'gravida'},0),2400],['treino de 5 min não conta',c({peso_kg:60},5),2100],['manual 3 L',c({peso_kg:60},0,3000),3000]]; });
  r.forEach(([n,v,e])=>{ if(v!==e) errs.push(`${n}: ${v} ≠ ${e}`); }); console.log('contas:',r.map(x=>x[0]+'='+x[1]).join(' · ')); await ctx.close(); }
console.log('erros:',errs); await b.close(); if(errs.length) process.exit(1);
