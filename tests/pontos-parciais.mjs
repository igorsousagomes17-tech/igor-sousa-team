// Igor 03/11: treino incompleto ganha pontos proporcionais (não zero) e pode postar o story
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await (await b.newContext({locale:'pt-BR',viewport:{width:360,height:780},serviceWorkers:'block'})).newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const ok=(c,m)=>{ console.log((c?'OK   ':'FALHA ')+m); if(!c) errs.push(m); };
await p.goto('http://app.local/?demo'); await p.waitForTimeout(500);
await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
const pts = await p.evaluate(async()=>{ const db=await import('/js/db-mock.js'); const r={}; for (const [f,t,d] of [[5,9,2520],[9,9,600],[1,9,700],[3,9,300],[0,9,2000]]) { const s=await db.iniciarSessao('x',{titulo:'Treino B',total:t}); const a=(await db.meusPontos()).length; await db.finalizarSessao(s.id,{exercicios_feitos:f,exercicios_total:t,duracao_s:d}); const l=await db.meusPontos(); r[`${f}/${t} ${d}s`]=l.length>a?l[0].pontos:0; } return r; }).catch(e=>({erro:String(e)}));
console.log(JSON.stringify(pts));
ok(pts['5/9 2520s']===30 && pts['9/9 600s']===50 && pts['1/9 700s']===10 && pts['3/9 300s']===0 && pts['0/9 2000s']===0, 'pontos: 5/9=30, completo=50, mínimo 10, <10 min ou nada feito=0');
// card de treino incompleto (5 de 9, 42 min)
await p.evaluate(()=>{ history.pushState({ name:'card', arg: JSON.stringify({ titulo:'Treino B', min:42, seg:2520, ex:5, total:9, series:15, completo:false, kcal:270 }) }, '', '#card'); dispatchEvent(new PopStateEvent('popstate', { state: history.state })); });
await p.waitForTimeout(1200); const v = await p.innerText('body');
ok(/\+30\s*pts/i.test(v) && !/sem pontos/i.test(v), `incompleto 5/9 em 42 min mostra +30 pts (${(v.match(/\+\d+ pts|sem pontos|treino registrado/i)||[''])[0]})`);
ok(await p.$('#share') && await p.$('#shareFoto'), 'incompleto pode postar no story e baixar com fundo transparente');
await p.screenshot({ path: '/tmp/pontos-parciais-card.png' });
console.log(errs.length?'ERROS: '+errs.join(' | '):'tudo certo'); await b.close(); process.exit(errs.length?1:0);
