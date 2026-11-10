// Fila sem sinal: (A) erro do banco que se repete não cria sessão nova a cada volta; (B) 4G lento que chega depois do limite não vira 2 sessões; (C) pontos recusados saem da fila
import { chromium } from 'playwright'; import path from 'path';
import fs from 'fs';
const APP=process.env.APP||path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[];
async function abre(patch){
  const ctx=await b.newContext({locale:'pt-BR',viewport:{width:375,height:800},serviceWorkers:'block'}); const p=await ctx.newPage();
  await p.route('**/*', r=>{ const u=new URL(r.request().url()); if(u.hostname==='app.local'){ const f=u.pathname==='/'?'/index.html':u.pathname;
    if(f==='/js/db-mock.js'){ let src=fs.readFileSync(APP+f,'utf8'); src=patch(src); return r.fulfill({body:src,contentType:'text/javascript'}); }
    return r.fulfill({path:APP+f}); } return r.abort(); });
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); await p.click('text=ENTRAR'); await p.fill('#em','ana@demo.com'); await p.press('#pw','Enter'); await p.waitForTimeout(1200);
  return {p,ctx};
}
const item={uid:'t1',dono:'demo',em:Date.now()-3600e3,s:{titulo:'Treino Z',total:2},sid:null,seriesOk:false,series:[{exercicio_nome:'Agachamento',n:1,kg:20,reps:10,feita:true}],patch:{duracao_s:1800,exercicios_feitos:2,exercicios_total:2,finalizada_em:new Date().toISOString()}};
const abertas=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('demo:state')).sessoes.filter(s=>s.titulo==='Treino Z').length);
// A
{ const {p,ctx}=await abre(s=>s.replace('export async function salvarSeries(sessaoId, rows) {','export async function salvarSeries(sessaoId, rows) { throw new Error("insert or update violates check constraint");'));
  await p.evaluate(it=>{ localStorage.setItem('demo:fila',JSON.stringify([it])); },item);
  for(let k=0;k<5;k++){ await p.evaluate(()=>dispatchEvent(new Event('online'))); await p.waitForTimeout(400); }
  const n=await abertas(p); console.log('A sessões criadas:',n); if(n>1) errs.push('A: '+n+' sessões abertas sobrando');
  const f=await p.evaluate(()=>JSON.parse(localStorage.getItem('demo:fila')||'[]').length); if(f!==1) errs.push('A: treino sumiu da fila'); await ctx.close(); }
// B
{ const {p,ctx}=await abre(s=>s.replace('export async function iniciarSessao(_, {','let __n=0; export async function iniciarSessao(_, a) { if(!__n++){ await new Promise(r=>setTimeout(r,16500)); } return __ini(_, a); }\nasync function __ini(_, {'));
  await p.evaluate(it=>{ localStorage.setItem('demo:fila',JSON.stringify([it])); },item);
  await p.evaluate(()=>dispatchEvent(new Event('online'))); await p.waitForTimeout(17500);
  await p.evaluate(()=>dispatchEvent(new Event('online'))); await p.waitForTimeout(1500);
  const n=await abertas(p); const f=await p.evaluate(()=>JSON.parse(localStorage.getItem('demo:fila')||'[]').length); console.log('B sessões:',n,'fila:',f); if(n!==1) errs.push('B: '+n+' sessões (esperado 1)'); if(f) errs.push('B: ficou na fila'); await ctx.close(); }
// C
{ const {p,ctx}=await abre(s=>s.replace('export async function registrarPontos(_, motivo, pontos, ref) {','export async function registrarPontos(_, motivo, pontos, ref) { throw new Error("new row violates row-level security policy");'));
  await p.evaluate(()=>localStorage.setItem('demo:fila',JSON.stringify([{uid:'p1',dono:'demo',tipo:'pontos',motivo:'story',pontos:30,ref:'2026-10-01'}])));
  for(let k=0;k<4;k++){ await p.evaluate(()=>dispatchEvent(new Event('online'))); await p.waitForTimeout(400); }
  const f=await p.evaluate(()=>JSON.parse(localStorage.getItem('demo:fila')||'[]').length); console.log('C fila:',f); if(f) errs.push('C: pontos recusados presos na fila'); await ctx.close(); }
console.log('erros:',errs); await b.close(); if(errs.length) process.exit(1);
