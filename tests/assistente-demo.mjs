import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({locale:'pt-BR',viewport:{width:375,height:812},deviceScaleFactor:2,serviceWorkers:'block'});
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>{errs.push('DIALOG');d.dismiss();});
await p.goto('http://app.local/?demo'); await p.waitForTimeout(500); await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(1200);
await p.click('[data-go="assistente"]'); await p.waitForTimeout(800); await p.screenshot({path:(process.env.OUT||'/tmp')+'/c1.png'});
await p.click('.sug [data-q] >> nth=1'); await p.waitForTimeout(1500); await p.screenshot({path:(process.env.OUT||'/tmp')+'/c2.png'});
await p.fill('#tx','Senti dor no joelho no búlgaro'); await p.press('#tx','Enter'); await p.waitForTimeout(1500);
console.log('msgs:', await p.$$eval('.msg', x=>x.length));
await p.goBack(); await p.waitForTimeout(800); console.log('voltou:', await p.evaluate(()=>location.hash));
await p.click('.tabs [data-go="treino"]'); await p.waitForTimeout(600); await p.click('#ini'); await p.waitForTimeout(1200);
await p.click('[data-duvida] >> nth=0'); await p.waitForTimeout(900); console.log('preenchido:', await p.inputValue('#tx')); await p.screenshot({path:(process.env.OUT||'/tmp')+'/c3.png'});
await p.goBack(); await p.waitForTimeout(800); console.log('volta p/ treino:', await p.evaluate(()=>location.hash));
// admin
await p.evaluate(()=>{localStorage.clear()}); await p.goto('http://app.local/?demo'); await p.waitForTimeout(500); await p.click('text=ENTRAR'); await p.press('#pw','Enter'); await p.waitForTimeout(1500);
console.log('painel duvidas:', (await p.innerText('#duv')).replace(/\s+/g,' ').slice(0,120));
console.log('erros', errs); await b.close();
