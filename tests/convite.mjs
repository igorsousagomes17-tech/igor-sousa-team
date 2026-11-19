// Igor 19/11: cadastro por convite (transição do Mfit). Aluna cria a conta, faz anamnese e espera o Igor liberar.
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const W=+(process.env.W||360);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({locale:'pt-BR',viewport:{width:W,height:780},serviceWorkers:'block'}); const p=await ctx.newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const ok=(c,m)=>{ console.log((c?'OK   ':'FALHA ')+m); if(!c) errs.push(m); };
const txt = async () => (await p.evaluate(()=>document.body.textContent)).replace(/\s+/g,' ');
await p.goto('http://app.local/?demo'); await p.waitForTimeout(600);
ok(/Recebi o convite do Igor/i.test(await txt()), 'entrada mostra o botão do convite');
await p.click('text=Recebi o convite do Igor'); await p.waitForTimeout(400);
ok(/Seu cadastro no app/i.test(await txt()), 'abre a tela de cadastro');
// validações
await p.click('#cbt'); await p.waitForTimeout(200); ok(/nome completo/i.test(await p.innerText('#cerr')), 'pede nome completo');
await p.fill('#cn','Aline'); await p.click('#cbt'); await p.waitForTimeout(200); ok(/nome e sobrenome/i.test(await p.innerText('#cerr')), 'só o primeiro nome não passa');
await p.fill('#cn','Aline Martins Gontias'); await p.fill('#cw','6299'); await p.click('#cbt'); await p.waitForTimeout(200); ok(/WhatsApp/i.test(await p.innerText('#cerr')), 'WhatsApp curto não passa');
await p.fill('#cw','(62) 98221-3226'); await p.fill('#ce','aline@'); await p.click('#cbt'); await p.waitForTimeout(200); ok(/e-mail/i.test(await p.innerText('#cerr')), 'e-mail incompleto não passa');
await p.fill('#ce','ja@gmail.com'); await p.fill('#cs','123'); await p.click('#cbt'); await p.waitForTimeout(200); ok(/6 letras/i.test(await p.innerText('#cerr')), 'senha curta não passa');
await p.fill('#cs','senha123'); await p.click('#cbt'); await p.waitForTimeout(900); ok(/já tem cadastro/i.test(await p.innerText('#cerr')), 'e-mail repetido manda pro Entrar');
// cadastro certo → anamnese → espera
await p.fill('#ce','aline@gmail.com'); await p.click('#cbt'); await p.waitForTimeout(1600);
let t = await txt();
if(!/Falta só a anamnese/.test(t)) console.log('TELA:', t.slice(0,400)); ok(/Bem-vinda, Aline!/.test(t) && /Falta só a anamnese/.test(t), 'depois do cadastro pede a anamnese');
ok(!/Bora, Aline/.test(t) && !/Treino A/.test(t), 'ainda não vê o treino');
// tentar ir pro início pelo endereço não pula a espera
await p.evaluate(()=>{ location.hash='#home'; dispatchEvent(new PopStateEvent('popstate',{state:{name:'home'}})); }); await p.waitForTimeout(600);
ok(/Falta só a anamnese/.test(await txt()), 'voltar/endereço não abre o início antes de liberar');
// anamnese pronta → tela de espera (simula como se já tivesse respondido)
await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('demo:state')); s.perfil.anamnese_em=new Date().toISOString(); s.perfil.objetivo='hipertrofia'; localStorage.setItem('demo:state',JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(1200);
t = await txt(); ok(/Cadastro recebido/.test(t) && /Avisar o Igor no WhatsApp/.test(t), 'com anamnese: tela de espera com WhatsApp do Igor');
await p.click('#atuC'); await p.waitForTimeout(1200); ok(/Cadastro recebido/.test(await txt()), 'atualizar sem liberação continua esperando');
// Igor libera → entra no app
await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('demo:state')); s.perfil.ativa=true; s.perfil.aguardando=false; localStorage.setItem('demo:state',JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(1500);
{ const tt=await txt(); if(!/Bora, Aline/i.test(tt)) console.log('TELA:', tt.slice(0,300)); ok(/Bora, Aline/i.test(tt), 'liberada: abre o início'); }
// painel do Igor: lista os cadastros novos e libera com plano
await p.evaluate(()=>localStorage.clear()); await p.goto('http://app.local/?demo'); await p.waitForTimeout(600);
await p.click('text=ENTRAR'); await p.fill('#em','igor@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(1500);
t = await txt(); ok(/Cadastros novos pelo convite/.test(t) && /Aline Martins \(convite\)/.test(t), 'painel mostra os cadastros novos');
await p.click('[data-libera="c1"]'); await p.waitForTimeout(300); ok(/Liberar Aline/.test(await txt()), 'liberar pergunta o plano');
await p.click('[data-pl="basico"]'); await p.waitForTimeout(1500); t = await txt();
ok(!/Aline Martins \(convite\)/.test(t) && /Bruna Oliveira \(convite\)/.test(t), 'liberada sai da lista');
await p.click('[data-dispensa="c2"]'); await p.waitForTimeout(300); await p.click('#ok'); await p.waitForTimeout(1500);
ok(!/Cadastros novos pelo convite/.test(await txt()), '"não é aluna" tira da lista');
const sw = await p.evaluate(()=>document.documentElement.scrollWidth); ok(sw <= W, `sem rolagem lateral em ${W}px`);
console.log(errs.length?'ERROS: '+errs.join(' | '):'tudo certo'); await b.close(); process.exit(errs.length?1:0);
