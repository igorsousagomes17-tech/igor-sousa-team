import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({locale:'pt-BR',viewport:{width:375,height:812},serviceWorkers:'block'}); const p=await ctx.newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://app.local/?demo'); await p.waitForTimeout(500);
await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
await p.click('.tabs [data-go="perfil"]'); await p.waitForTimeout(900);
const ok=(c,m)=>{ console.log((c?'OK   ':'FALHA ')+m); if(!c) errs.push(m); };
ok(await p.locator('#stv').count()===1,'card Strava no perfil');
ok(/Conectar com Strava/i.test(await p.innerText('#stv')),'mostra Conectar');
await p.click('#stvOn'); await p.waitForTimeout(1500);
// o mock volta pra ?strava=ok: recarrega a página no demo
await p.goto('http://app.local/?demo&strava=ok'); await p.waitForTimeout(800);
if(await p.locator('text=ENTRAR').count()){ await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900); }
await p.waitForTimeout(1500);
ok(/Strava conectado/i.test(await p.innerText('body')),'aviso ao voltar do Strava');
await p.click('[data-go="perfil"]'); await p.waitForTimeout(900);
ok(/Conectado como/i.test(await p.innerText('#stv')),'mostra conectado');
ok(await p.locator('#stvAuto').isChecked(),'envio automático ligado por padrão');
await p.click('#stvOff'); await p.waitForTimeout(900);
ok(/Conectar com Strava/i.test(await p.innerText('#stv')),'desconectar volta ao botão');
console.log(errs.length?'ERROS: '+errs.join(' | '):'tudo certo'); await b.close(); process.exit(errs.length?1:0);
