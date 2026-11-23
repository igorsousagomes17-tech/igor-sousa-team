// 23/11 (Nicolle): no app das lojas, fora do app (WhatsApp) o fim do descanso não avisava. Agora agenda notificação do celular.
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({locale:'pt-BR',viewport:{width:375,height:780},serviceWorkers:'block'}); const p=await ctx.newPage();
await ctx.addInitScript(()=>{ window.__ln=[]; window.Capacitor={ isNativePlatform:()=>true, Plugins:{ LocalNotifications:{
  checkPermissions: async()=>({display:'granted'}), requestPermissions: async()=>({display:'granted'}),
  schedule: async o=>{ window.__ln.push(['schedule',o.notifications[0]]); }, cancel: async o=>{ window.__ln.push(['cancel',o.notifications[0].id]); } } } }; });
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const ok=(c,m)=>{ console.log((c?'OK   ':'FALHA ')+m); if(!c) errs.push(m); };
await p.goto('http://app.local/?demo'); await p.waitForTimeout(500);
await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(1200);
await p.evaluate(()=>{ history.pushState({name:'treino',arg:null},'','#treino'); dispatchEvent(new PopStateEvent('popstate',{state:history.state})); }); await p.waitForTimeout(1200); await p.click('#ini'); await p.waitForTimeout(1000); await p.click('#recOk').catch(()=>{});
const t0=Date.now(); await p.locator('.rest').first().click(); await p.waitForTimeout(600);
let ln=await p.evaluate(()=>window.__ln); const ag=ln.find(x=>x[0]==='schedule');
ok(!!ag, 'agendou a notificação do celular ao começar o descanso');
ok(ag && /Descanso acabou/.test(ag[1].title), 'título "Descanso acabou"');
const at = ag ? new Date(ag[1].schedule.at).getTime() : 0; ok(at - t0 > 20000 && at - t0 < 200000, 'marcada pro fim do descanso');
await p.click('#rest-skip'); await p.waitForTimeout(400); ln=await p.evaluate(()=>window.__ln);
ok(ln.some(x=>x[0]==='cancel' && x[1]===ag[1].id), 'pulou o descanso: cancela a notificação');
console.log(errs.length?'ERROS: '+errs.join(' | '):'tudo certo'); await b.close(); process.exit(errs.length?1:0);
