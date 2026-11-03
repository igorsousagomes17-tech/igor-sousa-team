// Excluir conta (exigência das lojas), modo demo: W=360 OUT=/tmp/shots node tests/excluir-conta.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [], ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA ') + m); if (!c) errs.push(m); };
const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: +(process.env.W || 360), height: 780 }, serviceWorkers: 'block', hasTouch: true, isMobile: true });
const p = await ctx.newPage();
await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }).catch(() => r.abort()); } return r.abort(); });
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
const w = ms => p.waitForTimeout(ms);
const entrar = async email => { await p.goto('http://app.local/?demo'); await w(500); if (await p.locator('text=ENTRAR').count()) { await p.click('text=ENTRAR'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await w(1200); } for (let i = 0; i < 4 && await p.locator('#overlay .modal, .tour').count(); i++) { await p.keyboard.press('Escape'); await w(300); } };
const perfil = async () => { const l = p.locator('[data-go="perfil"]:visible').first(); if (await l.count()) await l.click(); else await p.evaluate(() => { location.hash = '#perfil'; }); await w(700); };

// Admin não vê o botão
await entrar('igor@demo.com'); await perfil();
ok(await p.locator('#delConta').count() === 0, 'admin: sem "Excluir minha conta"' + (await p.locator('#out').count() ? '' : ' (painel, Perfil não aberto)'));
await p.evaluate(() => localStorage.clear());

// Aluna
await entrar('ana@demo.com'); await perfil();
ok(await p.locator('#delConta').count() === 1, 'aluna: "Excluir minha conta" no Perfil');
await p.locator('#delConta').scrollIntoViewIfNeeded(); await p.screenshot({ path: D + '/excluir-1-perfil.png' });
await p.click('#delConta'); await w(400);
ok(await p.locator('#fx').count() === 1, 'abre a confirmação');
await p.screenshot({ path: D + '/excluir-2-confirmar.png' });
await p.click('#c'); await w(300); ok(await p.locator('#fx').count() === 0, 'cancelar fecha sem excluir');
await p.click('#delConta'); await w(400);
await p.click('#s'); await w(300); ok(await p.isVisible('#e'), 'sem senha: pede a senha');
await p.fill('#x0', 'qualquer'); await p.click('#s'); await w(1500);
ok(await p.locator('text=ENTRAR').count() > 0 || await p.locator('#em').count() > 0, 'depois de excluir: volta pra tela de entrada');
await p.screenshot({ path: D + '/excluir-3-saiu.png' });

await b.close();
if (errs.length) { console.log('\n' + errs.join('\n')); process.exit(1); }
console.log('\nTudo certo.');
