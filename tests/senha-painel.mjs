// 13/11: Igor (admin) não tinha onde trocar a própria senha; agora tem "Trocar minha senha" no painel e "Zerar senha" na aluna
import { chromium } from 'playwright';
import path from 'path'; const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'); const OUT=process.env.OUT||'/tmp/shots';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await (await b.newContext({locale:'pt-BR',viewport:{width:+(process.env.W||360),height:780},serviceWorkers:'block'})).newPage();
await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname; return r.fulfill({path:APP+f}); } return r.abort(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>{errs.push('pop-up: '+d.message()); d.dismiss();}); const ok=(c,m)=>{ console.log((c?'OK   ':'FALHA ')+m); if(!c) errs.push(m); };
await p.goto('http://app.local/?demo'); await p.waitForTimeout(600);
await p.click('text=ENTRAR'); await p.fill('#em','igor@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(1500);
ok(await p.locator('#minhaSenha').count()===1, 'painel tem "Trocar minha senha"');
await p.click('#minhaSenha'); await p.waitForTimeout(300);
await p.fill('#n0','demo1234'); await p.fill('#n1','abc'); await p.fill('#n2','abc'); await p.click('#s'); await p.waitForTimeout(200);
ok(/pelo menos 6/i.test(await p.innerText('#e')), 'senha curta: avisa');
await p.fill('#n1','novaSenha9'); await p.fill('#n2','novaSenha8'); await p.click('#s'); await p.waitForTimeout(200);
ok(/não estão iguais/i.test(await p.innerText('#e')), 'senhas diferentes: avisa');
await p.fill('#n2','novaSenha9'); await p.screenshot({path:OUT+'/senha-admin.png'}); await p.click('#s'); await p.waitForTimeout(1200);
ok(/Senha trocada/i.test(await p.innerText('body')), 'troca a senha do Igor');
// zerar senha de uma aluna
await p.click('#ir-alunas'); await p.waitForTimeout(800);
const linha = p.locator('[data-aluna]').first(); if (await linha.count()) { await linha.click(); await p.waitForTimeout(800); }
const ac = p.locator('[data-ac]').first(); if (await ac.count()) { await ac.click(); await p.waitForTimeout(800); }
ok(await p.locator('#zera').count()===1, 'acesso da aluna tem "Zerar senha"');
if (await p.locator('#zera').count()) { await p.click('#zera'); ok(/confirmar/i.test(await p.innerText('#zera')), 'pede confirmação (2º toque)'); await p.click('#zera'); await p.waitForTimeout(800);
  ok(/Senha zerada/i.test(await p.innerText('body')), 'zera e mostra a senha nova (WhatsApp)'); ok(await p.locator('a.btn.wa').count()>=1, 'botão de avisar no WhatsApp'); await p.screenshot({path:OUT+'/senha-zerada.png'}); }
console.log(errs.length?'ERROS: '+errs.join(' | '):'tudo certo'); await b.close(); process.exit(errs.length?1:0);
