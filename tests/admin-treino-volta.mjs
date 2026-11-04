// Igor 04/11: treinando pelo app (ele é admin), saiu pra responder mensagem, o app reabriu e o treino "sumiu" (caía no painel)
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await (await b.newContext({locale:'pt-BR',viewport:{width:360,height:780},serviceWorkers:'block'})).newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const ok=(c,m)=>{ console.log((c?'OK   ':'FALHA ')+m); if(!c) errs.push(m); };
await p.goto('http://app.local/?demo'); await p.waitForTimeout(600);
await p.click('text=ENTRAR'); await p.fill('#em','igor@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(1200);
await p.click('[data-go="home"]'); await p.waitForTimeout(800);
await p.click('.tabs [data-go="treino"]'); await p.waitForTimeout(600); await p.click('#ini'); await p.waitForTimeout(800);
const temSessao = await p.evaluate(()=>!!localStorage.getItem('demo:sessao')); ok(temSessao, 'Igor iniciou um treino (fica salvo no celular)');
// app morto e reaberto pela notificação do descanso (./#sessao)
await p.evaluate(()=>history.replaceState(null,'','?demo#sessao')); await p.reload(); await p.waitForTimeout(1800); console.log('hash', await p.evaluate(()=>location.hash));
ok(await p.locator('#fim').count() >= 1 || /Pausar treino/i.test(await p.innerText('body')), 'reabriu pelo aviso do descanso: volta pro treino, não pro painel');
await p.evaluate(()=>history.replaceState(null,'','?demo')); await p.reload(); await p.waitForTimeout(1800);
ok(/Continuar/i.test(await p.innerText('body')), 'reabriu pelo ícone: Início oferece Continuar o treino');
console.log(errs.length?'ERROS: '+errs.join(' | '):'tudo certo'); await b.close(); process.exit(errs.length?1:0);
