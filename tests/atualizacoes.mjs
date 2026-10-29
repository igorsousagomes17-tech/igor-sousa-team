import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'); const D=process.env.OUT||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({locale:'pt-BR',viewport:{width:360,height:780},deviceScaleFactor:2,serviceWorkers:'block'}); const p=await ctx.newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
// aluna: aviso de vencimento na Home (demo: vence em 2 dias)
await p.goto('http://app.local/?demo'); await p.waitForTimeout(500);
await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
const home=await p.innerText('.view'); console.log('aviso aluna:', /Seu treino vai até/.test(home)); if(!/Seu treino vai até/.test(home)) errs.push('sem aviso de vencimento');
await p.screenshot({path:D+'/upd-aluna.png'});
// admin (contexto novo)
const ctx2=await b.newContext({locale:'pt-BR',viewport:{width:360,height:780},deviceScaleFactor:2,serviceWorkers:'block'}); const p2=await ctx2.newPage(); await p2.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); }); p2.on('pageerror',e=>errs.push(e.message));
await p2.goto('http://app.local/?demo'); await p2.waitForTimeout(500);
await p2.click('text=ENTRAR'); await p2.fill('#em','igor@demo.com'); await p2.press('#pw','Enter'); await p2.waitForTimeout(1000);
console.log('badge:', await p2.innerText('#a-upd')); await p2.screenshot({path:D+'/upd-home.png'});
await p2.click('#a-upd'); await p2.waitForTimeout(400); const lst=await p2.innerText('.view'); console.log(lst.replace(/\s+/g,' ').slice(0,400)); await p2.screenshot({path:D+'/upd-lista.png'});
if(!/venceu em/.test(lst)||!/vence em/.test(lst)) errs.push('lista sem vencido/vencendo');
await p2.click('[data-visto]'); await p2.waitForTimeout(400); console.log('após marcar:', (await p2.innerText('.view')).replace(/\s+/g,' ').slice(0,200));
await p2.click('[data-vtab="res"]'); await p2.waitForTimeout(300); if(!(await p2.innerText('.view')).match(/reabrir/i)) errs.push('resolvida não apareceu');
await p2.click('[data-vtab="pend"]'); await p2.click('[data-treino]'); await p2.waitForTimeout(700);
console.log('editor:', (await p2.innerText('#venceEm')));
await p2.selectOption('#sem','6'); await p2.waitForTimeout(200); console.log('com 6 sem:', await p2.innerText('#venceEm')); await p2.screenshot({path:D+'/upd-editor.png'});
console.log('erros:', errs); await b.close(); if (errs.length) process.exit(1);
