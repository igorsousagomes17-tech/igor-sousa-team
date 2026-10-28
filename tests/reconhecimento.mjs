import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({locale:'pt-BR',viewport:{width:375,height:812},serviceWorkers:'block'}); const p=await ctx.newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://app.local/?demo'); await p.waitForTimeout(500);
await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
await p.click('.tabs [data-go="treino"]'); await p.waitForTimeout(500);
await p.click('[data-go="treino"][data-arg="D"]'); await p.waitForTimeout(500);
const lista=(await p.innerText('.view')); console.log('ficha mostra:', /reconhecimento/i.test(lista), /15 reps leves/.test(lista)); if(!/15 reps leves/.test(lista)) errs.push('ficha sem linha de reconhecimento');
await p.click('#ini'); await p.waitForTimeout(600);
// vai pelos passos até achar o reconhecimento
const nomes=await p.$$eval('.passos button',bs=>bs.map(x=>x.textContent.trim())); console.log('pílulas:', nomes);
if(!nomes.includes('R')) errs.push('sem pílula R');
const idx=nomes.indexOf('R'); await p.click(`.passos button >> nth=${idx}`); await p.waitForTimeout(400);
const h=await p.innerText('h1'); console.log('passo R:', h, '|', (await p.innerText('.bloco')).replace(/\s+/g,' ').slice(0,200));
if(!/reconhecimento/i.test(h)) errs.push('título sem reconhecimento');
// o exercício válido vem logo depois, com as 3 séries
await p.click(`.passos button >> nth=${idx+1}`); await p.waitForTimeout(400); console.log('próximo:', await p.innerText('h1'), (await p.$$('.set')).length,'séries');
console.log('erros:', errs); await b.close(); if (errs.length) process.exit(1);
