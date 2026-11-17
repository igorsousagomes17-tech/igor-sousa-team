// Igor 17/11: volume do treino (kg × reps) no card da aluna e por semana no painel
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await (await b.newContext({locale:'pt-BR',viewport:{width:360,height:780},serviceWorkers:'block'})).newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const ok=(c,m)=>{ console.log((c?'OK   ':'FALHA ')+m); if(!c) errs.push(m); };
await p.goto('http://app.local/?demo'); await p.waitForTimeout(500);
await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
const card = async d => { await p.evaluate(a=>{ history.pushState({ name:'card', arg: JSON.stringify(a) }, '', '#card'); dispatchEvent(new PopStateEvent('popstate',{state:history.state})); }, d); await p.waitForTimeout(1000); return p.innerText('body'); };
let v = await card({ titulo:'Treino A', min:50, seg:3000, ex:7, total:7, series:21, completo:true, kcal:300, vol:4350, volAnt:4000 }); 
ok(/Volume do treino: 4\.350\s+kg/.test(v) && /\+9% que da última vez/.test(v.replace(/\s+/g," ")), 'card mostra volume e +% da última vez');
v = await card({ titulo:'Treino A', min:50, seg:3000, ex:7, total:7, series:21, completo:true, kcal:300, vol:3900, volAnt:4000 });
ok(/Volume do treino: 3\.900\s+kg/.test(v) && !/que da última vez/.test(v), 'volume menor não mostra % negativo');
v = await card({ titulo:'Treino A', min:50, seg:3000, ex:7, total:7, series:21, completo:true, kcal:300, vol:0 });
ok(!/Volume do treino/.test(v), 'sem peso anotado não mostra volume');
console.log(errs.length?'ERROS: '+errs.join(' | '):'tudo certo'); await b.close(); process.exit(errs.length?1:0);
