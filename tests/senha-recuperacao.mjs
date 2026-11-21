// 21/11: aluna veio pelo link "Esqueci minha senha" e caiu na tela "Bem-vinda" (1º acesso). O pop-up "Cria sua nova senha"
// não salvava: lia os campos da tela de trás (ids repetidos). Aqui: tela de 1º acesso + pop-up de recuperação por cima → salva.
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const W=+(process.env.W||375);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({locale:'pt-BR',viewport:{width:W,height:780},serviceWorkers:'block'}); const p=await ctx.newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const ok=(c,m)=>{ console.log((c?'OK   ':'FALHA ')+m); if(!c) errs.push(m); };
await p.goto('http://app.local/?demo'); await p.waitForTimeout(500);
await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(1200);
await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('demo:state')); s.perfil.senha_trocada=false; localStorage.setItem('demo:state',JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(1200);
ok(/Bem-vinda/i.test(await p.textContent('body')), 'tela de 1º acesso aberta');
await p.evaluate(()=>window.__authCbs.forEach(f=>f('PASSWORD_RECOVERY'))); await p.waitForTimeout(400);
ok(await p.isVisible('#rfs'), 'pop-up "Cria sua nova senha" por cima');
await p.fill('#rn1','ludi123'); await p.fill('#rn2','ludi124'); await p.click('#rs'); await p.waitForTimeout(300);
ok(await p.isVisible('#re') && /iguais|não confere|diferente/i.test(await p.textContent('#re')), 'senhas diferentes: erro aparece dentro do pop-up');
await p.fill('#rn2','ludi123'); await p.click('#rs'); await p.waitForTimeout(1500);
ok(!(await p.isVisible('#rfs')), 'salvou e fechou o pop-up');
const st=await p.evaluate(()=>JSON.parse(localStorage.getItem('demo:state')).perfil.senha_trocada); ok(st===true, 'senha marcada como trocada');
ok(!/Sua senha de agora é o seu WhatsApp/.test(await p.textContent('body')), 'não volta pra tela de criar senha');
// a tela de 1º acesso sozinha continua salvando
await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('demo:state')); s.perfil.senha_trocada=false; localStorage.setItem('demo:state',JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(1200);
await p.fill('#n1','ludi123'); await p.fill('#n2','ludi123'); await p.click('#s'); await p.waitForTimeout(1500);
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('demo:state')).perfil.senha_trocada)===true, 'tela de 1º acesso (sem pop-up) também salva');
console.log(errs.length?'ERROS: '+errs.join(' | '):'tudo certo'); await b.close(); process.exit(errs.length?1:0);
