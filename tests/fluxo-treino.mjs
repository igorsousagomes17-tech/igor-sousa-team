import { chromium } from 'playwright';
import path from 'path'; const APP=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'); const D=process.env.OUT||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,serviceWorkers:'block'}); const p=await ctx.newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>{errs.push('DIALOG '+d.message()); d.dismiss();});
let n=0; const shot=async t=>{await p.waitForTimeout(400); await p.screenshot({path:`${D}/${String(++n).padStart(2,'0')}-${t}.png`});};
const txt=async s=>(await p.innerText(s)).replace(/\s+/g,' ').slice(0,160);
await p.goto('http://app.local/?demo'); await p.waitForTimeout(500);
await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(900);
console.log('home:', await txt('.view')); await shot('home');
await p.click('.tabs [data-go="treino"]'); await p.waitForTimeout(500); console.log('aba treino:', await txt('h1'));
await p.click('[data-go="treino"][data-arg="A"]'); await p.waitForTimeout(400); await p.click('#ini'); await p.waitForTimeout(600);
console.log('passo1:', await txt('.restHint')); await shot('mobilidade');
await p.click('.rest.tm'); await p.waitForTimeout(800); await shot('timer-trabalho'); await p.click('#rest-skip'); await p.waitForTimeout(900);
console.log('apos mobilidade:', await txt('.row.between'));
await shot('biset');
// bi-set: kg digitado na série 1 do A2 (reps fixas) copia pras próximas; no A1 (pirâmide 12/10/8) não copia
await p.fill('.set[data-i="2"][data-k="0"] input[data-f="kg"]','30'); await p.fill('.set[data-i="1"][data-k="0"] input[data-f="kg"]','20'); await p.waitForTimeout(200);
const cop=await p.inputValue('.set[data-i="2"][data-k="1"] input[data-f="kg"]'), pir=await p.inputValue('.set[data-i="1"][data-k="1"] input[data-f="kg"]');
console.log('kg copiado s2:', cop, '| pirâmide não copia:', pir===''); if(cop!=='30'||pir!=='') errs.push('copia de kg errada');
await p.click('.set[data-i="1"][data-k="0"] .rest'); await p.waitForTimeout(500);
console.log('proxima pulsando:', await p.$eval('.rest.next', e=>e.closest('.set').dataset.i+'/'+e.closest('.set').dataset.k));
await p.click('.set[data-i="2"][data-k="0"] .rest'); await p.waitForTimeout(700); await shot('descanso');
await p.click('#rest-x'); await p.waitForTimeout(300); await shot('descanso-mini');
await p.reload(); await p.waitForTimeout(1200); console.log('apos reload:', await txt('.view')); await shot('reload');

console.log('retomou, serie feita?', await p.$eval('.set[data-i="1"][data-k="0"]', e=>e.className));
await p.goBack(); await p.waitForTimeout(600); console.log('voltar:', await p.evaluate(()=>location.hash), await txt('.view')); await shot('home-retomar');
await p.click('[data-go="sessao"]'); await p.waitForTimeout(500);
await p.click('#pular'); await p.waitForTimeout(400); console.log('pulou p/', await txt('h1'));
const sw=await p.$('.swap'); if(sw){ await sw.click(); await p.waitForTimeout(500); console.log('trocado:', await txt('h1')); await shot('trocado'); await p.click('.swap'); await p.waitForTimeout(500); console.log('desfeito:', await txt('h1')); }
await p.click('#prev'); await p.waitForTimeout(300); await p.click('#prev'); await p.waitForTimeout(300); console.log('anterior:', await txt('.row.between'));
await p.click('#fim'); await p.waitForTimeout(400); await shot('confirma-fim'); console.log('confirma:', await txt('#m h2'));
await p.click('#enc'); await p.waitForTimeout(500); await p.click('#env'); await p.waitForTimeout(300); console.log('sem nota:', await p.isVisible('#e'));
await p.click('#esf button >> nth=7'); await p.click('#nota button >> nth=9'); await shot('feedback'); await p.click('#env'); await p.waitForTimeout(800); await shot('card'); console.log('card:', await txt('.view'));
console.log('erros:', errs); await b.close(); if (errs.length) process.exit(1);
