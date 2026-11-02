// A carga anotada num exercício aparece em outro treino com o mesmo exercício, mesmo com nome escrito diferente
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await (await b.newContext({serviceWorkers:'block'})).newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://app.local/?demo'); await p.waitForTimeout(600);
const r=await p.evaluate(async()=>{ const db=await import('/js/db-mock.js'); const c=await import('/js/conteudo.js');
  const s=await db.iniciarSessao('x',{titulo:'Treino A',total:1}); await db.salvarSeries(s.id,[1,2,3].map(n=>({exercicio_nome:'Leg press 45',n,kg:77,reps:12}))); await db.finalizarSessao(s.id,{exercicios_feitos:1,exercicios_total:1});
  const out={}; for(const n of ['Leg Press 45°','leg press','Leg press 45 pés mais fechados','Leg press horizontal','Leg press 45 unilateral']) out[n]=(await db.ultimaCarga('x',n))?.kg ?? null;
  out.local=c.cargaPorNome({'Leg press 45':{kg:70}},'Leg Press 45°')?.kg; return out; });
console.log(r);
const ok=(c,m)=>{ console.log((c?'OK   ':'FALHA ')+m); if(!c) errs.push(m); };
ok(r['Leg Press 45°']==77,'maiúscula e ° acham a carga'); ok(r['leg press']==77,'"leg press" acha a do 45'); ok(r['Leg press 45 pés mais fechados']==77,'variação de pés acha');
ok(r['Leg press horizontal']==null,'horizontal NÃO pega a do 45'); ok(r['Leg press 45 unilateral']==null,'unilateral NÃO pega'); ok(r.local==70,'cache do celular por nome parecido');
console.log(errs.length?'ERROS: '+errs.join(' | '):'tudo certo'); await b.close(); process.exit(errs.length?1:0);
