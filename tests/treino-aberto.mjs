// Treino esquecido aberto: 1h30 depois de começar, ao abrir o app pergunta se já terminou (1 vez); "finalizar" leva pro fim.
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[];
const ctx=await b.newContext({locale:'pt-BR',viewport:{width:375,height:800},serviceWorkers:'block'}); const p=await ctx.newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
await p.click('.tabs [data-go="treino"]'); await p.waitForTimeout(500); await p.click('#ini'); await p.waitForTimeout(800);
// finge que começou há 2 h (antes do app carregar, senão ele regrava a sessão ao sair)
await ctx.addInitScript(() => { if (sessionStorage.getItem('fingiu')) return; sessionStorage.setItem('fingiu', '1'); for (const k of ['demo:sessao','sessao']) { const s=JSON.parse(localStorage.getItem(k)||'null'); if(!s) continue; const t=Date.now()-2*3600000; s.chave='local-'+t; s.inicio=t; s.ult=Date.now()-100*60000; localStorage.setItem(k,JSON.stringify(s)); } });
await p.reload(); await p.waitForTimeout(1800);
const m=await p.isVisible('#m'); const txt=m?(await p.innerText('#m')).replace(/\s+/g,' '):''; console.log('pergunta:', txt.slice(0,140));
if(!/terminou o treino/i.test(txt)) errs.push('não perguntou');
await p.click('text=Já terminei, finalizar'); await p.waitForTimeout(800); console.log('rota:', await p.evaluate(()=>location.hash));
if(await p.evaluate(()=>location.hash)!=='#fim') errs.push('não foi pro fim');
await p.reload(); await p.waitForTimeout(1500); if (await p.isVisible('#m') && /terminou o treino/i.test(await p.innerText('#m'))) errs.push('perguntou de novo');
console.log('erros:',errs); await b.close(); if(errs.length) process.exit(1);
