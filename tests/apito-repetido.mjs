import { chromium } from 'playwright';
const APP=process.env.APP;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({serviceWorkers:'block'})).newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
await p.goto('http://app.local/?demo'); await p.waitForTimeout(800);
const r=await p.evaluate(async()=>{ const {chipDescanso:c}=await import('/js/ui.js'); const out=[]; const op=HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play=function(){ window.__au=this; if(!this.__l){this.__l=1; this.addEventListener('ended',()=>out.push('ENDED@'+this.currentTime.toFixed(1)));} return op.call(this); };
  for(let k=0;k<3;k++){ c.atualiza(3,3,'Descanso','x',3); await new Promise(r=>setTimeout(r,800)); const a=[...document.querySelectorAll('audio')]; out.push('rodada '+k+' t='+window.__au?.currentTime.toFixed(1)+' paused='+window.__au?.paused);
    await new Promise(r=>setTimeout(r,3200)); out.push('alarme='+c.alarme()); await new Promise(r=>setTimeout(r,2600)); }
  return out; });
console.log(r.join(' | '));
// instrument: check currentTime progression
const r2=await p.evaluate(async()=>{ const {chipDescanso:c}=await import('/js/ui.js'); const orig=window.Audio; let ref; c.para(); return 'ok'; });
console.log(r2); await b.close();
