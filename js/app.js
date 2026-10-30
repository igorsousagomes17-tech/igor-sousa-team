const C0 = window.ISTEAM_CONFIG;
const DEMO = !!(C0.DEMO || new URLSearchParams(location.search).has('demo'));
const db = DEMO ? await import('./db-mock.js') : await import('./db.js');
import { ligarAvisoRemoto, beep, $, $$, esc, toast, fecharToast, overlay, closeOverlay, fmtMin, hoje, primeiroNome, fmtData, videoModal, restTimer, tabs, cardImagem, pararDescanso, congelarTrabalho, descansoAtivo, minimizarDescanso, campoSenha, traduzErro, semCarga, marcarSemPeso, semPesoMarcado, trabalhoFim, abrirTimer, encerrarTrabalho, avisoAtual, ajustaAbas } from './ui.js';
import { t, t as T, tp, num, dec, dataLocal, idioma, setIdioma, IDIOMAS, infoIdioma, loc, tc, tlivre, ligarTradutor } from './i18n.js';
import * as A from './acolhe.js';
import { equivalentes } from './conteudo.js';
import * as K from './kcal.js'; // T = t, pra quando "t" já é nome de variável

const C = window.ISTEAM_CONFIG;
const app = $('#app');
const S = { user: null, perfil: null, plano: null, programas: null, sessao: null };

// Versão nova do app: o celular baixa em segundo plano e, quando ela assume, recarrega sozinho (no máximo 1 vez).
// Sem isso o app instalado continuava mostrando a versão antiga até fechar e abrir 2 vezes.
const TELA_CALMA = /^(#(home|entrada|login|treino|videos|pontos|evolucao|perfil|comunidade|lib)?)$/; let recarregarDepois = false;
if ('serviceWorker' in navigator) {
  const tinha = !!navigator.serviceWorker.controller; let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!tinha || recarregou) return; recarregou = true; if (!TELA_CALMA.test(location.hash) || document.querySelector('.modal')) { recarregarDepois = true; return; } location.reload(); }); // no meio do treino, da aula, do card ou da anamnese: espera ela voltar pra uma aba
  navigator.serviceWorker.register('sw.js').then(r => { r.update().catch(() => {}); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') r.update().catch(() => {}); }); }).catch(() => {});
}
// O que a 1ª abertura baixou antes do SW assumir (demo, capas, fontes) também fica guardado pra abrir sem sinal
if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(r => setTimeout(() => { try { const urls = performance.getEntriesByType('resource').map(x => x.name).filter(u => { try { const h = new URL(u); return (h.origin === location.origin && !/sw\.js/.test(h.pathname)) || /fonts\.(googleapis|gstatic)\.com$/.test(h.hostname); } catch { return false; } }); r.active?.postMessage({ tipo: 'guardar', urls: [...new Set(urls)] }); } catch {} }, 4000)).catch(() => {});

// ROTEADOR ----------------------------------------------------------------
const routes = {};
let pararSpin = null; // aula de spinning rodando (para quando ela sai da tela)
// Cada tela entra no histórico do navegador: o "voltar" do celular volta pra tela anterior em vez de fechar o app.
let rotaAtual = null, argAtual = null, voltarOverlay = null, duvidaNoTreino = false, cancelarPopup = null;
// Resposta rápida no 4G ruim: se o banco demorar, segue com o que tem guardado no celular.
// Plano, programas, recado e desafio quase não mudam: no 4G, cada toque no Início não baixa tudo de novo (no máximo a cada 3 min)
const fresco = {};
const cache3 = (k, fn) => { const c = fresco[k]; if (c && Date.now() - c.t < 180000) return Promise.resolve(c.v); return fn().then(v => { if (v != null) fresco[k] = { t: Date.now(), v }; return v; }); };
const rapido = (p, fb, ms = 5000) => Promise.race([Promise.resolve(p).catch(() => fb), new Promise(r => setTimeout(() => r(fb), ms))]).then(v => v ?? fb);
function go(name, arg, { hist = true } = {}) {
  if (!routes[name]) name = 'home';
  if (recarregarDepois && TELA_CALMA.test('#' + name) && !document.querySelector('.modal')) { recarregarDepois = false; history.replaceState({ name, arg: null }, '', '#' + name); return location.reload(); } // versão nova chegou no meio de algo: atualiza na próxima aba
  if (!S.perfil && !['entrada', 'login'].includes(name)) name = 'entrada';
  if (S.perfil?.senha_trocada === false && S.perfil.role !== 'admin' && !['entrada', 'login'].includes(name)) { fecharToast(); return criarSenha(); } // 1º acesso: voltar/URL não pula a troca da senha
  fecharToast(); A.fecharPasseio(); if (name !== 'spinAula') { pararSpin?.(); pararSpin = null; }
  // "? Dúvida" no meio do treino: abre o tira-dúvidas sem pausar o treino nem matar o descanso (só minimiza)
  if (rotaAtual === 'sessao' && name === 'assistente' && S.sessao) { duvidaNoTreino = true; clearInterval(clockIv); minimizarDescanso(); }
  else if ((['sessao', 'fim'].includes(rotaAtual) || duvidaNoTreino) && !['sessao', 'fim'].includes(name)) { duvidaNoTreino = false; sairDaSessao(); }
  else if (['sessao', 'fim'].includes(name)) duvidaNoTreino = false;
  arg = arg ?? null;
  const st = { name, arg };
  if (hist) { const igual = name === rotaAtual && (arg === argAtual || name === 'treino'); /* trocar de treino na aba Treino não empilha (voltar sai da aba) */ if (rotaAtual === null || igual || ['entrada', 'login'].includes(rotaAtual) && name !== 'login') history.replaceState(st, '', '#' + name); else history.pushState(st, '', '#' + name); }
  rotaAtual = name; argAtual = arg;
  $$('.tabs .tab').forEach(t => t.classList.toggle('on', t.dataset.go === name)); // acende a aba na hora, antes de carregar
  window.scrollTo(0, 0); Promise.resolve(routes[name](arg)).then(() => { if (rotaAtual === name) window.scrollTo(0, 0); });
}
// Dia/mês no fuso do celular (nunca toISOString, que é Londres: treino às 22h caía no dia/mês seguinte)
const diaLocal = (d = new Date()) => { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const mesLocal = (d = new Date()) => diaLocal(d).slice(0, 7);
const comLimite = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('lento')), ms))]);
const repoe = () => history.pushState({ name: rotaAtual, arg: argAtual }, '', '#' + rotaAtual);
window.addEventListener('popstate', ev => {
  if (voltarOverlay) { voltarOverlay(); return repoe(); } // anamnese: voltar = pergunta anterior
  if ($('#overlay').innerHTML) { closeOverlay(); const c = cancelarPopup; cancelarPopup = null; c?.(); return repoe(); } // voltar fecha pop-up primeiro (pergunta aberta = cancelada)
  if (minimizarDescanso()) return repoe(); // descanso aberto: voltar só minimiza, o tempo continua
  if (rotaAtual === 'spinAula' && $('#sPausa') && !$('#sPausa').disabled) { $('#sSair').click(); return repoe(); } // aula rodando: voltar pergunta (não perde a aula)
  const st = ev.state || { name: S.perfil ? 'home' : 'entrada' };
  if (!S.perfil && !['entrada', 'login'].includes(st.name)) return go('entrada', null, { hist: false });
  if (S.perfil && ['entrada', 'login'].includes(st.name)) { history.replaceState({ name: 'home', arg: null }, '', '#home'); return go('home', null, { hist: false }); }
  const avisaPausa = rotaAtual === 'sessao' && S.sessao && st.name !== 'sessao' && st.name !== 'fim';
  go(st.name, st.arg, { hist: false });
  if (avisaPausa) toast(t('Treino pausado. Tá tudo salvo: é só tocar em Continuar.'));
});
// Pergunta simples no estilo do app (sem pop-up do navegador)
// Pop-up com várias opções (a 1ª em destaque, a última discreta). Resolve o índice escolhido.
function escolher(titulo, texto, opcoes) {
  return new Promise(res => {
    overlay(`<div class="modal" id="m"><div class="box" style="padding:18px;display:flex;flex-direction:column;gap:12px"><h2>${esc(titulo)}</h2><p class="muted">${esc(texto)}</p>${opcoes.map((o, i) => i === opcoes.length - 1 && opcoes.length > 2 ? `<button class="link-fim" data-o="${i}" style="margin-top:0">${esc(o)}</button>` : `<button class="btn sm ${i ? 'ghost' : ''}" data-o="${i}">${esc(o)}</button>`).join('')}</div></div>`);
    cancelarPopup = () => res(-1); // voltar do celular: -1
    $$('#m [data-o]').forEach(b => b.onclick = () => { cancelarPopup = null; closeOverlay(); res(+b.dataset.o); });
  });
}
function perguntar(titulo, texto, sim, nao) {
  return new Promise(res => {
    overlay(`<div class="modal" id="m"><div class="box" style="padding:18px;display:flex;flex-direction:column;gap:12px"><h2>${esc(titulo)}</h2><p class="muted">${esc(texto)}</p><button class="btn sm" id="q-s">${esc(sim)}</button><button class="btn ghost sm" id="q-n">${esc(nao)}</button></div></div>`);
    cancelarPopup = () => res(null); // voltar do celular: null (nem sim nem não)
    $('#q-s').onclick = () => { cancelarPopup = null; closeOverlay(); res(true); }; $('#q-n').onclick = () => { cancelarPopup = null; closeOverlay(); res(false); };
  });
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go, g.dataset.arg); }
  const v = e.target.closest('[data-vid]'); if (v) videoModal(v.dataset.vid, v.dataset.url, v.dataset.dica);
});
// Altura real das abas (com letra grande elas crescem): a barra do chat e os avisos ficam logo acima, sem fresta
// Capas dos programas só baixam quando aparecem na tela (o Início não gasta 84 KB com o que ela nem rolou até ver)
let obsCapa = null;
function capasQuandoAparecer() { const els = $$('[data-bg]'); if (!els.length) return; const poe = el => { el.style.backgroundImage = `url(${el.dataset.bg})`; el.removeAttribute('data-bg'); };
  if (!('IntersectionObserver' in window)) return els.forEach(poe); obsCapa?.disconnect(); obsCapa = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { poe(x.target); obsCapa.unobserve(x.target); } }), { rootMargin: '200px' }); els.forEach(el => obsCapa.observe(el)); }
function render(html, tab) { app.innerHTML = html + (tab ? tabs(tab) : ''); if (tab) ajustaAbas(); capasQuandoAparecer(); const tb = tab && app.querySelector('.tabs'); if (tb) document.documentElement.style.setProperty('--tabsH', tb.offsetHeight + 'px'); }

// STREAK semanal: semanas seguidas com pelo menos 1 treino (contadas em dias pra exibir)
function streakDias(sessoes) {
  sessoes = sessoes.filter(s => treinoCompleto(s)); // decisão do Igor: só treino completo conta (igual meta e desafio)
  const dias = new Set(sessoes.map(s => diaLocal(s.finalizada_em)));
  let n = 0, d = new Date();
  for (let i = 0; i < 400; i++) { const k = diaLocal(d); if (dias.has(k)) n++; else if (i > 0 && n > 0 && !dias.has(k)) { /* tolera dias sem treino dentro da semana */ } d.setDate(d.getDate() - 1); if (i > 7 && n === 0) break; }
  // simplificação v1: dias com treino nos últimos 30 dias contínuos sem semana vazia
  const semanas = new Set(sessoes.map(s => isoWeek(new Date(s.finalizada_em))));
  // Semana atual ainda sem treino (segunda de manhã) não zera a sequência: conta a partir da semana passada
  let k = semanas.has(isoWeek(new Date())) ? 0 : 1, count = 0, w = isoWeek(new Date(Date.now() - k * 7 * 86400000));
  while (semanas.has(w)) { count++; w = isoWeek(new Date(Date.now() - (count + k) * 7 * 86400000)); }
  return { dias: n, semanas: count };
}
const fogo = st => '🔥 ' + tp(st.semanas, '{n} semana', '{n} semanas');
// "Treino A" é o nome gravado no banco (fica em português); na tela aparece no idioma dela.
const nomeTreino = x => String(x || '').replace(/^Treino ([A-Z])$/, (_, l) => t('Treino {l}', { l }));
// Programa extra ("Fortalecimento pra corrida · Base 1 · pernas e core") → só "Base 1" onde falta espaço
const nomeCurto = x => /^Treino [A-Z]$/.test(x || '') ? nomeTreino(x) : (String(x || '').split(' · ')[1] || String(x || ''));
// Título de capa sem quebrar palavra no meio: diminui a letra até a maior palavra caber
// Em rem: com a letra grande do celular, o título cresce junto (mínimo 14 px)
const tamTitulo = (txt, largura, base) => { const L = Math.max(...String(txt || '').split(/\s+/).map(w => w.length), 1); return (Math.min(base, Math.max(14, largura / (L * 0.64))) / 16).toFixed(3) + 'rem'; };
// Seletor de idioma (Perfil e tela de entrada): trocar re-desenha a tela atual na hora.
function escolherIdioma() {
  overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:8px"><h2>🌐 ${t('Idioma')}</h2><div class="opcoes">${IDIOMAS.map(i => `<button type="button" class="opc ${i.id === idioma() ? 'on' : ''}" data-l="${i.id}" lang="${i.id}"><span style="font-size:1.25rem;margin-right:8px">${i.flag}</span>${i.nome}</button>`).join('')}</div><button class="btn ghost sm" id="lc" style="margin-top:4px">${t('Fechar')}</button></div></div>`);
  $('#lc').onclick = closeOverlay; $('#m').addEventListener('click', x => { if (x.target.id === 'm') closeOverlay(); });
  $$('[data-l]').forEach(b => b.onclick = () => { setIdioma(b.dataset.l); closeOverlay(); if (rotaAtual && routes[rotaAtual]) routes[rotaAtual](argAtual); });
}
const botaoIdioma = () => { const i = infoIdioma(); return `<button class="langbtn" id="lang" aria-label="Idioma / Language"><span>${i.flag}</span> ${i.id.toUpperCase()}</button>`; };
function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-${Math.ceil((((t - y) / 86400000) + 1) / 7)}`; }

// ENTRADA / LOGIN ---------------------------------------------------------
routes.entrada = () => { render(`<div class="view noTabs">${botaoIdioma()}<div class="hero-entrada"><img src="icons/igor_s.jpg" alt="Igor Sousa">
  <div class="c"><div class="logo big">IGOR<br>SOUSA <b>TEAM</b></div><p class="muted">${t('Treino, comunidade e evolução. Tudo no seu celular.')}</p>
  <button class="btn" data-go="login">${t('Entrar')}</button><a class="btn ghost" href="${esc(C.KIWIFY_CHECKOUT)}" target="_blank" rel="noopener">${t('Sou nova, quero começar')}</a></div></div></div>`); $('#lang').onclick = escolherIdioma; };

routes.login = () => {
  render(`<div class="view noTabs"><div class="topbar"><button class="back" data-go="entrada">‹ ${t('Voltar')}</button>${botaoIdioma().replace('langbtn', 'langbtn inline')}</div>
  <div class="logo big" style="font-size:2.125rem;margin-top:24px">IGOR<br>SOUSA <b>TEAM</b></div>
  <form id="f" novalidate style="display:flex;flex-direction:column;gap:14px">
    ${DEMO ? `<div class="card" style="padding:10px 14px"><p class="muted small"><b style="color:var(--fg)">${t('Modo demonstração.')}</b> ${t('Já preenchi o seu acesso (painel do Igor). Pra ver como aluna, troca o e-mail por ana@demo.com.')}</p></div>` : ''}
    <div class="field"><label class="l" for="em">${t('E-mail')}</label><input class="input" id="em" type="email" autocomplete="username" inputmode="email" required value="${DEMO ? 'igor@demo.com' : ''}"></div>
    <div class="field"><label class="l" for="pw">${t('Senha')}</label><div class="senha"><input class="input" id="pw" type="password" autocomplete="current-password" required value="${DEMO ? 'demo1234' : ''}"><button type="button" class="olho">${t('mostrar')}</button></div><p class="muted small" style="margin-top:6px">${t('1ª vez? A senha é o seu WhatsApp, só os números com DDD (ex. 62999990000).')}</p></div>
    <p class="err" id="err" hidden></p>
    <button class="btn" id="bt">${t('Entrar')}</button>
    <button type="button" class="btn ghost sm" id="esq" style="width:100%">${t('Esqueci minha senha')}</button>
    <p class="muted center" style="margin-top:6px">${t('Ainda não é aluna?')} <a href="${esc(C.KIWIFY_CHECKOUT)}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 4px">${t('Assinar')}</a></p>
    <p class="muted center small">${t('Pagamento pela Kiwify. Confirmou, recebe o acesso no WhatsApp.')}</p></form></div>`);
  $('#lang').onclick = escolherIdioma;
  $('#f').onsubmit = async e => {
    e.preventDefault(); $('#err').hidden = true;
    const vazio = !$('#em').value.trim() ? ['#em', t('Digita seu e-mail.')] : !$('#pw').value ? ['#pw', t('Digita sua senha (1ª vez: seu WhatsApp, só números).')] : null;
    if (vazio) { $('#err').textContent = vazio[1]; $('#err').hidden = false; $(vazio[0]).focus(); return; } // aviso do app, grande e fixo (o balão do navegador some sozinho)
    $('#bt').disabled = true;
    const pw = $('#pw').value, dig = pw.replace(/\D/g, '');
    // Digitou o WhatsApp do jeito que aparece no celular, "(62) 99999-0000": tenta também só com os números
    try { await db.login($('#em').value, pw).catch(er => { if (dig !== pw && dig.length >= 10 && dig.length <= 13 && !/fetch|network|Failed/i.test(String(er?.message))) return db.login($('#em').value, dig); throw er; }); await boot(); }
    catch (er) { $('#err').textContent = /fetch|network|Failed/i.test(String(er?.message)) ? t('Sem internet agora. Tenta de novo quando o sinal voltar.') : t('E-mail ou senha não conferem. Se for sua primeira vez, a senha é seu WhatsApp (só números, com DDD).'); $('#err').hidden = false; $('#bt').disabled = false; }
  };
  $('#esq').onclick = async e => { e.preventDefault(); const em = $('#em').value.trim(); if (!/^\S+@\S+\.\S{2,}$/.test(em)) { $('#err').textContent = em ? t('Confere o e-mail: falta alguma parte (ex. nome@gmail.com).') : t('Digita seu e-mail no campo acima e toca de novo.'); $('#err').hidden = false; $('#em').focus(); return; } $('#err').hidden = true; try { await db.esqueciSenha(em); toast(t('Te mandei um link por e-mail pra criar outra senha.') + ' ' + t('Não chegou? Olha no spam ou nas promoções.'), false, { fixo: true }); } catch { toast(t('Não consegui. Chama o Igor no WhatsApp.'), true); } };
};

// HOME -----------------------------------------------------------------------
// Treinos feitos sem sinal entram na contagem na hora (sequência, meta, treino de hoje), antes de subir pro banco.
// Cada item da fila tem dono: treino feito sem sinal nunca sobe na conta de outra pessoa que entrar no mesmo celular.
const daFila = it => !it.dono || it.dono === S.perfil?.id;
const pendentesDaFila = () => db.LS.get('fila', []).filter(it => daFila(it) && it.tipo !== 'pontos' && it.tipo !== 'evolucao' && ((it.series || []).length > 0 || /^Spinning/.test(it.s?.titulo || ''))).map(it => ({ titulo: it.s.titulo, finalizada_em: it.patch.finalizada_em || new Date().toISOString(), exercicios_feitos: it.patch.exercicios_feitos, exercicios_total: it.patch.exercicios_total ?? it.s.total, duracao_s: it.patch.duracao_s, pendente: true, series: it.series || [] })); // séries vão junto: dá pra conferir o que fez antes de subir
async function sessoesComFila(p, lim) { const ss = await rapido(db.minhasSessoes(p.id, lim), db.LS.get('sessoes', [])); return [...pendentesDaFila(), ...ss].sort((a, b) => b.finalizada_em.localeCompare(a.finalizada_em)); }
const seriesFeitas = s => Object.values(s.sets).flat().filter(x => x.done).length;
const pillPausa = sa => sa.pausadoEm ? (haQuanto(sa.pausadoEm) ? t('Treino pausado há {t}', { t: haQuanto(sa.pausadoEm) }) : t('Treino pausado há pouco')) : t('Treino em andamento');
setInterval(() => { const el = $('#pausaPill'); if (el && rotaAtual === 'home' && S.sessao) el.textContent = pillPausa(S.sessao); }, 30000); // "há pouco" vira "há 12 min" sem ela recarregar
const haQuanto = x => { const m = Math.round((Date.now() - x) / 60000); return m < 1 ? '' : m < 60 ? t('{n} min', { n: m }) : m < 1440 ? t('{n}h', { n: Math.round(m / 60) }) : tp(Math.round(m / 1440), '{n} dia', '{n} dias'); };
// Resposta do Igor ainda não vista (conta a partir da data da resposta)
function respostaNova(sessoes) {
  const lidas = db.LS.get('respLidas', []);
  return sessoes.filter(x => x.resposta_igor && !lidas.includes(x.id)).find(x => Date.now() - new Date(x.respondida_em || x.finalizada_em) < 14 * 86400000);
}
routes.home = async () => {
  const p = S.perfil;
  const [plano, sessoes, recado, desafio, programas] = await Promise.all([rapido(cache3('plano@' + p.id, () => db.planoAtual(p.id)), db.LS.get('plano')), sessoesComFila(p), rapido(cache3('recado', () => db.recadoAtual()), null), rapido(cache3('desafio', () => db.desafioAtual()), null), rapido(cache3('programas', () => db.programas()), db.LS.get('programas', []))]);
  if (rotaAtual !== 'home') return; // ela já foi pra outra tela enquanto carregava
  S.plano = plano; S.programas = programas; S.sessoes = sessoes;
  const st = streakDias(sessoes);
  const sa = S.sessao, resp = respostaNova(sessoes);
  const mesCount = sessoes.filter(s => mesLocal(s.finalizada_em) === mesLocal() && treinoCompleto(s)).length;
  const feitoHoje = !sa && sessoes.find(s => /^Treino [A-Z]$/.test(s.titulo || '') && diaLocal(s.finalizada_em) === diaLocal() && !pelaMetade(s));
  const wk = isoWeek(new Date()); const semCount = sessoes.filter(s => isoWeek(new Date(s.finalizada_em)) === wk && treinoCompleto(s)).length;
  const meta = p.dias_semana || 4; const dmeta = desafio?.meta_treinos || 16;
  const prox = proximoTreino(plano, sessoes);
  const sf = sa ? seriesFeitas(sa) : 0;
  const dow = new Date().getDay(), resumoAnt = [1, 2, 3].includes(dow) ? A.resumoSemana({ sessoes, cargas: db.LS.get('cargas', {}), perfil: p, semanaKey: isoWeek(new Date(Date.now() - 7 * 86400000)), isoWeek, kcalDe: x => K.kcalFeito(S.perfil, Math.round((x.duracao_s || 0) / 60), x.esforco), semanasSeguidas: st.semanas }) : null;
  render(`<div class="view fx"><div class="topbar"><div class="logo sm">IGOR SOUSA <b>TEAM</b></div>${st.semanas ? `<span class="pill on" title="${t('semanas seguidas treinando')}">${fogo(st)}</span>` : ''}</div>
  <div><p class="muted">${hoje()}${p.plano === 'personalizado' ? ` <span class="pill" style="vertical-align:middle">${t('Personalizado')}</span>` : ''}</p><h1>${t('Bora, {nome}?', { nome: esc(primeiroNome(p.nome)) })}</h1></div>
  ${avisoVencimento(plano)}
  ${!p.anamnese_em && p.role !== 'admin' ? (p.objetivo ? `<div class="card" style="border:1px solid var(--accent)"><b style="font-size:1rem">${t('Confere sua anamnese')}</b><p class="muted">${t('O Igor já preencheu o que você respondeu antes. É só conferir e completar o que faltar.')}</p><button class="btn sm mt" id="anam" style="width:100%">${t('Conferir agora')}</button></div>` : `<div class="card" style="border:1px solid var(--accent)"><b style="font-size:1rem">${t('Falta me contar de você')}</b><p class="muted">${t('Umas 20 perguntas rápidas (uns 3 min) pro Igor montar o seu treino.')}</p><button class="btn sm mt" id="anam" style="width:100%">${t('Responder agora')}</button></div>`) : ''}
  ${sa && sa.fimEm ? `<div class="card hero"><span class="pill" style="background:rgba(0,0,0,.18);color:#1a0d00">${t('Falta enviar')}</span><div class="logo" style="font-size:1.75rem;margin:8px 0 4px;color:#1a0d00">${esc(nomeTreino(sa.titulo))}</div><p style="color:#1a0d00;font-weight:600">${t('Seu treino ainda não foi registrado: falta tocar em Enviar (o esforço e o recado pro Igor).')}</p><button class="btn dark" style="margin-top:8px" data-go="fim">${t('Enviar agora')}</button></div>`
    : sa ? `<div class="card hero"><span class="pill" id="pausaPill" style="background:rgba(0,0,0,.18);color:#1a0d00">${pillPausa(sa)}</span><div class="logo" style="font-size:1.75rem;margin:8px 0 4px;color:#1a0d00">${esc(nomeTreino(sa.titulo))}</div><p style="color:#1a0d00;font-weight:600">${tp(sf, '{n} série feita', '{n} séries feitas')} · ${t('{a} de {b} exercícios · tudo salvo', contaObr(sa))}</p><button class="btn dark" style="margin-top:8px" data-go="sessao">${t('Continuar de onde parei')}</button><button class="back" id="desc" style="color:#1a0d00;margin-top:4px;text-decoration:underline">${t('descartar esse treino')}</button></div>`
    : perguntaSemana(plano, sessoes) || (feitoHoje && prox ? `<div class="card" style="border:1px solid var(--accent)"><b style="font-size:1.0625rem">${t('Treino de hoje feito ✓')}</b><p class="muted">${t('{x} registrado. Descansa e volta amanhã: o próximo é o {y}.', { x: esc(nomeTreino(feitoHoje.titulo)), y: t('Treino {l}', { l: esc(prox.letra) }) })}</p><button class="btn ghost sm mt" style="width:100%" data-go="treino" data-arg="${esc(prox.letra)}">${t('Ver o Treino {l}', { l: esc(prox.letra) })}</button></div>`
    : prox ? `<div class="card hero"><div class="row between"><span class="pill" style="background:rgba(0,0,0,.18);color:#1a0d00">${t('Treino de hoje')}</span><span class="small" style="font-weight:600">${expressHoje() ? `⚡ ${t('Express')} ~${t('{n} min', { n: durExpress(prox.duracao_min) })}` : `~${t('{n} min', { n: prox.duracao_min || 40 })}${kcalTxt(K.kcalTreino(p, prox.exercicios || [], prox.duracao_min || 40))}`}</span></div>
    <div class="logo" style="font-size:1.875rem;margin:8px 0 4px;color:#1a0d00">${t('Treino {l}', { l: esc(prox.letra) })}<br><span style="font-weight:600;font-size:1.0625rem;font-family:var(--body);text-transform:none">${esc(tc(prox.nome))}</span></div>
    ${prox.repete ? `<p style="color:#1a0d00;font-weight:600">${prox.repete.exercicios_feitos ? t('Da última vez ele ficou pela metade ({a} de {b}). Bora fazer inteiro?', { a: prox.repete.exercicios_feitos, b: prox.repete.exercicios_total }) : t('Da última vez ele ficou só no começo. Bora fazer inteiro?')}</p>` : semCount >= meta ? `<p style="color:#1a0d00;font-weight:600">${t('Semana fechada 💪 Esse é só se você quiser treinar a mais.')}</p>` : ''}
    <button class="btn dark" style="margin-top:8px" data-go="treino" data-arg="${esc(prox.letra)}">${t('Abrir treino')}</button>${prox.repete ? `<button class="back" id="seguirMeia" style="color:#1a0d00;text-decoration:underline">${t('Não, seguir pro próximo')}</button>` : ''}${inicioDaSemana(plano) === prox.letra && !semCount ? `<button class="back" id="semTroca" style="color:#1a0d00;text-decoration:underline">${t('Você escolheu começar a semana por ele · trocar')}</button>` : ''}</div>`
    : `<div class="card"><b>${t('Seu treino do mês tá chegando.')}</b><p class="muted">${t('O Igor tá montando com base na sua anamnese. Enquanto isso, os programas extras já estão liberados.')}</p></div>`)}
  ${p.local_treino === 'casa' && !db.LS.get('casaOk') && (plano?.treinos || []).some(x => x.exercicios.some(e => /m[aá]quina|cadeira|mesa|leg|polia|cabo|puxada|smith|graviton|hack|crossover|banco/i.test(e.nome))) ? `<div class="card" id="casa" style="border:1px solid var(--line)"><b style="font-size:0.9375rem">🏠 ${t('Você treina em casa?')}</b><p class="muted">${t('Seu treino do mês tem aparelhos de academia. Chama o Igor pra adaptar pra casa. Enquanto isso, os programas extras sem aparelho estão liberados.')}</p><div class="row mt" style="gap:8px"><a class="btn sm" style="flex:2" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}?text=${encodeURIComponent('Oi Igor! Treino em casa, dá pra adaptar meu treino do mês?')}" target="_blank" rel="noopener">${t('Chamar o Igor')}</a><button class="btn ghost sm" id="casaOk" style="flex:1">${t('Ok')}</button></div></div>` : ''}
  ${!sa ? A.cardVolta(p, sessoes, prox) : ''}
  ${resumoAnt ? A.cardResumoHome(resumoAnt) : ''}
  ${resp ? `<button class="card" id="resp" style="text-align:left;border:1px solid var(--accent);color:var(--fg);width:100%"><b style="font-size:0.9375rem">💬 ${t('O Igor te respondeu')}</b><p class="muted">"${esc(tlivre(resp.resposta_igor))}"</p><p class="small mt" style="color:var(--accent)">${t('toca pra ver')}</p></button>` : ''}
  ${recado ? `<${recado.midia_url ? `a href="${esc(recado.midia_url)}" target="_blank" rel="noopener"` : 'div'} class="card row" style="gap:12px;color:var(--fg);text-decoration:none"><div style="width:44px;height:44px;border-radius:50%;background:${recado.midia_url ? 'var(--accent)' : '#2a2a2e'};display:grid;place-items:center;flex-shrink:0;color:${recado.midia_url ? 'var(--accent-ink)' : 'var(--accent)'};font-size:1.125rem">${recado.midia_url ? '▶' : '💬'}</div><div style="flex:1;min-width:0"><b style="font-size:0.9375rem">${t('Recado do Igor')}</b><p class="muted">${esc(tlivre(recado.texto || ''))}${recado.midia_url ? ' · ' + t('toca pra ouvir') : ''}</p></div></${recado.midia_url ? 'a' : 'div'}>` : ''}
  <div class="grid2">
    <button class="card" data-go="pontos" style="text-align:left;border:0;color:var(--fg)"><h3>${esc(!desafio?.titulo || desafio.titulo === 'Desafio do mês' ? t('Desafio do mês') : desafio.titulo)}</h3><div class="big" style="margin:6px 0 4px">${mesCount}<small>/${tp(dmeta, '{n} treino', '{n} treinos')}</small></div><div class="bar"><i style="width:${Math.min(100, mesCount / dmeta * 100)}%"></i></div><p class="muted mt" id="desaf">${mesCount >= dmeta ? t('Batido! 🎉') : tp(dmeta - mesCount, 'Falta {n} pra +{b} pts', 'Faltam {n} pra +{b} pts', { b: desafio?.pontos_bonus || 200 })}</p></button>
    <div class="card"><h3>${t('Meta da semana')}</h3><div class="big" style="margin:6px 0 4px">${semCount}<small>/${tp(meta, '{n} treino', '{n} treinos')}</small></div><div class="row" style="gap:4px">${Array.from({ length: meta }, (_, i) => `<i class="dot ${i < semCount ? 'on' : ''}"></i>`).join('')}</div><p class="muted mt">${semCount >= meta ? t('Semana fechada 💪') : tp(meta - semCount, 'Falta {n} · você consegue', 'Faltam {n} · você consegue')}</p></div>
  </div>
  <button class="card row home-ia" data-go="assistente" style="gap:12px;text-align:left;border:1px solid var(--line);color:var(--fg);width:100%"><div style="width:44px;height:44px;border-radius:50%;background:var(--accent);display:grid;place-items:center;flex-shrink:0;color:var(--accent-ink);font-size:1.25rem">💬</div><div style="flex:1;min-width:0"><b style="font-size:0.9375rem">${t('Tira-dúvidas 24h')}</b><p class="muted">${t('Pergunta sobre seu treino, execução, carga, cardio... a IA do time responde na hora.')}</p></div></button>
  <button class="card row home-time" data-go="comunidade" style="gap:12px;text-align:left;border:1px solid var(--line);color:var(--fg);width:100%"><div style="width:44px;height:44px;border-radius:50%;background:#2a2a2e;display:grid;place-items:center;flex-shrink:0;font-size:1.25rem">🔥</div><div style="flex:1;min-width:0"><b style="font-size:0.9375rem">${t('O time')}</b><p class="muted" id="timeHoje">${t('Veja quem já treinou hoje e o ranking do mês.')}</p></div></button>
  <div class="row between"><h3>${t('Programas extras')}</h3><button class="back" style="color:var(--accent)" data-go="lib">${t('ver todos')}</button></div>
  <div class="hscroll">${cardSpin(true)}${cardHyrox(true)}${programas.map(pr => `<button class="lib mini" data-go="programa" data-arg="${pr.slug}" data-bg="${esc(pr.capa_url)}" style=""><b style="font-size:${tamTitulo(tc(pr.titulo), 126, 17)}">${esc(tc(pr.titulo))}</b><span>${esc(subProg(pr))}</span></button>`).join('')}</div></div>`, 'home');
  // Desafio batido: só fala dos pontos quando eles já entraram de verdade
  if (mesCount >= dmeta) rapido(db.meusPontos(p.id), []).then(log => { const el = $('#desaf'); const d = log.find(l => l.motivo === 'desafio' && (l.ref === mesLocal() || mesLocal(l.created_at) === mesLocal())); if (el && d) el.textContent = t('Batido! +{n} pts', { n: d.pontos }); });
  if ($('#desc')) $('#desc').onclick = async () => { if (await perguntar(t('Descartar treino?'), t('O que você marcou nesse treino vai ser apagado.'), t('Descartar'), t('Manter'))) { pararDescanso(); db.desfazerCargas(S.sessao?.chave); S.sessao = null; db.LS.del('sessao'); routes.home(); } };
  if ($('#resp')) $('#resp').onclick = () => { db.LS.set('respLidas', [...db.LS.get('respLidas', []), resp.id].slice(-50)); go('perfil'); };
  if ($('#anam')) $('#anam').onclick = () => anamneseForm(S.perfil, () => go('home'));
  if ($('#resumoSem')) $('#resumoSem').onclick = () => { A.resumoVisto(resumoAnt.semanaKey); go('semana', resumoAnt.semanaKey + '|home'); };
  if ($('.volta-x')) $('.volta-x').onclick = () => { A.voltaVisto(); $('#volta')?.remove(); };
  const ult = sessoes.find(s => s.finalizada_em); A.avisarSW({ ultimo: ult?.finalizada_em || null, nome: primeiroNome(p.nome), proximo: prox ? t('Treino {l}', { l: prox.letra }) : t('treino') });
  rapido(db.comunidade(), null, 6000).then(d => { const el = $('#timeHoje'); if (el && d?.hoje) el.textContent = tp(d.hoje, '{n} menina do time já treinou hoje. Bora?', '{n} meninas do time já treinaram hoje. Bora?'); });
  if (A.passeioPendente(p) && !$('#overlay')?.innerHTML && !document.querySelector('.bv')) setTimeout(() => { if (rotaAtual === 'home' && !$('#overlay')?.innerHTML) A.passeio(p); }, 500);
  $$('.semop').forEach(b => b.onclick = () => { db.LS.set('inicioSemana', { semana: isoWeek(new Date()), letra: b.dataset.letra }); routes.home(); toast(t('Semana começa pelo Treino {l} ✓', { l: b.dataset.letra })); });
  if ($('#casaOk')) $('#casaOk').onclick = () => { db.LS.set('casaOk', 1); $('#casa')?.remove(); };
  if ($('#seguirMeia')) $('#seguirMeia').onclick = () => { db.LS.set('seguirMeia', prox.repete.finalizada_em); routes.home(); };
  if ($('#semTroca')) $('#semTroca').onclick = () => { db.LS.del('inicioSemana'); db.LS.del('inicioSemanaPulou'); routes.home(); };
  if ($('#semPula')) $('#semPula').onclick = () => { db.LS.set('inicioSemanaPulou', isoWeek(new Date())); routes.home(); };
  if (spinGuardada()) setTimeout(ofereceSpin, 700);
};
// "N treinos" sempre bate com o que tem de verdade no programa
function subProg(pr) {
  const n = (pr.programa_treinos || []).length;
  if (!n) return t('em breve');
  const sub = pr.subtitulo || '', tx = tp(n, '{n} treino', '{n} treinos');
  const partes = s_ => s_.split(/\s*·\s*/).map(x => tc(x.trim())).filter(Boolean).join(' · '); // cada pedaço só traduz inteiro (sem colar o "·")
  return /^\s*\d+\s*(treinos?|rotinas?)/i.test(sub) ? [tx, partes(sub.replace(/^\s*\d+\s*(treinos?|rotinas?)\s*·?/i, ''))].filter(Boolean).join(' · ') : sub ? partes(sub) : tx;
}
// Treino que parou bem no começo (menos da metade dos exercícios): não "fecha" o dia nem pula pro próximo sozinho
// Decisão do Igor (26/10): só treino completo pontua e conta no desafio/meta (todos os exercícios, menos o opcional).
// Treinos de antes de 26/10 seguem a regra antiga (1 exercício com série já valia).
const CORTE_COMPLETO = '2026-10-26';
const treinoCompleto = x => x && (String(x.finalizada_em || '') < CORTE_COMPLETO ? (x.exercicios_feitos == null || x.exercicios_feitos > 0) : !(x.exercicios_total > 0) || (x.exercicios_feitos ?? 0) >= x.exercicios_total);
const pelaMetade = x => x && x.exercicios_total > 0 && x.exercicios_feitos != null && x.exercicios_feitos / x.exercicios_total < 0.5;
function proximoTreino(plano, sessoes) {
  if (!plano?.treinos?.length) return null;
  const doMes = sessoes.filter(s => /^Treino [A-Z]$/.test(s.titulo || '')); // só o treino do mês (programa extra não mexe na ordem)
  // Semana flexível: ela escolheu por qual treino começar essa semana → a semana segue a partir dele, sem mudar o treino.
  const esc_ = inicioDaSemana(plano), ult0 = doMes[0], i0r = ult0 ? plano.treinos.findIndex(t => ult0.titulo === `Treino ${t.letra}`) : -1;
  // parou no meio: o próximo é ele de novo (ela pode seguir), também na semana em que escolheu por onde começar
  if (ult0 && pelaMetade(ult0) && db.LS.get('seguirMeia', null) !== ult0.finalizada_em && i0r >= 0) return { ...plano.treinos[i0r], repete: ult0 };
  if (esc_) {
    const wk = isoWeek(new Date()), n = plano.treinos.length;
    const i0 = plano.treinos.findIndex(t => t.letra === esc_);
    const ordem = Array.from({ length: n }, (_, k) => plano.treinos[(i0 + k) % n]);
    const feitas = new Set(doMes.filter(s => isoWeek(new Date(s.finalizada_em)) === wk && (!pelaMetade(s) || db.LS.get('seguirMeia', null) === s.finalizada_em)).map(s => s.titulo));
    const falta = ordem.find(t => !feitas.has(`Treino ${t.letra}`));
    if (falta) return falta;
  }
  const ultimo = doMes[0];
  if (!ultimo) return plano.treinos[0];
  const i = plano.treinos.findIndex(t => ultimo.titulo === `Treino ${t.letra}`);
  if (pelaMetade(ultimo) && db.LS.get('seguirMeia', null) !== ultimo.finalizada_em && i >= 0) return { ...plano.treinos[i], repete: ultimo }; // parou no meio: o próximo é ele de novo (ela pode seguir)
  return plano.treinos[(i + 1) % plano.treinos.length];
}
// Escolha da semana fica no celular: { semana: '2026-43', letra: 'C' }. Só vale na semana em que foi feita.
function inicioDaSemana(plano) {
  const e = db.LS.get('inicioSemana', null);
  return e && e.semana === isoWeek(new Date()) && plano?.treinos?.some(t => t.letra === e.letra) ? e.letra : null;
}
// Pergunta no começo de toda semana (antes do 1º treino do mês na semana), se o plano tem 2+ treinos.
function perguntaSemana(plano, sessoes) {
  if (!plano?.treinos || plano.treinos.length < 2 || S.sessao || inicioDaSemana(plano)) return '';
  const wk = isoWeek(new Date());
  if (sessoes.some(s => /^Treino [A-Z]$/.test(s.titulo || '') && isoWeek(new Date(s.finalizada_em)) === wk)) return '';
  if (db.LS.get('inicioSemanaPulou', null) === wk) return '';
  return `<div class="card" id="semana" style="border:1px solid var(--accent)"><b style="font-size:1.0625rem">${t('Por qual treino você quer começar a semana?')}</b><p class="muted">${t('Escolhe o grupo que você quer priorizar. O treino é o mesmo, só muda a ordem da semana.')}</p>
  <div class="semopts">${plano.treinos.map(x => `<button class="semop" data-letra="${esc(x.letra)}"><b>${esc(x.letra)}</b><span>${esc(tc(x.nome))}</span></button>`).join('')}</div>
  <button class="back" id="semPula" style="margin-top:6px;text-decoration:underline">${t('seguir a ordem normal')}</button></div>`;
}

// TREINO MENSAL ---------------------------------------------------------------
routes.treino = async (letra) => {
  const plano = S.plano || await rapido(db.planoAtual(S.perfil.id), db.LS.get('plano')); S.plano = plano;
  if (!plano?.treinos?.length) return render(`<div class="view"><div class="topbar"><h2>${t('Treino mensal')}</h2></div><div class="card"><b>${t('Ainda não tem treino montado.')}</b><p class="muted">${t('Assim que o Igor liberar, aparece aqui e você recebe um aviso.')}</p></div></div>`, 'treino');
  if (!letra && S.sessao) letra = (S.sessao.titulo.match(/^Treino ([A-Z])$/) || [])[1]; // treino pausado abre primeiro
  if (!letra) { const ses = S.sessoes || await sessoesComFila(S.perfil); letra = proximoTreino(plano, ses)?.letra; }
  const tr = plano.treinos.find(x => x.letra === letra) || plano.treinos[0];
  if (rotaAtual === 'treino' && argAtual !== tr.letra) { argAtual = tr.letra; history.replaceState({ name: 'treino', arg: tr.letra }, '', '#treino'); }
  // Versão express (~25 min): mesmos exercícios, menos séries e descanso mais curto, sem o cardio do fim. Lembrada só no dia (amanhã volta o Completo).
  const expr = expressHoje(), exs = expr ? expressDe(tr.exercicios) : tr.exercicios;
  const dur = expr ? Math.max(15, Math.round((tr.duracao_min || 40) * 0.6 / 5) * 5) : (tr.duracao_min || 40);
  // Plano com fim: mostra até quando vale ("até 1/11"); senão o mês
  const mes = plano.fim ? t('até {d}', { d: dataLocal(plano.fim + 'T12:00', { day: 'numeric', month: 'numeric' }) }) : dataLocal(plano.mes + 'T12:00', { month: 'long' });
  const semPend = !S.sessao && !!perguntaSemana(plano, S.sessoes || []); // segunda sem escolher: o treino que ela iniciar vira o começo da semana
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="home">‹ ${t('Início')}</button><span class="row" style="gap:6px">${S.perfil.plano === 'personalizado' ? `<span class="pill">${t('Personalizado')}</span>` : ''}<span class="pill" style="${plano.fim ? '' : 'text-transform:capitalize'}">${esc(mes)}</span></span></div>
  <div class="hscroll" style="gap:6px">${plano.treinos.map(x => `<button class="pill big-pill ${x.letra === tr.letra ? 'on' : ''}" style="flex-shrink:0;white-space:nowrap" data-go="treino" data-arg="${esc(x.letra)}">${t('Treino {l}', { l: esc(x.letra) })}</button>`).join('')}</div>
  <div><h1>${t('Treino {l}', { l: esc(tr.letra) })}</h1><p class="muted">${esc(tc(tr.nome))} · ${tp(exs.length, '{n} exercício', '{n} exercícios')} · ~${t('{n} min', { n: dur })}${kcalTxt(K.kcalTreino(S.perfil, exs, dur, { express: expr }))}</p>${K.faltaDado(S.perfil) ? `<button class="back small" id="kcalDado" style="color:var(--accent);text-decoration:underline;margin-top:2px">${t('Ver quantas kcal você gasta: completa peso, altura e nascimento')}</button>` : ''}<div class="versao" role="group" aria-label="${t('Versão do treino')}"><button class="${expr ? '' : 'on'}" data-ver="0">${t('Completo')} <small>~${t('{n} min', { n: tr.duracao_min || 40 })}</small></button><button class="${expr ? 'on' : ''}" data-ver="1">⚡ ${t('Express')} <small>~${t('{n} min', { n: Math.max(15, Math.round((tr.duracao_min || 40) * 0.6 / 5) * 5) })}</small></button></div>${expr ? `<p class="small mt" style="color:var(--accent)">${t('Express: mesmos exercícios, menos séries e descanso mais curto. Pra dia corrido, sem culpa.')}</p>` : ''}<p class="muted small mt">${t('Toca no nome do exercício pra ver como fazer e suas cargas.')}</p>${semPend ? `<p class="small mt" style="color:var(--accent)">${t('Semana nova: o treino que você iniciar aqui vira o começo da sua semana.')}</p>` : ''}</div>
  ${plano.obs ? `<div class="card" style="padding:10px 14px"><p class="muted"><b style="color:var(--fg)">${t('Do Igor:')}</b> ${esc(tlivre(plano.obs))}</p></div>` : ''}
  <div>${exs.map((e, j) => `<div class="ex"><div class="n">${e.ordem}</div><button class="t" data-ficha="${j}"><b>${esc(tc(e.nome))}</b><span>${e.series > 1 ? t('{n} séries ×', { n: e.series }) + ' ' : ''}${esc(tc(e.reps))}${e.descanso_s ? ' · ' + t('descanso {n}s', { n: e.descanso_s }) : ''}${e.biset_com ? ' · <b style="color:var(--accent);display:inline;font-size:0.8125rem">' + t('bi-set com o {n} (no treino: A1 + A2)', { n: e.biset_com }) + '</b>' : ''}${tecnicaDe(e) ? `<span class="tecnica mini">⚡ ${esc(tc(tecnicaDe(e)))}</span>` : ''}${e.aq ? `<span class="tecnica mini">↻ ${t('Série de reconhecimento antes: {n} reps leves ({s}s de descanso)', { n: esc(e.aq), s: 45 })}</span>` : ''}</span>${explicaReps(e.reps) || e.biset_com || ehHiit(e) ? `<span class="explica">${esc([explicaReps(e.reps), e.biset_com ? t('Bi-set = 2 exercícios seguidos, sem descanso entre eles.') : '', ehHiit(e) ? t(/casa/.test(S.perfil?.local_treino || '') ? HIIT_CASA : HIIT_TXT) : ''].filter(Boolean).join(' '))}</span>` : ''}<span class="ult" data-n="${esc(e.nome)}"></span></button>${e.video_url ? `<button class="play" data-vid="${esc(e.nome)}" data-url="${esc(e.video_url)}" data-dica="${esc(e.dica || '')}" aria-label="${t('Ver vídeo')}"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></button>` : `<button class="play info" data-ficha="${j}" aria-label="${t('Como fazer')}">i</button>`}</div>`).join('')}</div>
  <div class="cta">${S.sessao ? `<button class="btn" data-go="sessao">▶ ${t('Continuar {x}', { x: esc(nomeTreino(S.sessao.titulo)) })} (${contaObr(S.sessao).a}/${contaObr(S.sessao).b})</button><button class="btn ghost sm" id="ini" style="width:100%">${S.sessao.titulo === `Treino ${tr.letra}` ? t('Recomeçar o Treino {l} do zero', { l: esc(tr.letra) }) : t('Iniciar o Treino {l}', { l: esc(tr.letra) })}</button>` : `<button class="btn" id="ini">▶ ${t('Iniciar treino')}</button>`}</div><button class="btn ghost" id="pdf">📄 ${t('Baixar treino em PDF')}</button><p class="muted center small">${t('Esse treino fica salvo no celular e abre mesmo sem sinal. Vídeo e o 1º PDF precisam de internet.')}</p></div>`, 'treino');
  // Última carga de cada exercício: mostra o que tem no celular na hora e atualiza com o banco em segundo plano.
  const mostraUlt = (nome, u) => { const el = $$('.ult').find(x => x.dataset.n === nome); if (el && u?.kg) el.innerHTML = `${t('Última:')} <b>${dec(u.kg)} kg</b>${u.reps ? ' × ' + u.reps : ''}`; };
  const cache = db.LS.get('cargas', {}); exs.forEach(e => mostraUlt(e.nome, cache[e.nome]));
  exs.forEach(e => { if (!tempo(e.reps)) cache3('ult@' + S.perfil.id + e.nome, () => db.ultimaCarga(S.perfil.id, e.nome)).then(u => mostraUlt(e.nome, ultimaValida(u, e.reps))).catch(() => {}); });
  $('#ini').onclick = () => { if (semPend) db.LS.set('inicioSemana', { semana: isoWeek(new Date()), letra: tr.letra }); const b = $('#ini'), rot = b.textContent; b.disabled = true; b.textContent = t('Abrindo…'); iniciarSessao({ titulo: `Treino ${tr.letra}`, treino_id: tr.id, exercicios: exs, duracao_min: dur, express: expr }).finally(() => { if (document.body.contains(b)) { b.disabled = false; b.textContent = rot; } }); };
  $$('[data-ficha]').forEach(b => b.onclick = () => abrirHistorico(exs[+b.dataset.ficha].nome, exs[+b.dataset.ficha]));
  $('#pdf').onclick = () => baixarPdf($('#pdf'), plano);
  if ($('#kcalDado')) $('#kcalDado').onclick = () => anamneseForm(S.perfil, () => routes.treino(tr.letra));
  $$('[data-ver]').forEach(b => b.onclick = () => { db.LS.set('versaoExpress', b.dataset.ver === '1' ? diaLocal() : false); routes.treino(tr.letra); });
  if (['zh', 'hi'].includes(idioma())) $$('#pdf').forEach(b => b.textContent += ' (English)'); // PDF nesses idiomas sai em inglês: avisa antes
};
// Validade do treino (igual ao Mfit): avisa na semana do vencimento e depois que venceu, sem travar nada.
function avisoVencimento(plano) {
  if (!plano?.fim) return '';
  const h = new Date(); h.setHours(12, 0, 0, 0); const dias = Math.round((new Date(plano.fim + 'T12:00') - h) / 86400000);
  if (dias > 7) return '';
  const d = dataLocal(plano.fim + 'T12:00', { day: 'numeric', month: 'short' });
  const txt = dias < 0 ? t('Seu treino venceu em {d}. Pode seguir com ele até o Igor atualizar.', { d }) : dias === 0 ? t('Seu treino vence hoje ({d}). O Igor atualiza pra você.', { d }) : t('Seu treino vai até {d}. Na virada o Igor atualiza pra você.', { d });
  return `<div class="card" style="border:1px solid ${dias < 0 ? 'var(--warn)' : 'var(--line)'}"><b style="font-size:0.9375rem">⏳ ${txt.replace(/\.\./g, '.')}</b></div>`;
}
const expressHoje = () => db.LS.get('versaoExpress', false) === diaLocal();
const durExpress = d => Math.max(15, Math.round((d || 40) * 0.6 / 5) * 5);
// Regra da versão express (o Igor pode mudar aqui): mobilidade/ativação ficam iguais; cardio/HIIT do fim sai;
// os outros exercícios ficam com ~60% das séries (mín. 2) e descanso 25% menor (mín. 30 s). Bi-sets continuam.
function expressDe(lista) {
  return lista.filter(e => !ehHiit(e)).map(e => {
    if (/mobilidade|ativa[çc][ãa]o|alongamento|aquecimento/i.test(e.nome) || (e.series || 1) <= 2) return e;
    const n = Math.max(2, Math.round(e.series * 0.6)), alvos = String(e.reps || '').split('/');
    // Pirâmide 12/10/8 → 12/8 (começa leve, termina na pesada); serieIdx = qual série do completo cada uma é (sugestão de carga certa)
    const idx = alvos.length > n ? [...new Set(Array.from({ length: n }, (_, j) => Math.round(j * (alvos.length - 1) / (n - 1))))] : null;
    return { ...e, series: n, reps: idx ? idx.map(j => alvos[j]).join('/') : e.reps, serieIdx: idx || undefined, descanso_s: e.descanso_s ? Math.max(30, Math.round(e.descanso_s * 0.75 / 5) * 5) : e.descanso_s };
  });
}
async function baixarPdf(b, plano, programa) {
  const rot = b.textContent; b.disabled = true; b.textContent = t('Gerando PDF… (na 1ª vez demora um pouco)');
  const lento = setTimeout(() => { if (b.disabled) b.textContent = t('Baixando o gerador de PDF (uns 110 KB)…'); }, 4000);
  try { const m = await import('./pdf.js').catch(() => import('./pdf.js?r=' + Date.now())); await m.gerarPdfTreino(plano, S.perfil, programa); } // o navegador guarda a falha do 1º import: o 2º vai com outro endereço
  catch (e) { toast(navigator.onLine === false ? t('Sem internet pra gerar o PDF agora. Depois da 1ª vez ele funciona sem sinal.') : e?.message === 'lento' ? t('Internet muito lenta pra baixar o PDF agora. Tenta de novo no Wi-Fi.') : t('Não deu pra gerar o PDF agora. Confere a internet e tenta de novo.'), true); }
  clearTimeout(lento); b.disabled = false; b.textContent = rot;
}

// TIRA-DÚVIDAS (IA do time) -----------------------------------------------------------
// Responde com o prompt do Igor + os dados da aluna (treino, cargas, anamnese). Quem conversa com a IA é o servidor.
document.addEventListener('click', e => { const d = e.target.closest('[data-duvida]'); if (!d) return; e.preventDefault(); const noTreino = rotaAtual === 'sessao'; closeOverlay(); go('assistente', JSON.stringify({ pergunta: t('Sobre o exercício {x}: ', { x: d.dataset.duvida }), contexto: noTreino ? `Ela está no meio do treino (${S.sessao?.titulo || ''}), no exercício ${d.dataset.duvida}.` : `Ela está vendo a ficha do exercício ${d.dataset.duvida} antes de treinar.` })); });
const SUGESTOES = ['Me passa um cardio de 20 minutos pra fazer agora', 'Como faço o búlgaro do jeito certo?', 'Quando eu subo a carga?', 'Senti dor no joelho, e agora?', 'Musculação ou cardio primeiro?', 'Não tô vendo resultado, o que pode ser?', 'Como funciona o bi-set?'];
// Respostas de erro do servidor (vêm em português): no idioma dela, pelo código do erro.
const ERROS_IA = { ia_desligada: 'O tira-dúvidas ainda tá sendo ligado pelo Igor. Enquanto isso, manda sua dúvida no recado do fim do treino ou no WhatsApp dele.', pausada: 'Seu acesso tá pausado. Fala com o Igor pra liberar.', ia_falhou: 'Não consegui responder agora. Tenta de novo em um minutinho.', limite: 'Você já usou as {n} perguntas de hoje. Amanhã libera de novo! Se for urgente, chama o Igor no WhatsApp.' };
// Pedido de cardio (qualquer idioma) → oferece o cronômetro de cardio do próprio app
const CARDIO_RX = /cardio|hiit|aer[oó]bi|corrid|esteira|treadmill|有氧|कार्डियो/i;
// Cardio de 20 min pronto pra começar: o mesmo cronômetro do treino (minimizar, tela apagada, "Já fiz" registra o que fez)
function cardioPronto() {
  const h = (S.plano?.treinos || []).flatMap(x => x.exercicios).find(e => /hiit|cardio/i.test(e.nome));
  const casa = /casa/.test(S.perfil?.local_treino || '');
  return { ordem: 1, nome: 'Cardio 20 min', series: 1, reps: '20 min', descanso_s: 0, carga: false, dica: (h?.dica || 'Bike, esteira, escada ou corrida parada: 30s forte / 30s leve') + (casa && !/casa|parada|polichinelo/i.test(h?.dica || '') ? ' · Em casa: corrida parada ou polichinelo.' : '') };
}
const iniciarCardio = () => iniciarSessao({ titulo: 'Cardio 20 min', exercicios: [cardioPronto()], duracao_min: 20 });
routes.assistente = async (arg) => {
  const a = (() => { try { return JSON.parse(arg || '{}'); } catch { return {}; } })();
  const doTreino = !!(duvidaNoTreino && S.sessao); // veio do "? Dúvida": sem abas (não pausa sem querer) e volta pro treino
  render(`<div class="view fx chat ${doTreino ? 'noTabs' : ''}"><div class="topbar chat-top"><button class="back" id="volta">‹ ${doTreino ? t('Voltar pro treino') : t('Voltar')}</button><span class="pill">🤖 ${t('IA do time')}</span></div>
  <div><h2>${t('Tira-dúvidas')}</h2><p class="muted small">${t('Responde com base no seu treino e nas regras do Igor. Não substitui o Igor, médico nem nutricionista.')}</p></div>
  <div id="msgs" class="msgs"></div>
  <div class="chatbar"><textarea class="input" id="tx" rows="1" maxlength="1500" placeholder="${t('Escreve sua dúvida…')}">${esc(a.pergunta || db.LS.get('chatRasc', ''))}</textarea><button class="btn sm" id="env" style="width:auto;padding:0 14px" aria-label="${t('Enviar')}"><span class="envTxt">${t('Enviar')} </span>➤</button></div>
  <p class="muted small center" id="limite" hidden></p>
  <a class="small center" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}" target="_blank" rel="noopener" style="color:var(--muted);display:block;min-height:44px;padding:12px 0">${t('Caso individual ou mudança no treino? Fala direto com o Igor')}</a></div>`, doTreino ? null : 'home');
  $('#volta').onclick = () => doTreino ? go('sessao') : history.length > 1 ? history.back() : go('home');
  const bolha = (papel, texto) => `<div class="msg ${papel === 'user' ? 'eu' : 'ia'}">${esc(texto).replace(/\n/g, '<br>')}</div>`;
  let ofertaCardio = false, lento = false;
  const restHoje = () => { const r = db.LS.get('chatRest', null); return r && r.dia === diaLocal() ? r.n : null; };
  // A tela é sempre redesenhada a partir do que está guardado no celular (conversa + pergunta pendente):
  // saiu e voltou, a pergunta e a resposta continuam lá.
  const mostra = () => {
    const box = $('#msgs'); if (!box || rotaAtual !== 'assistente') return;
    const hist = db.LS.get('chat', []), pend = db.LS.get('chatPend', null), ultUser = [...hist].reverse().find(m => m.papel === 'user');
    let dia0 = ''; const comData = m => { const q = m.created_at || m.em, d = q ? diaLocal(q) : ''; const sep = d && d !== dia0 ? `<p class="muted small center">${d === diaLocal() ? t('Hoje') : fmtData(d)}</p>` : ''; if (d) dia0 = d; return sep + bolha(m.papel, m.texto); }; // data quando muda o dia
    let h = hist.length ? hist.map(comData).join('') : `<div class="msg ia">${t('Oi, {nome}! Sou a IA do time do Igor (um robô, não sou o Igor). Posso te explicar seu treino, execução, carga, descanso, cardio, sono... Manda a dúvida 💪', { nome: esc(primeiroNome(S.perfil.nome)) })}</div>`;
    if (pend) h += pend.falhou ? `<div class="msg eu falhou">${esc(pend.texto)}</div><div class="aviso-chat"><p>${esc(pend.msg || '')}</p><button class="btn ghost sm" id="reenvia">↻ ${t('Tentar de novo')}</button></div>`
      : bolha('user', pend.texto) + `<div class="msg ia digitando"><i></i><i></i><i></i></div>${lento ? `<p class="muted small center">${t('Internet lenta… a resposta aparece aqui assim que chegar.')}</p>` : ''}`;
    if (!doTreino && (ofertaCardio || (!pend && ultUser && CARDIO_RX.test(ultUser.texto)))) { // no meio de um treino não oferece começar outro
      const hi = cardioPronto();
      h += `<div class="aviso-chat">${ofertaCardio ? `<p>${t('Sem internet agora, mas dá pra fazer o cardio do app:')} ${esc(tc(hi.dica))}</p>` : ''}<button class="btn sm" id="cardioJa">▶ ${t('Começar cardio de 20 min')}</button></div>`;
    }
    const rest = restHoje(); if (rest != null && rest <= 5) h += `<p class="muted center small">${tp(rest, '{n} pergunta restante hoje', '{n} perguntas restantes hoje')}</p>`;
    if (!hist.length && !pend && !a.pergunta) h += `<div class="sug">${SUGESTOES.map(q => `<button class="pill" data-q="${esc(t(q))}">${esc(t(q))}</button>`).join('')}</div>`;
    box.innerHTML = h;
    $$('.sug [data-q]', box).forEach(b => b.onclick = () => { if (!navigator.onLine) { ofertaCardio = CARDIO_RX.test(b.dataset.q); mostra(); return toast(t('Sem internet agora. Tenta de novo quando o sinal voltar.'), true); } const tx = $('#tx'), antes = tx.value; tx.value = b.dataset.q; enviar(antes); });
    if ($('#reenvia')) $('#reenvia').onclick = () => { const p = db.LS.get('chatPend'); db.LS.del('chatPend'); $('#tx').value = p.texto; enviar(); };
    if ($('#cardioJa')) $('#cardioJa').onclick = () => iniciarCardio();
    const sem = rest === 0; $('#tx').disabled = sem; $('#env').disabled = sem || (pend && !pend.falhou);
    $('#limite').hidden = !sem; if (sem) $('#limite').textContent = t('Você usou todas as perguntas de hoje. Libera de novo amanhã. Urgente? Chama o Igor no WhatsApp.');
    if (hist.length || pend) { box.scrollTop = box.scrollHeight; window.scrollTo(0, document.body.scrollHeight); } else window.scrollTo(0, 0); // conversa nova: começa do topo (ela vê que é uma IA)
  };
  mostra();
  // Busca a conversa no banco só de vez em quando (economiza o pacote de dados)
  if (Date.now() - db.LS.get('chatEm', 0) > 5 * 60000 && !db.LS.get('chatPend', null)) rapido(db.assistente.historico(S.perfil.id), null, 8000).then(h => { if (h && !db.LS.get('chatPend', null)) { db.LS.set('chat', h); db.LS.set('chatEm', Date.now()); mostra(); } });
  const tx = $('#tx'); const ajusta = () => { tx.style.height = 'auto'; tx.style.height = Math.min(innerHeight * 0.4, tx.scrollHeight) + 'px'; };
  tx.oninput = () => { ajusta(); db.LS.set('chatRasc', tx.value); }; ajusta();
  if (a.pergunta && !a.enviar) { tx.focus(); tx.setSelectionRange(tx.value.length, tx.value.length); }
  tx.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } };
  $('#env').onclick = () => enviar();
  if (a.enviar) { if (navigator.onLine) enviar(); else { ofertaCardio = !!a.cardio; mostra(); } } // botão "cardio de 20 min" do fim do treino: já envia
  // rascunho: só é apagado se foi ele que saiu; sugestão/atalho não apaga o que ela tinha escrito
  async function enviar(rascunhoAntes) {
    const tx = $('#tx'); const texto = tx.value.trim(); if (!texto) return;
    const pend0 = db.LS.get('chatPend', null);
    if (pend0 && !pend0.falhou) return toast(t('Espera a resposta da anterior chegar 🙂'));
    if (restHoje() === 0) return;
    if (!navigator.onLine) {
      if (rascunhoAntes == null) db.LS.set('chatRasc', texto); else tx.value = rascunhoAntes;
      ofertaCardio = CARDIO_RX.test(texto) || !!a.cardio; mostra();
      return toast(t('Sem internet: sua pergunta ficou guardada aqui. Quando o sinal voltar, toca em ➤.'), true);
    }
    ofertaCardio = false; lento = false;
    if (String(db.LS.get('chatRasc', '')).trim() === texto) db.LS.del('chatRasc'); else if (rascunhoAntes) db.LS.set('chatRasc', rascunhoAntes);
    tx.value = rascunhoAntes != null ? rascunhoAntes : ''; ajusta();
    db.LS.set('chatPend', { texto, em: Date.now() }); mostra();
    const ctx = a.contexto; a.contexto = null; a.cardio = false;
    let feito = false;
    const falhou = msg => { if (feito) return; feito = true; db.LS.set('chatPend', { texto, falhou: true, msg }); mostra(); };
    const lentoT = setTimeout(() => { if (!feito) { lento = true; mostra(); } }, 8000);
    const desistiu = setTimeout(() => falhou(t('Não veio resposta. Confere a internet e toca em tentar de novo.')), 60000);
    const caiu = () => falhou(t('Sem internet agora. Tenta de novo quando o sinal voltar.'));
    window.addEventListener('offline', caiu, { once: true });
    const fim = () => { clearTimeout(lentoT); clearTimeout(desistiu); window.removeEventListener('offline', caiu); };
    try {
      const r = await db.assistente.perguntar(texto, ctx); fim();
      if (r.erro) { // erro do servidor não vira "resposta da IA" nem fica na conversa
        if (r.erro === 'limite' || r.restantes === 0) db.LS.set('chatRest', { dia: diaLocal(), n: 0 });
        const m = ERROS_IA[r.erro] ? t(ERROS_IA[r.erro], { n: (String(r.resposta || '').match(/\d+/) || [30])[0] }) : (r.resposta || t('Não consegui responder agora.'));
        feito = false; return falhou(m);
      }
      feito = true; db.LS.del('chatPend');
      db.LS.set('chat', [...db.LS.get('chat', []), { papel: 'user', texto, em: Date.now() }, { papel: 'assistant', texto: r.resposta, em: Date.now() }].slice(-30));
      if (r.restantes != null) db.LS.set('chatRest', { dia: diaLocal(), n: r.restantes });
      mostra();
    } catch (er) {
      fim(); feito = false;
      falhou(/nao_autenticado|jwt|expired/i.test(String(er?.message)) ? t('Sua sessão expirou. Sai e entra de novo no app.') : t('Não consegui responder agora. Confere a internet e tenta de novo.'));
    }
  }
};

// BIBLIOTECA DE VÍDEOS: todos os exercícios do treino do mês + programas extras, com busca ---------------
routes.videos = async () => {
  const [plano, programas] = await Promise.all([S.plano || rapido(db.planoAtual(S.perfil.id), db.LS.get('plano')), S.programas || rapido(db.programas(), db.LS.get('programas', []))]);
  const mapa = new Map();
  const add = (e, onde) => { if (!e?.nome) return; const k = e.nome.trim().toLowerCase(); const a = mapa.get(k) || { nome: e.nome, video_url: null, dica: null, onde: new Set(), ondeT: new Set() }; a.video_url = a.video_url || e.video_url || null; a.dica = a.dica || e.dica || null; a.onde.add(onde[0]); a.ondeT.add(onde[1]); mapa.set(k, a); };
  // onde = [português pra busca, rótulo no idioma dela]
  (plano?.treinos || []).forEach(t => t.exercicios.forEach(e => { add(e, [T('Treino {l}', { l: t.letra }) + ' · ' + t.nome, T('Treino {l}', { l: t.letra }) + ' · ' + tc(t.nome)]); if (e.alternativa) add({ nome: e.alternativa }, [T('troca do {x}', { x: e.nome }), T('troca do {x}', { x: tc(e.nome) })]); }));
  (programas || []).forEach(pr => (pr.programa_treinos || []).forEach(t => (t.exercicios || []).forEach(e => add(e, [pr.titulo, tc(pr.titulo)]))));
  const todos = [...mapa.values()].sort((a, b) => tc(a.nome).localeCompare(tc(b.nome), loc())); // ordem do nome que ela lê
  const ehCardio = x => /hiit|cardio/i.test(x.nome), lista = todos.filter(x => !ehCardio(x)); // cardio só aparece buscando
  const comVideo = lista.filter(x => x.video_url).length;
  render(`<div class="view fx"><div class="topbar"><h2>${t('Vídeos')}</h2><span class="pill">${tp(lista.length, '{n} exercício', '{n} exercícios')}</span></div>
  ${navigator.onLine === false ? `<div class="card" style="padding:10px 14px"><p class="muted">📶 ${t('Sem internet agora: os vídeos precisam de sinal. A dica de cada exercício abre mesmo assim.')}</p></div>` : ''}${!comVideo ? `<div class="card" style="border:1px solid var(--accent)"><b style="font-size:0.9375rem">🎬 ${t('Os vídeos do Igor estão sendo gravados')}</b><p class="muted">${t('Enquanto isso, toca no exercício pra ler a dica dele de como fazer.')}</p></div>` : `<p class="muted">${t('Como fazer cada exercício, com o Igor. Dá pra assistir antes de ir pra academia.')}${comVideo < lista.length ? ' ' + t('<b style="color:var(--fg)">{n} já gravados</b>, o resto chegando.', { n: comVideo }) : ''}</p>`}
  <input class="input" id="busca" type="search" placeholder="${t('Buscar exercício')}" aria-label="${t('Buscar: perna, bumbum, barriga, casa, cardio...')}" autocomplete="off">
  <div id="lv"></div></div>`, 'videos');
  const norm = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Palavras de quem tá começando → nomes de treino/exercício
  const SIN = { perna: 'quadriceps posterior agachamento leg afundo bulgaro extensora flexora stiff passada panturrilha', coxa: 'quadriceps posterior extensora flexora agachamento leg', bumbum: 'gluteo quadril pelvica abducao coice', bunda: 'gluteo quadril pelvica abducao coice', barriga: 'abdomen abdominal prancha dead bug', abdominal: 'abdomen abdominal prancha', braco: 'biceps triceps rosca testa corda', costas: 'costas puxada remada pulldown', ombro: 'ombro desenvolvimento elevacao lateral', peito: 'peito supino crucifixo flexao', alongar: 'alongamento mobilidade', alongamento: 'mobilidade alongamento', elastico: 'mini band elastico', band: 'mini band', faixa: 'mini band elastico' };
  const desenha = (q = '') => {
    const nq = norm(q.trim()), extra = Object.entries(SIN).filter(([k]) => nq.length >= 3 && (k.startsWith(nq) || nq.startsWith(k))).flatMap(([, v]) => v.split(' '));
    const casa = nq.length >= 3 && /^(casa|sem apa|sem pes|peso do|peso corp|corpo)/.test(nq), cardio = nq.length >= 3 && /^(cardio|hiit|bike|esteira|aerob)/.test(nq);
    const f = casa ? lista.filter(x => semCarga(x) || [...x.onde].some(o => /casa|mobilidade|abd/i.test(norm(o)))) : cardio ? todos.filter(ehCardio)
      : lista.filter(x => { const alvo = norm(x.nome + ' ' + tc(x.nome) + ' ' + [...x.onde, ...x.ondeT].join(' ')); return alvo.includes(nq) || extra.some(w => alvo.includes(w)); }); // acha também por treino/grupo e palavra do dia a dia (ex.: bumbum)
    // Sem vídeo ainda: não aparece "em gravação" na lista; vai pro fim, com a dica do Igor no lugar
    const item = x => `<button class="ex vid" data-vid="${esc(x.nome)}" data-url="${esc(x.video_url || '')}" data-dica="${esc(x.dica || '')}" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);color:var(--fg);text-align:left">${x.video_url ? '<div class="play" style="flex-shrink:0"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></div>' : '<div class="play info" style="flex-shrink:0" aria-hidden="true">i</div>'}<div class="t"><b>${esc(tc(x.nome))}</b><span>${esc([...x.ondeT].join(' · '))}</span>${!x.video_url && x.dica ? `<span class="muted small" style="display:block;margin-top:2px">💡 ${esc(tlivre(x.dica))}</span>` : ''}</div></button>`;
    const cv = f.filter(x => x.video_url), sv = f.filter(x => !x.video_url);
    $('#lv').innerHTML = f.length ? cv.map(item).join('') + (sv.length && cv.length ? `<h3 style="margin:16px 0 4px">${t('Dica do Igor (vídeo chegando)')}</h3>` : '') + sv.map(item).join('')
      : `<div class="card" style="margin-top:8px"><p class="muted">${t('Não achei "{q}". Tenta outro nome ou chama o Igor no WhatsApp.', { q: esc(q) })}</p><a class="btn ghost sm mt" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}" target="_blank" rel="noopener">${t('Chamar o Igor no WhatsApp')}</a></div>`;
  };
  desenha(); $('#busca').oninput = e => desenha(e.target.value);
};

// PROGRAMAS EXTRAS -------------------------------------------------------------
routes.lib = async () => {
  const programas = S.programas || await rapido(db.programas(), db.LS.get('programas', []));
  render(`<div class="view fx"><div class="topbar"><h2>${t('Programas extras')}</h2></div><p class="muted">${t('Liberado pra todas as alunas, além do seu treino.')}</p>
  <div class="grid2">${cardSpin()}${cardHyrox()}${programas.map(pr => `<button class="lib" data-go="programa" data-arg="${pr.slug}" data-bg="${esc(pr.capa_url)}" style=""><b style="font-size:${tamTitulo(tc(pr.titulo), (Math.min(innerWidth, 480) - 42) / 2 - 24, 17)}">${esc(tc(pr.titulo))}</b><span>${esc(subProg(pr))}</span></button>`).join('')}</div></div>`, 'home');
};
routes.programa = async (slug) => {
  const programas = S.programas || await rapido(db.programas(), db.LS.get('programas', [])); const pr = programas.find(p => p.slug === slug); if (!pr) return go('lib');
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="lib">‹ ${t('Programas')}</button></div>
  <div class="lib" style="aspect-ratio:16/9;background-image:url(${esc(pr.capa_url)})"><b style="font-size:${tamTitulo(tc(pr.titulo), Math.min(innerWidth, 480) - 56, 26)}">${esc(tc(pr.titulo))}</b><span>${esc(subProg(pr))}</span></div>
  ${pr.programa_treinos?.length ? pr.programa_treinos.map((t, ti) => `<div class="card"><div class="row between"><div><b>${esc(tc(t.nome))}</b><p class="muted">${tp((t.exercicios || []).length, '{n} exercício', '{n} exercícios')} · ${T('{n} min', { n: t.duracao_min || 20 })}${kcalTxt(K.kcalTreino(S.perfil, exsProg(pr, t), t.duracao_min || 20))}</p></div><button class="btn sm" data-pt="${t.id}">${T('Iniciar')}</button></div>
    <div class="mt">${exsProg(pr, t).map((e, j) => `<div class="ex"><div class="n">${j + 1}</div><button class="t" data-pf="${ti}-${j}"><b>${esc(tc(e.nome))}</b><span>${e.series > 1 ? T('{n} séries ×', { n: e.series }) + ' ' : ''}${esc(tc(e.reps))}${semCarga(e) ? ' · ' + T('sem peso') : ''}</span></button></div>`).join('')}</div></div>`).join('') : `<div class="card"><b>${T('Em breve')}</b><p class="muted">${T('O Igor ainda tá montando esse programa. Enquanto isso, os outros já estão liberados.')}</p></div>`}${pr.programa_treinos?.length ? `<button class="btn ghost" id="pdf">📄 ${T('Baixar em PDF')}</button>` : ''}</div>`, 'home');
  if ($('#pdf') && ['zh', 'hi'].includes(idioma())) $('#pdf').textContent += ' (English)';
  if ($('#pdf')) $('#pdf').onclick = () => baixarPdf($('#pdf'), { mes: diaLocal(), treinos: pr.programa_treinos.map((x, j) => ({ letra: String(j + 1), nome: x.nome, duracao_min: x.duracao_min || 20, exercicios: exsProg(pr, x) })) }, pr.titulo);
  $$('[data-pt]').forEach(b => b.onclick = () => { const t = pr.programa_treinos.find(x => x.id === b.dataset.pt); b.disabled = true; iniciarSessao({ titulo: `${pr.titulo} · ${t.nome}`, programa_treino_id: t.id, exercicios: exsProg(pr, t), duracao_min: t.duracao_min }).finally(() => { b.disabled = false; }); });
  $$('[data-pf]').forEach(b => b.onclick = () => { const [ti, j] = b.dataset.pf.split('-').map(Number); const e = exsProg(pr, pr.programa_treinos[ti])[j]; abrirHistorico(e.nome, e); });
};

// Exercícios de um treino de programa extra, com os mesmos padrões no app, na lista e no PDF
const exsProg = (pr, t) => (t.exercicios || []).map((e, i) => ({ ordem: i + 1, series: 3, reps: '12', descanso_s: 45, ...(/casa|mobilidade|abd/i.test(pr.slug) ? { carga: false } : {}), ...e }));
// SESSÃO -------------------------------------------------------------------------
// Tudo da sessão fica salvo no celular a cada toque: se o app fechar, ela continua de onde parou.
const tempo = r => { const m = String(r || '').match(/(\d+(?:[.,]\d+)?)\s*(s|seg|min)\b/i); return m ? Math.round(parseFloat(m[1].replace(',', '.')) * (/min/i.test(m[2]) ? 60 : 1)) : 0; };
const repsAlvo = (r, k) => { const p = String(r || '').split('/'); const v = parseInt(p.length > 1 ? (p[k] ?? p[p.length - 1]) : r); return isNaN(v) ? '' : v; };
const porLado = r => /cada/i.test(String(r || ''));
// Série que bateu o mínimo de reps da meta (29 kg × 3 numa meta de 10 não é recorde nem vira a "Última")
const bateuMeta = (reps, alvoTxt, k) => { const a = repsAlvo(alvoTxt, k), r = repsNum(reps); return !a || r == null || r >= a; };
const topoMeta = r => { const ns = String(r || '').match(/^\s*(\d+)\s*-\s*(\d+)/); return ns ? +ns[2] : (piramide(r) ? 0 : +repsAlvo(r, 0) || 0); };
// "Última" do banco = série mais pesada do dia; aqui vira a mais pesada que bateu a meta
function ultimaValida(u, reps) {
  if (!u?.sets?.length) return u;
  const ok = u.sets.filter(x => bateuMeta(x.reps, reps, (x.n || 1) - 1)); if (!ok.length || ok.length === u.sets.length) return u;
  const b = ok.reduce((a, c) => +c.kg > +a.kg ? c : a); return { ...u, kg: +b.kg, reps: b.reps };
}
const piramide = r => /\d\s*\/\s*\d/.test(String(r || ''));
// Exercício sem peso (peso do corpo, elástico, mobilidade): esconde a coluna de kg
// Tradução das reps pra quem tá começando
function explicaReps(r) {
  r = String(r || '');
  if (piramide(r)) { const p = r.split('/').map(x => x.trim()); return t('{p}: uma em cada série. Sobe um pouco o peso a cada série.', { p: p.join(', ') }); }
  if (/\+\s*\(?\d/.test(r) && !/parciais/i.test(r)) return t('Faz as reps, tira um pouco de peso e já emenda as próximas, sem descansar.');
  if (/parciais/i.test(r)) return t('Parciais: no fim da série, faz meias repetições na parte de baixo, alongando.');
  if (/^\s*\d+\s*-\s*\d+/.test(r)) { const [x, y] = r.match(/\d+/g); return t('Entre {x} e {y} repetições. Chegou fácil no {y}? Sobe o peso.', { x, y }); }
  return '';
}
const HIIT_TXT = 'HIIT = cardio em tiros: forte (quase sem conseguir falar) e leve, na bike, esteira ou escada.', HIIT_CASA = 'HIIT = cardio em tiros: forte (quase sem conseguir falar) e leve. Em casa: corrida parada, polichinelo ou subir e descer um degrau.';
const ehHiit = e => /hiit/i.test(e?.nome || '');
// HIIT "30s forte / 30s leve": vira apito a cada troca no cronômetro
// Técnica que muda a execução (pausa, pico de contração, isometria, cadência, rest-pause, drop): fica sempre à vista,
// não escondida no "Dica e opções" — a aluna fazia as 12 reps direto sem a pausa (feedback 28/10).
const TECNICA = /segur|pausa|isometr|pico|contra[cç][aã]o|cad[eê]ncia|exc[eê]ntric|descida (lenta|controlada)|desce devagar|rest.?pause|drop.?set|parcia|cluster|\d+\s*s(eg|egundos)?\s*(embaixo|em baixo|em cima|no topo|parad)|a cada \d+/i;
const tecnicaDe = e => String(e.dica || '').split(/\s+·\s+|\n|(?<=\.)\s+/).map(x => x.trim()).filter(x => x && TECNICA.test(x) && !/^bi-?set com/i.test(x)).join(' · ');
const intervalosDe = e => { const m = `${e.dica || ''} ${e.reps || ''}`.match(/(\d+)\s*s\w*\s*(?:forte|r[aá]pido|intenso)\s*\/\s*(\d+)\s*s\w*\s*(?:leve|devagar|lento)/i); return m ? [+m[1], +m[2]] : null; };
const durCurta = sec => sec < 60 ? t('<1 min') : t('{n} min', { n: Math.round(sec / 60) }); // mesma duração no card, no histórico e no painel
const durTxt = sec => sec >= 60 ? t('{n} min', { n: Math.round(sec / 60) }) : sec + 's';
const salvaSessao = () => { if (S.sessao) { S.sessao.ult = Date.now(); db.LS.set('sessao', S.sessao); } for (const k in fresco) if (k.startsWith('ult@')) delete fresco[k]; }; // carga nova: a "Última" vem de novo do banco
// Saiu da tela do treino (pausar, aba, voltar): o relógio do treino para e o descanso é encerrado.
function sairDaSessao() {
  clearInterval(clockIv); soltarTela();
  // cronômetro de exercício rodando (prancha, mobilidade, cardio): congela onde estava, sem marcar a série; no Continuar volta pausado
  const f = congelarTrabalho(); if (f != null && S.sessao?.trab) { S.sessao.trab.congelado = f; salvaSessao(); }
  pararDescanso();
  if (S.sessao && !S.sessao.pausadoEm) { S.sessao.pausadoEm = Date.now(); salvaSessao(); if (!S.sessao.local) db.marcarPausa(S.sessao.id).catch?.(() => {}); } // o fim do descanso fica guardado: no "Continuar" ele volta minimizado se ainda não acabou
}
// Série de reconhecimento: o Igor marca no exercício (ex.: 15 reps) e o app põe uma série leve antes das válidas, com descanso curto.
// Nos bi-sets ela entra antes do primeiro exercício do bloco. É um item à parte (não mistura com a carga das séries válidas).
function comReconhecimento(lista) {
  const ligado = (a, b) => a && b && (a.biset_com === b.ordem || b.biset_com === a.ordem), antes = new Map();
  lista.forEach((e, i) => { if (!e.aq) return; let k = i; while (k > 0 && ligado(lista[k - 1], lista[k])) k--; antes.set(k, [...(antes.get(k) || []), e]); });
  const out = [];
  lista.forEach((e, i) => { (antes.get(i) || []).forEach(a => out.push({ ordem: lista[i].ordem, nome: a.nome + ' · reconhecimento', series: 1, reps: a.aq, descanso_s: 45, video_url: a.video_url || null, dica: 'Série leve só pra reconhecer o movimento: carga bem leve, sem chegar perto da falha.', aq: true, biset_com: null })); out.push(e); });
  return out;
}
// Agrupa bi-sets e tri-sets (exercícios seguidos marcados um com o outro) num passo só.
function montarPassos(exs) {
  const passos = [], liga = (a, b) => a && b && (a.biset_com === b.ordem || b.biset_com === a.ordem);
  for (let i = 0; i < exs.length; i++) { const g = [i]; while (liga(exs[g[g.length - 1]], exs[g[g.length - 1] + 1]) || (g.length > 1 && liga(exs[g[0]], exs[g[g.length - 1] + 1]))) g.push(g[g.length - 1] + 1); passos.push(g); i = g[g.length - 1]; }
  return passos;
}
let iniciando = false;
// Abre o treino na hora com o que está no celular; o banco é avisado em segundo plano (4G ruim não trava nem duplica).
async function iniciarSessao({ titulo, treino_id = null, programa_treino_id = null, exercicios, duracao_min, express = false }) {
  if (iniciando) return; iniciando = true;
  try {
    const velha = S.sessao;
    if (velha && seriesFeitas(velha)) {
      const x = nomeCurto(velha.titulo);
      if (velha.titulo === titulo) { // "Recomeçar do zero" o mesmo treino: só zera (não grava um treino pela metade e outro igual no mesmo dia)
        const o = await escolher(t('Recomeçar do zero?'), tp(seriesFeitas(velha), 'A {n} série que você marcou no {x} vai ser apagada.', 'As {n} séries que você marcou no {x} vão ser apagadas.', { x }), [t('Voltar pra ele'), t('Apagar e recomeçar')]);
        if (o === 0) return go('sessao'); if (o !== 1) return; db.desfazerCargas(velha.chave);
      } else {
      // Fez pouco (menos de 30% das séries): o botão em destaque é voltar pra ele (um toque sem querer não registra treino quase vazio)
      const feitas = seriesFeitas(velha), total = Object.values(velha.sets).flat().length, pouco = feitas < total * 0.3;
      const reg = t('Registrar ({a} de {b} séries) e começar este', { a: feitas, b: total }), ops = pouco ? [t('Voltar pra ele'), reg, t('Descartar e começar este')] : [reg, t('Voltar pra ele'), t('Descartar e começar este')];
      let o = await escolher(t('{x} pela metade', { x }), tp(feitas, 'Você marcou {n} série no {x}. O que faço com ele?', 'Você marcou {n} séries no {x}. O que faço com ele?', { x }), ops);
      if (pouco && o >= 0 && o < 2) o = 1 - o;
      if (o < 0) return; // voltar do celular: não faz nada (o botão volta ao normal)
      if (o === 1) return go('sessao');
      if (o === 0) { sairDaSessao(); enviarSessao(velha, {}).then(ok => toast(ok ? t('{x} registrado ✓', { x }) : t('{x} guardado no celular. Envio quando o sinal voltar.', { x }))); } else db.desfazerCargas(velha.chave);
      }
    }
    pararDescanso();
    const cargas = db.LS.get('cargas', {});
    const exs = comReconhecimento(structuredClone(exercicios).sort((a, b) => a.ordem - b.ordem)).map(e => ({ ...e, original: e.nome, ultima: cargas[e.nome] || null }));
    const chave = 'local-' + Date.now();
    S.sessao = { id: chave, chave, local: true, dono: S.perfil.id, titulo, treino_id, programa_treino_id, express, exs, passos: montarPassos(exs), p: 0, feito: {}, sets: {}, inicio: Date.now() };
    exs.forEach((e, i) => { S.sessao.sets[i] = Array.from({ length: e.series || 1 }, () => ({ kg: '', reps: '', done: false })); });
    salvaSessao(); go('sessao'); setTimeout(ativarPush, 60000);
    db.iniciarSessao(S.perfil.id, { treino_id, programa_treino_id, titulo, total: exs.length }).then(sess => { const s = S.sessao; if (sess?.id && s?.chave === chave && !s.enviada) { s.id = sess.id; s.local = false; salvaSessao(); } }).catch(() => {});
    exs.forEach((e, i) => { if (piramide(e.reps)) rapido(db.ultimasSeries(S.perfil.id, e.nome), null, 8000).then(ps => { const s = S.sessao; if (ps && s?.chave === chave && s.exs[i].nome === e.nome) { s.exs[i].porSerie = ps; salvaSessao(); if (rotaAtual === 'sessao' && !document.activeElement?.matches('input')) routes.sessao(); } }); });
    Promise.all(exs.map(e => tempo(e.reps) ? null : rapido(db.ultimaCarga(S.perfil.id, e.nome), null, 8000))).then(us => {
      const s = S.sessao; if (s?.chave !== chave) return;
      let mudou = false; us.forEach((u, i) => { u = ultimaValida(u, exs[i].reps); if (u && s.exs[i].nome === exs[i].nome && JSON.stringify(u) !== JSON.stringify(s.exs[i].ultima)) { s.exs[i].ultima = u; mudou = true; } });
      if (mudou) { salvaSessao(); if (rotaAtual === 'sessao' && !document.activeElement?.matches('input')) routes.sessao(); }
    });
  } finally { iniciando = false; }
}
let clockIv, wake, ultToque = 0; const INATIVO = 10 * 60000;
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { ultToque = Date.now(); }, { capture: true, passive: true }));
async function manterTelaAcesa() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch {} }
function soltarTela() { try { wake?.release(); } catch {} wake = null; }
// Criança chamou e o app ficou de lado: o tempo escondido não conta no treino (tolera 2 min, o tempo de uma série
// com o celular no bolso; com descanso ou cronômetro rodando, tolera até o fim dele + 3 min).
const FORA_MAX = 5 * 60000, FORA_TOL = 2 * 60000;
// Cardio/prancha rodando com a tela apagada é treino: esse tempo conta (só desconta o que passou do fim dele).
function descontaFora(s) {
  const desde = s.ocultoEm, tf = s.trabFim; s.ocultoEm = null; s.trabFim = null; if (!desde || s.pausadoEm || s.fimEm) return 0;
  const gap = Date.now() - desde, util = Math.max(FORA_TOL, tf ? Math.min(Date.now(), tf) - desde : 0), fora = gap - util; if (fora < 30000) return 0;
  s.inicio += fora; salvaSessao(); return fora;
}
document.addEventListener('visibilitychange', () => {
  const s = S.sessao; if (!s || !(rotaAtual === 'sessao' || (rotaAtual === 'assistente' && duvidaNoTreino))) return; // "? Dúvida" no meio do treino também conta como treino aberto
  // Celular no bolso no descanso também é treino: conta até o fim do descanso + 3 min (o tempo da série)
  if (document.visibilityState === 'hidden') { if (!s.ocultoEm) s.ocultoEm = Date.now(); s.trabFim = trabalhoFim() || (s.descansoAte ? s.descansoAte + 3 * 60000 : null); salvaSessao(); return; }
  manterTelaAcesa(); ultToque = Date.now(); // voltou pro app: o tempo fora já foi descontado, não vira "10 min parado"
  const gap = descontaFora(s); if (gap >= 60000) { toast(t('Você ficou fora: tirei {n} min de tempo parado do relógio do treino.', { n: Math.round(gap / 60000) })); const c = $('#clock'); if (c) c.textContent = fmtMin(Math.floor((Date.now() - s.inicio) / 1000)); }
});
// "? Dúvida" largada no meio do treino (criança chamou): 10 min sem toque = pausa o treino e solta a tela, igual na sessão
setInterval(() => { const s = S.sessao; if (!duvidaNoTreino || rotaAtual !== 'assistente' || !s || s.pausadoEm || document.hidden || descansoAtivo() || trabalhoFim() || Date.now() - ultToque <= INATIVO) return; s.pausadoEm = Math.max(ultToque + FORA_TOL, s.inicio); salvaSessao(); soltarTela(); toast(t('Pausei seu treino: ficou 10 min parado. O tempo parado não conta, e tá tudo salvo.'), false, { fixo: true }); }, 5000);
// Treino aberto em duas abas (app instalado + Safari): a mais recente vale nas duas, nenhuma apaga série da outra.
window.addEventListener('storage', ev => {
  if (ev.key !== 'sessao' && ev.key !== 'demo:sessao') return;
  let nova = null; try { nova = ev.newValue ? JSON.parse(ev.newValue) : null; } catch { return; }
  if (!nova) { if (S.sessao) { clearInterval(clockIv); pararDescanso(); S.sessao = null; if (['sessao', 'fim'].includes(rotaAtual)) go('home'); } return; }
  S.sessao = nova; if (rotaAtual === 'sessao' && !document.activeElement?.matches('input')) routes.sessao();
});
// Exercício conta como feito se tiver pelo menos 1 série marcada.
const feitosCount = s => s.exs.filter((e, i) => s.sets[i]?.some(x => x.done)).length;
// Pra mostrar o progresso: exercício completo = todas as séries feitas ou concluído na chave (1 série não é "exercício feito")
const completo = (s, i) => !!s.feito[i] || (s.sets[i]?.length && s.sets[i].every(x => x.done));
const completosCount = s => s.exs.filter((e, i) => completo(s, i)).length;
const opcional = e => /opcional/i.test(e?.nome || '');
// "1 de 7 + opcional": o opcional não entra no total (igual no topo do treino, no pop-up e no feedback)
const obrigatorios = s => s.exs.map((e, i) => i).filter(i => !opcional(s.exs[i]));
// Opcional feito (pelo menos 1 série): "+ opcional ✓"; não feito: "· 1 opcional" (não parece que ela fez o HIIT)
const opcFeito = s => s.exs.some((e, i) => opcional(e) && s.sets[i]?.some(x => x.done));
const opcTxt = s => { const n = s.exs.length - obrigatorios(s).length; return !n ? '' : opcFeito(s) ? ' + ' + t('opcional ✓') : ' · ' + tp(n, '{n} opcional', '{n} opcionais'); };
const contaObr = s => { const obr = obrigatorios(s); return { a: obr.filter(i => completo(s, i)).length, b: obr.length }; };
const totalTxt = s => t('{a} de {b} exercícios feitos', contaObr(s)) + opcTxt(s);
// Ordem das séries no passo: no bi-set alterna A1, A2, A1, A2...
function filaDoPasso(s, passo) {
  const max = Math.max(...passo.map(i => s.sets[i].length)), fila = [];
  for (let k = 0; k < max; k++) passo.forEach(i => { if (k < s.sets[i].length) fila.push([i, k]); });
  return fila;
}
// Descanso guardado na sessão: recarregou/voltou no meio, o tempo continua de onde estava.
async function descanso(seg, txt) {
  const s = S.sessao; if (!s) return;
  s.descansoAte = Date.now() + seg * 1000; s.descansoTxt = txt; s.dicaOk = true; salvaSessao(); // já usou o ⏱: a dica não volta depois de recarregar
  s.descansoMini = false; const r = await restTimer(seg, txt, 'Descanso', { aoMudar: fim => { if (S.sessao === s) { s.descansoAte = fim; salvaSessao(); } }, aoMinimizar: m => { if (S.sessao === s) { s.descansoMini = m; salvaSessao(); } }, pausarTreino: () => { if (S.sessao === s && rotaAtual === 'sessao') $('#sair')?.click(); } });
  if (S.sessao === s && !descansoAtivo() && !s.pausadoEm) { s.descansoAte = null; salvaSessao(); }
  return r;
}
// Nº da série no treino completo (no Express a 2ª série da pirâmide 12/8 é a 3ª do completo)
const serieN = (e, k) => (e.serieIdx?.[k] ?? k) + 1;
function marcarFeita(s, i, k) { const st = s.sets[i][k], e = s.exs[i];
  if (!tempo(e.reps)) { if (!semCarga(e) && st.kg === '') { const sug = sugKg(s, i, k); if (sug != null) st.kg = String(sug); } if (st.reps === '') { const r = repsAlvo(e.reps, k); if (r) st.reps = String(r); } } /* o que aparece é o que fica salvo */ st.done = true; st.feitaEm = Date.now(); st.nome = e.nome; st.eid = e.nome === e.original ? (e.id || null) : null; }
routes.sessao = () => {
  const s = S.sessao; if (!s) return go('home');
  const voltouDaPausa = !!s.pausadoEm || s.descansoMini; if (s.pausadoEm) fecharToast(true); // "Pausei seu treino" some no Continuar // recarregou com o descanso em tela cheia: volta em tela cheia; minimizado ou voltando da pausa: minimizado
  if (s.pausadoEm) { s.inicio += Date.now() - s.pausadoEm; s.pausadoEm = null; } // pausa não conta no tempo
  else if (s.fimEm) s.inicio += Date.now() - s.fimEm; // voltou do feedback: o tempo parado lá não conta
  s.fimEm = null; if (!document.hidden) s.ocultoEm = null; if (s.inicio > Date.now()) s.inicio = Date.now(); // relógio nunca negativo // redesenhou com o app escondido (cronômetro acabou no bolso): a marca de "fora" fica
  if (!s.passos[s.p]) { s.p = s.passos.length - 1; s.passos[s.p].forEach(i => delete s.feito[i]); } // voltou do fim pro último exercício
  salvaSessao();
  const passo = s.passos[s.p];
  const bi = passo.length > 1, fila = filaDoPasso(s, passo);
  const prox = fila.find(([i, k]) => !s.sets[i][k].done);
  manterTelaAcesa();
  const bloco = (i, n) => {
    const e = s.exs[i], sets = s.sets[i], t = tempo(e.reps), lado = porLado(e.reps), sc = semCarga(e), pir = piramide(e.reps), ex = explicaReps(e.reps);
    const ultimoDoPar = !bi || n === passo.length - 1;
    const botao = (k) => {
      const st = sets[k];
      if (t) return `<button class="rest tm" data-i="${i}" data-k="${k}">${st.done ? '✓ ' + (st.seg ? fmtMin(st.seg) : T('feito')) : s.trab?.i === i && s.trab?.k === k ? '⏱ ' + T('abrir') : lado ? `▶ ${T('{t} cada lado', { t: durTxt(t) })}` : `▶ ${fmtMin(t)}`}</button>`;
      if (bi && !ultimoDoPar) return `<button class="rest" data-i="${i}" data-k="${k}" aria-label="${T('Série feita, vai pro A{n}', { n: n + 2 })}">${st.done ? '✓' : `✓ → A${n + 2}`}</button>`;
      return `<button class="rest" data-i="${i}" data-k="${k}" aria-label="${T('Série feita, iniciar descanso')}">${st.done ? '✓' : e.descanso_s ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>${e.descanso_s}s` : '✓'}</button>`;
    };
    // Ver execução, Dúvida e "Senti dor" numa linha só (as séries cabem na 1ª tela); no bi-set eles vão pro "Dica e opções" (senão repetem 2x)
    const rapidos = `<div class="rapidos"><button class="btn ghost sm" data-vid="${esc(e.nome)}" data-url="${esc(e.video_url || '')}" data-dica="${esc(e.dica || '')}">▶ ${T('Execução')}</button><button class="btn ghost sm" data-duvida="${esc(e.nome)}">? ${T('Dúvida')}</button><button class="btn ghost sm" data-dor="${i}">${(s.dor || []).includes(e.nome) ? '✓ ' + T('Dor anotada') : '⚠ ' + T('Senti dor')}</button></div>`;
    const aq = e.aq === true, nomeBase = aq ? e.nome.replace(/\s*·\s*reconhecimento$/i, '') : e.nome, ultBase = aq ? (s.exs.find(x => x.nome === nomeBase && x.aq !== true)?.ultima || db.LS.get('cargas', {})[nomeBase]) : e.ultima; // reconhecimento: o histórico é o do exercício de verdade
    const comMais = e.dica || e.alternativa || e.nome !== e.original || bi || (!t && (s.programa_treino_id || /casa|ambos/.test(S.perfil?.local_treino || '')) && (!sc || semPesoMarcado(e.nome)));
    // Aparelho ocupado só quando tem pra onde trocar (mobilidade, dead bug, HIIT e peso do corpo não têm aparelho)
    const ocupa = !t && !sc && !aq && !ehHiit(e) && !sets.every(x => x.done) && equivalentes(e.nome, e.alternativa, e.original, s.exs.map(x => x.nome)).length > 0;
    const phKg = k => pir ? (e.porSerie?.[serieN(e, k)] != null ? dec(e.porSerie[serieN(e, k)]) : 'kg') : (e.ultima?.kg != null ? dec(e.ultima.kg) : 'kg'); // pirâmide: a carga daquela série da última vez
    return `<div class="bloco" data-i="${i}">
      <div class="row between" style="align-items:flex-start;gap:8px"><div style="min-width:0">${bi ? `<span class="tag">A${n + 1}</span> ` : ''}${aq ? `<span class="tag">${T('Reconhecimento')}</span>` : ''}<h1 style="font-size:${bi ? 1.625 : 2}rem">${esc(tc(nomeBase))}</h1></div></div>
      <p class="muted">${e.series > 1 ? T('{n} séries ×', { n: e.series }) + ' ' : ''}${esc(tc(e.reps))}${!bi && e.descanso_s ? ' · ' + T('descanso {n}s', { n: e.descanso_s }) : ''}</p>
      ${ex ? `<p class="muted small">${esc(ex)}</p>` : ''}
      ${tecnicaDe(e) ? `<p class="tecnica">⚡ ${esc(tc(tecnicaDe(e)))}</p>` : ''}
      ${t && lado ? `<p class="muted small">${T('Eu apito na metade pra você trocar de lado.')}</p>` : ''}
      ${ehHiit(e) ? `<p class="small hiit-explica">${T(/casa/.test(S.perfil?.local_treino || '') ? HIIT_CASA : HIIT_TXT)}</p>` : ''}${t && intervalosDe(e) ? `<p class="muted small">${T('Eu aviso com apito a cada troca: forte e leve.')}</p>` : ''}
      ${aq ? `<p class="muted small">${T('Série leve pra sentir o peso. Não conta como série válida.')}</p>` : ''}
      ${bi ? '' : rapidos}
      ${comMais ? `<details class="mais" ${s.p === 0 && !seriesFeitas(s) && !bi ? 'open' : ''}><summary>${T('Dica e opções')} ▾</summary>${bi ? rapidos : ''}` : '<div>'}
      ${e.dica ? `<p class="dica">${esc(tc(e.dica))}</p>` : ''}
      <div class="row" style="margin:8px 0;gap:8px;flex-wrap:wrap">${e.alternativa ? `<button class="btn ghost sm swap" style="width:auto" data-i="${i}">⇄ ${T('Trocar por {x}', { x: esc(tc(e.alternativa)) })}</button>` : e.nome !== e.original ? `<button class="btn ghost sm swap" style="width:auto" data-i="${i}">↺ ${T('Voltar pro {x}', { x: esc(e.original) })}</button>` : ''}${!t && (s.programa_treino_id || /casa|ambos/.test(S.perfil?.local_treino || '')) && (!sc || semPesoMarcado(e.nome)) ? `<button class="btn ghost sm" style="width:auto" data-sempeso="${i}">${sc ? T('Usar peso') : T('Sem peso (peso do corpo)')}</button>` : ''}</div>
      ${comMais ? '</details>' : '</div>'}
      ${t ? '' : `<div class="set ${sc ? 'sc' : ''}"><span class="h" title="${T('Série')}">${T('Nº')}</span>${sc ? '' : '<span class="h">kg</span>'}<span class="h">${lado ? T('reps/lado') : T('reps')}</span><span class="h c" aria-label="${T('feito')}">${T('feito')}</span></div>`}
      ${sets.map((st, k) => t
        ? `<div class="set tset ${st.done ? 'done' : ''}" data-i="${i}" data-k="${k}"><span>${k + 1}</span><span class="muted">${esc(tc(e.reps))}</span>${botao(k)}</div>`
        : `<div class="set ${sc ? 'sc' : ''} ${st.done ? 'done' : ''}" data-i="${i}" data-k="${k}"><span>${k + 1}</span>${sc ? '' : `<input inputmode="decimal" enterkeyhint="next" value="${esc(st.kg)}" data-f="kg" placeholder="${phKg(k)}" aria-label="${T('kg da série {n}', { n: k + 1 })}">`}<input inputmode="numeric" enterkeyhint="next" value="${esc(st.reps)}" data-f="reps" placeholder="${repsAlvo(e.reps, k) || T('reps')}" aria-label="${T('reps da série {n}', { n: k + 1 })}">${botao(k)}</div>`).join('')}
      ${(() => { const o = sets.map((st, k) => [st, k]).filter(([st]) => st.done && st.nome && st.nome !== e.nome); return o.length ? `<p class="muted small">${tp(o.length, 'Série {s} feita no {x}', 'Séries {s} feitas no {x}', { s: o.map(([, k]) => k + 1).join(', '), x: esc(o[0][0].nome) })}</p>` : ''; })()}
      ${t ? '' : `<div class="row" style="gap:4px;justify-content:flex-end"><button class="back small" data-mais="${i}" style="min-height:44px;padding:0 10px;color:var(--muted)">+ ${T('série')}</button>${sets.length > 1 && !sets[sets.length - 1].done ? `<button class="back small" data-menos="${i}" style="min-height:44px;padding:0 10px;color:var(--muted)">− ${T('série')}</button>` : ''}</div>`}
      ${!sc && s.kgPerg?.[e.nome]?.k != null && !sets.some(x => x.kg !== '') ? `<div class="pergKg"><b>${T('Anotar o peso?')}</b><p class="muted small">${T('Você marcou a série sem o kg. Anotando, eu te mostro a evolução e aviso quando dá pra subir.')}</p><div class="row" style="gap:8px"><button class="btn sm" data-kganota="${i}" style="flex:1">${T('Anotar agora')}</button><button class="btn ghost sm" data-kgsem="${i}" style="flex:1">${T('Não uso peso')}</button></div></div>` : ''}
      ${ocupa ? `<button class="btn sm ocup" data-i="${i}">🚧 ${T('Aparelho ocupado? Trocar')}</button>` : ''}
      ${!t && !sc && !s.programa_treino_id && ultBase?.kg == null && !(pir && e.porSerie) && !sets.some(x => x.done) ? `<p class="muted small">${T('1ª vez nesse? Escolhe um peso que dá pra fazer todas as reps com folga e anota.')} ${/anilha|leg press|leg 45|smith|hack/i.test(e.nome) ? T('Anilhas: anota a soma das anilhas (sem contar a barra ou o aparelho).') : /halter|dumbbell|goblet|kettle/i.test(e.nome) ? T('Halter: anota o peso de um.') : /m[aá]quina|cadeira|mesa|leg|polia|cabo|puxada|graviton|panturrilha|abdu|adu|crucifixo|voador/i.test(e.nome) ? T('Máquina: anota o número da placa.') : ''}</p>` : ''}
      ${!t && !sc && e.ultima?.kg != null ? `<div class="row between mt" style="gap:8px"><p class="muted small" style="flex:1">${pir ? T('Última vez (série mais pesada):') : T('Última vez:')} <b style="color:var(--fg)">${dec(e.ultima.kg)} kg × ${e.ultima.reps ?? '–'}</b>.${pir ? '' : ' ' + (topoMeta(e.reps) && repsNum(e.ultima.reps) != null ? (repsNum(e.ultima.reps) >= topoMeta(e.reps) ? T('Fez as {n}: tenta subir um pouco.', { n: topoMeta(e.reps) }) : T('Mantém o peso e busca as {n}.', { n: topoMeta(e.reps) })) : T('Fácil? Sobe a carga.'))}</p><button class="btn ghost sm hist" data-i="${i}">${T('histórico')}</button></div>` : ''}
    </div>`;
  };
  const hint = passo.length > 3 ? t('Circuito: faz um exercício atrás do outro, do <b>A1</b> ao <b>A{n}</b>. Descansa só no fim da volta.', { n: passo.length }) : t(passo.length > 2 ? 'Tri-set: faz uma série do <b>A1</b>, emenda no <b>A2</b> e no <b>A3</b>. Descansa só depois do A3.' : bi ? 'Bi-set: faz uma série do <b>A1</b> e emenda direto no <b>A2</b>. Descansa só depois do A2.'
    : tempo(s.exs[passo[0]].reps) ? 'Exercício de tempo: toca no <b>▶</b> que eu conto pra você.'
    : s.exs[passo[0]].descanso_s ? 'Terminou a série? <b>Toca no ⏱ da linha</b>: marca a série como feita e já começa o descanso.' : 'Terminou a série? <b>Toca no ✓</b> pra marcar.');
  const ok = passo.every(i => s.feito[i]), ultimo = s.p === s.passos.length - 1;
  const abertos = rotaAtual === 'sessao' && s.pMais === s.p ? new Set($$('.bloco details.mais[open]').map(d => d.closest('.bloco').dataset.i)) : new Set(); s.pMais = s.p; // redesenhou (trocou o exercício, sem peso): o "Dica e opções" aberto continua aberto
  render(`<div class="view fx sessao"><div class="topbar"><button class="back" id="sair">⏸ ${t('Pausar treino')}</button><span class="pill" id="clock">${fmtMin(Math.floor((Date.now() - s.inicio) / 1000))}</span></div>
  <div class="row between"><span class="muted">${esc(nomeCurto(s.titulo))}${s.express ? ' · ⚡ ' + t('Express') : ''}${bi ? ' · <span style="white-space:nowrap">' + (passo.length > 3 ? t('Circuito') : passo.length > 2 ? t('Tri-set') : t('Bi-set')) + '</span>' : ''}</span><span class="muted">${totalTxt(s)}</span></div>
  <div class="bar"><i style="width:${Math.min(100, obrigatorios(s).filter(i => completo(s, i)).length / Math.max(1, obrigatorios(s).length) * 100)}%"></i></div>
  <div class="passos" role="tablist" aria-label="${t('Ir direto pra um exercício')}">${s.passos.map((g, j) => `<button class="${j === s.p ? 'on' : ''} ${g.every(i => completo(s, i)) ? 'ok' : ''}" data-passo="${j}" aria-label="${esc(s.exs[g[0]].nome)}">${g.every(i => completo(s, i)) ? '✓' : g.every(i => opcional(s.exs[i])) ? '+' : g.every(i => s.exs[i].aq === true) ? 'R' : g.map(i => s.exs[i].ordem ?? j + 1).filter((v, x, a) => a.indexOf(v) === x).join('-')}</button>`).join('')}</div>
  ${s.corrigir && s.corrigir.p !== s.p && s.passos[s.corrigir.p] && Date.now() - s.corrigir.em < 180000 ? `<button class="back small" id="corr" style="color:var(--accent);align-self:flex-start;min-height:40px">‹ ${t('Corrigir {x}', { x: esc(s.exs[s.passos[s.corrigir.p][0]].nome) })}</button>` : ''}
  ${bi || (seriesFeitas(s) < 3 && !s.dicaOk) ? `<p class="restHint">${hint}</p>` : ''}
  ${passo.map(bloco).join('<div class="sep"></div>')}
  <div class="card row between" style="margin-top:6px"><div><b style="font-size:0.9375rem">${passo.length > 3 ? t('Volta concluída?') : passo.length > 2 ? t('Tri-set concluído?') : bi ? t('Bi-set concluído?') : t('Exercício concluído?')}</b><p class="muted">${ultimo ? t('É o último: marca que eu fecho o treino.') : t('Marca que eu já puxo o próximo.')}</p></div><button class="sw ${ok ? 'on' : ''}" id="sw" aria-label="${t('Concluir')}"></button></div>
  ${ultimo ? `<button class="btn" id="fin">✓ ${t('Finalizar treino')}</button>` : ''}
  <div class="row" style="gap:8px">${s.p > 0 ? `<button class="btn ghost sm" id="prev" style="flex:1">‹ ${t('Anterior')}</button>` : ''}${!ultimo ? `<button class="btn ghost sm" id="pular" style="flex:1">${ok ? t('Seguir pro próximo') : t('Pular exercício')} ›</button>` : ''}</div>
  <button class="link-fim" id="fim">${t('Encerrar treino')}</button></div>`);
  abertos.forEach(i => { const d = $(`.bloco[data-i="${i}"] details.mais`); if (d) d.open = true; });
  if (prox) { const b = $(`.set[data-i="${prox[0]}"][data-k="${prox[1]}"] .rest`); if (b) b.classList.add('next'); }
  clearInterval(clockIv); ultToque = Math.max(ultToque, Date.now() - 1000); clockIv = setInterval(() => { const c = $('#clock'); if (c) c.textContent = fmtMin(Math.floor((Date.now() - s.inicio) / 1000));
    // Celular largado no banco (saiu correndo atrás do filho sem pausar): 10 min sem toque e nada rodando = pausa sozinho e solta a tela
    const parado = Math.max(ultToque, s.descansoAte || 0);
    if (!document.hidden && rotaAtual === 'sessao' && S.sessao === s && !descansoAtivo() && !trabalhoFim() && Date.now() - parado > INATIVO) { s.pausadoEm = Math.max(parado + FORA_TOL, s.inicio); salvaSessao(); go('home'); toast(t('Pausei seu treino: ficou 10 min parado. O tempo parado não conta, e tá tudo salvo.'), false, { fixo: true }); }
  }, 1000);
  // Recarregou ou voltou com o descanso rodando: ele reaparece minimizado com o tempo que falta
  if (s.descansoAte && !descansoAtivo()) { const l = Math.ceil((s.descansoAte - Date.now()) / 1000); if (l > 0) { descanso(l, s.descansoTxt); if (voltouDaPausa) minimizarDescanso(); } else { s.descansoAte = null; salvaSessao(); } }
  $$('.set input').forEach(inp => inp.oninput = () => {
    const i = +inp.closest('.set').dataset.i, k = +inp.closest('.set').dataset.k, f = inp.dataset.f;
    // "40kg" vira 40; nas reps o drop "12+4+4" pode (soma tudo na hora de salvar). Letra não entra (antes sumia sem aviso).
    const limpo = f === 'kg' ? inp.value.replace(/[^\d.,]/g, '') : inp.value.replace(/[^\d+]/g, '');
    if (limpo !== inp.value) inp.value = limpo;
    s.sets[i][k][f] = inp.value;
    // carga digitada vale pras próximas séries ainda vazias (menos na pirâmide, que sobe a cada série)
    if (f === 'kg' && !piramide(s.exs[i].reps)) s.sets[i].forEach((st, j) => { if ((j > k && !st.done && !st.kgMan) || (j < k && st.done && st.kg === '')) { st.kg = inp.value; const x = $(`.set[data-i="${i}"][data-k="${j}"] input[data-f="kg"]`); if (x) x.value = inp.value; } }); // e preenche as anteriores já marcadas sem kg
    if (f === 'kg') s.sets[i][k].kgMan = true;
    if (s.sets[i][k].done) guardaCargaDo(s, i); // corrigiu uma série já feita: a "Última" acompanha
    salvaSessao();
  });
  $$('.set input').forEach(inp => {
    inp.onfocus = () => setTimeout(() => { try { inp.select(); } catch {} }, 0); // tocou pra corrigir: substitui, não emenda (12 → 1122)
    inp.onkeydown = ev => { if (ev.key !== 'Enter') return; ev.preventDefault(); const todos = $$('.set input'), j = todos.indexOf(inp); if (todos[j + 1]) todos[j + 1].focus(); else inp.blur(); };
  });
  $$('.rest').forEach(b => b.onclick = () => tocar(+b.dataset.i, +b.dataset.k));
  // Recarregou (ou o Android fechou o app) com o cardio rodando: continua de onde estava, minimizado
  if (s.trab && !descansoAtivo() && s.sets[s.trab.i]?.[s.trab.k] && !s.sets[s.trab.i][s.trab.k].done) {
    if (s.trab.congelado != null) { const jf = s.trab.congelado; delete s.trab.congelado; tocar(s.trab.i, s.trab.k, jf, true); } else {
    const jf = Math.floor((Date.now() - s.trab.ini) / 1000);
    if (jf < s.trab.tot) { tocar(s.trab.i, s.trab.k, jf); minimizarDescanso(); } else { marcarFeita(s, s.trab.i, s.trab.k); s.trab = null; salvaSessao(); setTimeout(() => routes.sessao(), 0); } }
  }
  async function tocar(i, k, jaFeito = 0, pausadoIni = false) {
    const e = s.exs[i], st = s.sets[i][k];
    if (s.trab && s.trab.i === i && s.trab.k === k && trabalhoFim()) return abrirTimer(); // cardio já rodando: só abre, não recomeça
    if (st.done) { // toque de novo desfaz (toque duplo sem querer, não)
      if (Date.now() - (st.feitaEm || 0) < 1000) return;
      const fe = st.feitaEm || 0; st.done = false; delete s.feito[i]; // desmarcou: o exercício volta a faltar (não conta como completo)
      // A "Última" no celular volta a ser a das séries que continuam marcadas (ou a de antes do treino)
      const cs = db.LS.get('cargas', {}), nm = st.nome || e.nome; if (s.sets[i].some(x => x.done)) guardaCargaDo(s, i); else if (cs[nm]?.sessao === s.chave) { if (e.ultima?.kg != null && nm === e.nome) cs[nm] = { ...e.ultima, sessao: null }; else delete cs[nm]; db.LS.set('cargas', cs); }
      // Desmarcou a série que abriu o descanso: o descanso para (ela não fez a série)
      if (descansoAtivo() && s.descansoAte && fe >= Math.max(...Object.values(s.sets).flat().filter(x => x.done).map(x => x.feitaEm || 0), 0)) { pararDescanso(); s.descansoAte = null; }
      salvaSessao(); routes.sessao(); return toast(T('Série {n} desmarcada. Toca de novo pra marcar.', { n: k + 1 }));
    }
    const t = tempo(e.reps);
    if (!t) {
      // O que aparece no campo é o que fica salvo: sugestão vira o número de verdade (dá pra corrigir depois)
      if (!semCarga(e) && st.kg === '') { const sug = sugKg(s, i, k); if (sug != null) st.kg = String(sug); }
      if (st.reps === '') { const r = repsAlvo(e.reps, k); if (r) st.reps = String(r); }
      const v = cargaEstranha(s, i, k);
      if (v != null) {
        if (await perguntar(T('Confere a carga'), T('{v} kg na série {n}? Parece bem mais que o normal.', { v: dec(v), n: k + 1 }), T('Corrigir'), T('Tá certo')) !== false) return corrigirCarga(s, i, k); /* "Corrigir" em destaque: toque rápido não confirma o erro */
        if (S.sessao !== s) return; st.kgOk = true;
      }
    }
    let parcial = 0;
    if (t) {
      const tot = porLado(e.reps) ? t * 2 : t, token = Date.now(); s.trab = { i, k, ini: Date.now() - jaFeito * 1000, tot, token }; salvaSessao();
      if (pausadoIni) toast(T('Seu cronômetro ficou parado em {t}. Toca em Continuar quando estiver pronta.', { t: fmtMin(jaFeito) }));
      const fim = await restTimer(tot - jaFeito, `${tc(e.nome)} · ${T('série {n}', { n: k + 1 })}`, 'Bora!', { meio: porLado(e.reps), intervalos: intervalosDe(e), jaFeito, pausadoIni, pausarTreino: () => { if (S.sessao === s && rotaAtual === 'sessao') $('#sair')?.click(); } });
      if (fim === 'congelado') return; // pausou o treino: o cronômetro fica guardado em s.trab
      if (s.trab?.token === token) s.trab = null;
      if (S.sessao !== s) return;
      if (fim?.cedo) { // tocou em "Já fiz" logo que começou
        const ja = await perguntar(T('Já tinha feito?'), T('O cronômetro mal começou. Você já fez os {x} antes de abrir?', { x: durTxt(porLado(e.reps) ? t * 2 : t) }), T('Sim, já fiz'), T('Não, começar agora'));
        if (S.sessao !== s) return;
        if (ja !== true) { salvaSessao(); return ja === false ? tocar(i, k) : undefined; }
      } else if (fim?.parcial) parcial = fim.parcial; else if (fim !== true) { salvaSessao(); return; }
    }
    marcarFeita(s, i, k); if (parcial) st.seg = parcial; salvaSessao();
    // Marcou série sem kg num exercício com carga: pergunta uma vez por exercício, na própria tela (não trava o descanso)
    if (!t && !semCarga(e) && e.aq !== true && st.kg === '' && !s.kgPerg?.[e.nome]) { s.kgPerg = { ...s.kgPerg, [e.nome]: { i, k } }; salvaSessao(); }
    if (parcial) toast(T('Registrei {t} de {x} ✓', { t: fmtMin(parcial), x: fmtMin(porLado(e.reps) ? t * 2 : t) }));
    if (rotaAtual !== 'sessao') return; // saiu do treino com o cardio rodando: os minutos ficam registrados, sem puxar ela de volta
    if (parcial && s.p === s.passos.length - 1) { routes.sessao(); return rolarProximo(); } // parou o cardio no meio do último exercício: fica na tela (ela decide se finaliza)
    const pos = fila.findIndex(([a, c]) => a === i && c === k), seguinte = fila.slice(pos + 1).find(([a, c]) => !s.sets[a][c].done && fila.slice(0, pos).every(([x, y]) => s.sets[x][y].done)) || fila.find(([a, c]) => !s.sets[a][c].done); // marcou fora de ordem (aparelho ocupado): a próxima é a 1ª que falta, não a que vem depois
    const ultimoDoPar = !bi || passo.indexOf(i) === passo.length - 1;
    if (!seguinte && passo.every(x => s.sets[x].every(z => z.done))) {
      routes.sessao();
      const p0 = s.p;
      return setTimeout(() => { if (S.sessao !== s || rotaAtual !== 'sessao' || s.p !== p0) return; const prx = s.passos[s.p + 1]; concluirPasso(); if (prx && e.descanso_s && S.sessao === s && rotaAtual === 'sessao') descanso(e.descanso_s, proxDescanso(s, null, s.p)); }, 450);
    }
    routes.sessao(); rolarProximo();
    const atrasada = Date.now() - (s.pulouEm || 0) < 8000; // pulou o descanso e já marcou a seguinte: tá só anotando o que já fez
    if (ultimoDoPar && e.descanso_s && !atrasada) { // também depois de série de tempo (prancha 30s → descanso 20s)
      const txt = seguinte ? proxDescanso(s, seguinte) : s.passos[s.p + 1] ? proxDescanso(s, null, s.p + 1) : T('Última série!');
      const r = await descanso(e.descanso_s, txt);
      if (r === false && S.sessao === s && !s.pausadoEm) s.pulouEm = Date.now();
      if (S.sessao === s && rotaAtual === 'sessao') rolarProximo();
    }
  }
  $$('.hist').forEach(a => a.onclick = ev => { ev.preventDefault(); abrirHistorico(s.exs[+a.dataset.i].nome); });
  // Troca o exercício de hoje (novo = nome do equivalente; sem nome = o botão "Trocar por"/"Voltar pro" de sempre)
  const trocar = async (i, novo) => {
    const e = s.exs[i];
    if (novo) { e.alternativa = novo; }
    // Trocar por um exercício que já está no treino mistura as cargas dos dois (pirâmide x drop): avisa antes
    const jaTem = e.alternativa && s.exs.findIndex((x, j) => j !== i && x.nome === e.alternativa);
    if (e.alternativa && jaTem >= 0) { const ok = await perguntar(t('Esse já está no seu treino'), t('{x} é também o exercício nº {n} de hoje. Se trocar, as cargas dos dois ficam juntas no histórico.', { x: e.alternativa, n: s.exs[jaTem].ordem ?? jaTem + 1 }), t('Trocar mesmo assim'), t('Manter o {x}', { x: e.nome })); if (!ok || S.sessao !== s) return; }
    if (e.alternativa) { e.trocadoDe = e.nome; e.nome = e.alternativa; e.alternativa = null; }
    else { e.alternativa = e.nome; e.nome = e.original; }
    e.ultima = db.LS.get('cargas', {})[e.nome] || null; e.porSerie = null;
    s.sets[i].forEach(st => { if (!st.done) { st.kg = ''; st.kgMan = false; } });
    salvaSessao(); routes.sessao(); window.scrollTo(0, 0); toast(e.nome === e.original ? t('Voltou pro original') : t('Trocado por {x} (só hoje)', { x: e.nome }), false, { curto: true }); // fica no título do exercício novo
    const nome = e.nome;
    if (piramide(e.reps)) rapido(db.ultimasSeries(S.perfil.id, nome), null, 6000).then(ps => { if (ps && S.sessao === s && e.nome === nome) { e.porSerie = ps; salvaSessao(); if (rotaAtual === 'sessao' && !document.activeElement?.matches('input')) routes.sessao(); } });
    rapido(db.ultimaCarga(S.perfil.id, nome), null, 6000).then(u => { if (u && S.sessao === s && e.nome === nome) { e.ultima = u; salvaSessao(); if (rotaAtual === 'sessao' && !document.activeElement?.matches('input')) routes.sessao(); } });
  };
  $$('.swap').forEach(b => b.onclick = () => trocar(+b.dataset.i));
  // Aparelho ocupado: mostra 2 exercícios equivalentes pra fazer no lugar (só hoje)
  $$('.ocup').forEach(b => b.onclick = async () => {
    const i = +b.dataset.i, e = s.exs[i], opts = equivalentes(e.nome, e.alternativa, e.original, s.exs.map(x => x.nome));
    if (!opts.length) return toast(t('Sem equivalente cadastrado. Faz outro exercício e volta nesse depois.'), false, { curto: true });
    const r = await escolher(t('{x} ocupado?', { x: tc(e.nome) }), t('Faz um desses no lugar, só hoje:'), [...opts.map(x => tc(x)), t('Cancelar')]);
    if (r < 0 || r >= opts.length || S.sessao !== s) return;
    await trocar(i, opts[r]);
  });
  $('#sw').onclick = async function () {
    if (this.dataset.ocupado) return; // toque duplo não pula o próximo exercício (nem abre a pergunta duas vezes)
    const p0 = s.p, bt = this; bt.dataset.ocupado = '1'; const solta = () => { delete bt.dataset.ocupado; };
    if (passo.every(i => s.feito[i])) return concluirPasso(); // já concluído (voltou com Anterior): o toque segue pro próximo, não desfaz
    // Marcou só parte das séries (o kg já aparece copiado nas outras): pergunta antes de jogar fora as que ela fez
    const faltamSeries = passo.reduce((a, i) => a + s.sets[i].filter(x => !x.done).length, 0);
    if (faltamSeries && passo.some(i => s.sets[i].some(x => x.done))) {
      const o = await escolher(tp(faltamSeries, 'Falta marcar {n} série', 'Falta marcar {n} séries'), t('Você fez e só esqueceu de marcar? O que tá escrito nelas vai junto.'), [t('Fiz todas, marcar'), t('Só as que marquei')]);
      if (S.sessao !== s || o < 0 || s.p !== p0) return solta();
      if (o === 0) passo.forEach(i => s.sets[i].forEach((x, k) => { if (!x.done) marcarFeita(s, i, k); }));
      salvaSessao();
    }
    // Ligou a chave sem marcar nenhuma série: pergunta em vez de contar um exercício que não foi feito
    if (!passo.some(i => s.sets[i].some(x => x.done))) {
      const fez = await perguntar(t('Nenhuma série marcada'), t('Você fez esse exercício e só esqueceu de marcar?'), t('Fiz, marcar as séries'), t('Não fiz, pular'));
      if (S.sessao !== s || fez == null || s.p !== p0) return solta(); // voltar do celular: não faz nada
      if (fez) passo.forEach(i => s.sets[i].forEach((_, k) => marcarFeita(s, i, k)));
      else { s.p++; salvaSessao(); if (s.p >= s.passos.length) { s.p--; solta(); return confirmarFim(); } routes.sessao(); return window.scrollTo(0, 0); }
    }
    this.classList.add('on'); setTimeout(() => { if (S.sessao === s && s.p === p0) concluirPasso(); }, 300);
  };
  if ($('#fin')) $('#fin').onclick = confirmarFim;
  $$('[data-dor]').forEach(b => b.onclick = () => { const nome = s.exs[+b.dataset.dor].nome; s.dor = s.dor || []; if (s.dor.includes(nome)) { s.dor = s.dor.filter(x => x !== nome); toast(t('Dor desmarcada')); } else { s.dor.push(nome); toast(t('Anotei: dor em {x}. Se doer de novo, para esse exercício (pode pular). O Igor recebe isso no fim do treino.', { x: nome })); } salvaSessao(); routes.sessao(); });
  // "Anotar o peso?": anotar põe o cursor no kg da série marcada; "Não uso peso" tira a coluna de kg (só pergunta uma vez)
  $$('[data-kganota]').forEach(b => b.onclick = () => { const e = s.exs[+b.dataset.kganota], q = s.kgPerg[e.nome]; s.kgPerg[e.nome] = 1; salvaSessao(); routes.sessao(); const x = $(`.set[data-i="${q.i}"][data-k="${q.k}"] input[data-f="kg"]`); if (x) { x.scrollIntoView({ block: 'center' }); x.focus(); } });
  $$('[data-kgsem]').forEach(b => b.onclick = () => { const i = +b.dataset.kgsem, e = s.exs[i]; s.kgPerg[e.nome] = 1; marcarSemPeso(e.nome, true); s.sets[i].forEach(x => { if (!x.done) x.kg = ''; }); salvaSessao(); routes.sessao(); toast(T('Beleza: tirei a coluna de kg desse exercício.'), false, { curto: true }); });
  $$('[data-sempeso]').forEach(b => b.onclick = () => { const e = s.exs[+b.dataset.sempeso], vira = !semCarga(e); marcarSemPeso(e.nome, vira); if (vira) s.sets[+b.dataset.sempeso].forEach(st => { if (!st.done) st.kg = ''; }); salvaSessao(); routes.sessao(); });
  // Fez uma série a mais (ou a menos) que o planejado
  $$('[data-mais]').forEach(b => b.onclick = () => { const i0 = +b.dataset.mais, alvo = passo.includes(i0) && bi ? passo : [i0]; const n0 = s.sets[i0].length; alvo.forEach(i => { const l = s.sets[i]; if (l.length > n0) return; const u = l[l.length - 1]; l.push({ kg: u?.kg || '', reps: '', done: false }); delete s.feito[i]; }); salvaSessao(); routes.sessao(); }); // bi-set: a série a mais vale pro A1 e pro A2
  $$('[data-menos]').forEach(b => b.onclick = () => { const i = +b.dataset.menos, l = s.sets[i]; if (l.length > 1 && !l[l.length - 1].done) { l.pop(); salvaSessao(); routes.sessao(); } });
  $$('[data-passo]').forEach(b => b.onclick = () => { const j = +b.dataset.passo; if (j === s.p) return; s.p = j; salvaSessao(); routes.sessao(); window.scrollTo(0, 0); });
  if ($('#prev')) $('#prev').onclick = () => { s.p--; salvaSessao(); routes.sessao(); window.scrollTo(0, 0); };
  if ($('#pular')) $('#pular').onclick = () => { s.p++; salvaSessao(); routes.sessao(); window.scrollTo(0, 0); };
  $('#fim').onclick = confirmarFim;
  if ($('#corr')) $('#corr').onclick = () => { s.p = s.corrigir.p; s.corrigir = null; salvaSessao(); routes.sessao(); window.scrollTo(0, 0); };
  $('#sair').onclick = () => { go('home'); toast(t('Treino pausado. O relógio parou, continua quando quiser.')); };
};
// Histórico de carga de um exercício (no treino, na lista do treino e em Evolução > Minhas cargas)
// ex (opcional): o exercício do treino → vira a ficha dele (como fazer + vídeo + cargas)
async function abrirHistorico(nome, ex) {
  const temCarga = !ex || (!tempo(ex.reps) && !semCarga(ex));
  overlay(`<div class="modal" id="hm" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:8px;margin-top:20px"><h2>${esc(tc(nome))}</h2>
    ${ex ? `<p class="muted">${ex.series > 1 ? t('{n} séries ×', { n: ex.series }) + ' ' : ''}${esc(tc(ex.reps))}${ex.descanso_s ? ' · ' + t('descanso {n}s', { n: ex.descanso_s }) : ''}</p>${explicaReps(ex.reps) ? `<p class="muted small">${esc(explicaReps(ex.reps))}</p>` : ''}${ex.dica ? `<p class="dica">${esc(tc(ex.dica))}</p>` : ''}${ex.video_url ? `<button class="btn sm" data-vid="${esc(ex.nome)}" data-url="${esc(ex.video_url)}" data-dica="${esc(ex.dica || '')}">▶ ${t('Ver como fazer')}</button>` : `<p class="muted small">🎬 ${t('O vídeo desse ainda tá sendo gravado.')}</p><button class="btn sm" data-duvida="${esc(ex.nome)}">? ${t('Tirar dúvida da execução com a IA')}</button>`}` : ''}
    ${temCarga ? `<h3 style="margin-top:8px">${t('Suas cargas')}</h3><p class="muted small">${t('A maior carga de cada dia que você fez esse exercício.')}</p><div id="hl"><p class="muted">${t('Carregando…')}</p></div>` : ''}<button class="btn ghost sm" id="hc" style="margin-top:6px">${t('Fechar')}</button></div></div>`);
  $('#hc').onclick = closeOverlay; $('#hm').addEventListener('click', x => { if (x.target.id === 'hm') closeOverlay(); });
  if (!temCarga) return;
  const c = db.LS.get('cargas', {})[nome];
  let h = await rapido(db.historicoCarga(S.perfil.id, nome, 8), null);
  const doCelular = !h?.length && c; if (!h?.length) h = c ? [c] : []; // sem sinal: o que tem no celular
  const hl = $('#hl'); if (!hl) return;
  // Gráfico com o número em cima e a data embaixo (mais antigo à esquerda); dia que ela parou no meio = "parcial"
  const mx = Math.max(...h.map(x => +x.kg || 0), 1), linha = [...h].slice(0, 6).reverse(), maxSets = Math.max(0, ...h.filter(x => !x.express).map(x => x.sets?.length || 0));
  const mn = Math.min(...linha.map(x => +x.kg || 0)), ml = Math.max(...linha.map(x => +x.kg || 0)), barraKg = kg => ml === mn ? 40 : 10 + ((+kg - mn) / (ml - mn)) * 50; // escala do menor ao maior: 24 → 28 kg aparece subindo
  const parcial = x => !x.express && x.sets?.length && x.sets.length < maxSets; // Express (menos séries de propósito) não é dia parcial
  hl.innerHTML = h.length ? `${linha.length > 1 ? `<div class="row" style="align-items:flex-end;gap:6px;height:104px;margin:6px 0 4px">${linha.map(x => `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;height:100%"><b style="font-size:0.875rem">${dec(x.kg)}</b><i style="display:block;width:100%;height:${barraKg(x.kg)}px;background:var(--accent);border-radius:4px;opacity:${parcial(x) ? .45 : .9}"></i><span class="muted small">${fmtData(x.data)}</span></div>`).join('')}</div><p class="muted small">${t('kg · mais antigo à esquerda, mais recente à direita')}</p>` : ''}
    ${h.map((x, j) => { const ant = h.slice(j + 1).find(y => !parcial(y)), d = ant && !parcial(x) ? +x.kg - +ant.kg : 0; return `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line);gap:8px"><span class="muted">${fmtData(x.data)}${parcial(x) ? ` · ${t('parcial ({a} de {b})', { a: x.sets.length, b: maxSets })}` : ''}${x.sets?.length > 1 ? `<br><span class="small">${x.sets.map(z => z.reps != null ? t('{kg} kg, {n} vezes', { kg: dec(z.kg), n: z.reps }) : `${dec(z.kg)} kg`).join(' · ')}</span>` : ''}</span><span class="row" style="gap:6px;flex-shrink:0"><b style="white-space:nowrap">${dec(x.kg)} kg × ${x.reps ?? '–'}</b>${d ? `<span style="white-space:nowrap;font-size:0.875rem;font-weight:600;color:${d > 0 ? 'var(--accent)' : 'var(--muted)'}">${d > 0 ? '+' : '−'}${dec(Math.abs(d))} kg</span>` : ''}${x.sessao_id ? `<button class="back small" data-apaga="${esc(x.sessao_id)}" aria-label="${t('Apagar')}" style="color:var(--muted);padding:0 6px">✕</button>` : ''}</span></div>`; }).join('')}
    ${doCelular ? `<p class="muted small mt">${t('Sem internet: mostrando a última carga guardada no celular.')}</p>` : ''}` : `<p class="muted">${t('Quando você anotar o peso durante o treino, ele aparece aqui.')}</p>`;
  $$('[data-apaga]', hl).forEach(b => b.onclick = async () => {
    if (!(await perguntar(t('Apagar esse registro?'), t('Use pra corrigir um número digitado errado. As séries desse exercício nesse dia somem do histórico.'), t('Apagar'), t('Manter')))) return abrirHistorico(nome, ex);
    try { await db.apagarCarga(b.dataset.apaga, nome); const cs = db.LS.get('cargas', {}); const resto = h.filter(x => x.sessao_id !== b.dataset.apaga); if (resto[0]) cs[nome] = { kg: +resto[0].kg, reps: resto[0].reps, data: resto[0].data }; else delete cs[nome]; db.LS.set('cargas', cs); toast(t('Registro apagado ✓'));
      const sa = S.sessao; if (sa) { const nova = resto.length ? db.escolheUltima?.(resto) || cs[nome] || null : null; sa.exs.forEach(e => { if (e.nome === nome) { e.ultima = nova ? { kg: +nova.kg, reps: nova.reps, data: nova.data } : null; e.porSerie = null; } }); salvaSessao(); if (rotaAtual === 'sessao') routes.sessao(); } }
    catch (er) { toast(traduzErro(er), true); }
    abrirHistorico(nome, ex);
  });
}
// Próxima série fora da tela (bi-set comprido): rola até ela, sem ela precisar procurar
function rolarProximo() {
  const b = $('.rest.next'); if (!b) return; const r = b.getBoundingClientRect();
  if (r.top < 70 || r.bottom > innerHeight - 100) b.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
// "Última" guardada no celular = a série mais pesada do dia (o mesmo critério do histórico e de Minhas cargas)
function guardaCargaDo(s, i) {
  const todas = s.sets[i].filter(x => x.done && x.kg !== ''); if (!todas.length || semCarga(s.exs[i])) return;
  const validas = s.sets[i].filter((x, k) => x.done && x.kg !== '' && bateuMeta(x.reps, s.exs[i].reps, k));
  const nome = todas[todas.length - 1].nome || s.exs[i].nome, ok = todas.filter(x => (x.nome || s.exs[i].nome) === nome);
  // Dia parcial (parou no meio) não passa por cima da última carga completa
  const doEx = s.sets[i].filter(x => (x.nome || s.exs[i].nome) === nome), atual = db.LS.get('cargas', {})[nome];
  if (ok.length < doEx.length && atual && atual.sessao !== s.chave) return;
  const boas = ok.filter(x => validas.includes(x)); if (!boas.length && atual && atual.sessao !== s.chave) return; // nenhuma bateu a meta: a referência continua a anterior
  const x = (boas.length ? boas : ok).reduce((a, b) => (numero(b.kg) ?? 0) > (numero(a.kg) ?? 0) ? b : a); db.guardarCarga(nome, numero(x.kg), repsNum(x.reps), s.chave);
}
// Sugestão de carga da série: pirâmide usa a da mesma série da última vez; na 1ª vez herda o peso da série anterior (não grava série sem carga)
function sugKg(s, i, k) { const e = s.exs[i], st = s.sets[i][k]; if (!piramide(e.reps)) return e.ultima?.kg; const u = e.porSerie?.[serieN(e, k)]; if (u != null) return u; const ant = s.sets[i].slice(0, k).reverse().find(x => x.kg !== '' && (x.nome || e.nome) === (st.nome || e.nome)); return ant ? numero(ant.kg) : null; }
// Cartão do "Próximo" no descanso (Igor 30/10): exercício novo = nome grande + séries, reps e última carga; mesmo exercício = "série 2 de 3"
function proxDescanso(s, seguinte, pi) {
  const limpa = e => tc(e.nome.replace(/\s*·\s*reconhecimento$/i, ''));
  if (seguinte) {
    const [a, c] = seguinte, e = s.exs[a], tot = s.sets[a].length, nome = limpa(e), kg = semCarga(e) || tempo(e.reps) ? null : s.sets[a][c].kg !== '' ? numero(s.sets[a][c].kg) : sugKg(s, a, c);
    return { tipo: 'serie', nome, titulo: c === tot - 1 ? `${T('Última série!')} · ${nome}` : T('Próxima: série {n} de {t} · {x}', { n: c + 1, t: tot, x: nome }), detalhe: kg != null ? T('carga: {kg} kg', { kg: dec(kg) }) : '', texto: T('Próxima: {x} · série {n}', { x: nome, n: c + 1 }) };
  }
  const g = s.passos[pi]; if (!g) return T('Última série!');
  const e = s.exs[g[0]], nomes = g.map(i => limpa(s.exs[i])).join(' + '), n = s.sets[g[0]].length, reps = String(e.reps || '');
  const detalhe = [tp(n, '{n} série', '{n} séries'), reps ? (/^[\d\s/+-]+$/.test(reps) ? T('{r} reps', { r: reps }) : tc(reps)) : '', !semCarga(e) && !tempo(e.reps) && e.ultima?.kg != null ? T('última vez {kg} kg', { kg: dec(e.ultima.kg) }) : ''].filter(Boolean).join(' · ');
  const tec = tecnicaDe(e).split(' · ')[0]; // só a 1ª técnica, curta: é pra ela se preparar, não pra ler
  return { tipo: 'exercicio', nome: nomes, detalhe, dica: tec ? tc(tec).slice(0, 90) : '', texto: T('Próximo: {x}', { x: nomes }) };
}
// Carga que parece erro de digitação (300 kg na puxada, 30 → 300 entre as séries): devolve o valor pra conferir, ou null
function cargaEstranha(s, i, k) {
  const e = s.exs[i], st = s.sets[i][k]; if (semCarga(e) || tempo(e.reps) || st.kgOk) return null;
  const v = numero(st.kg), hojeMax = Math.max(0, ...s.sets[i].filter((x, j) => j !== k && x.done).map(x => numero(x.kg) || 0)), ref = Math.max(+e.ultima?.kg || 0, hojeMax); // 30 kg na série 1 e 300 na 2: pergunta também
  return v != null && (v > 400 || (ref && v > ref * 2.5 && v - ref > 20)) ? v : null;
}
// "Corrigir": limpa o número errado (e as cópias dele nas séries de baixo) e põe o cursor no campo
function corrigirCarga(s, i, k) {
  const ruim = s.sets[i][k].kg; s.sets[i].forEach((x, j) => { if (j === k || (j > k && !x.done && !x.kgMan && x.kg === ruim)) { x.kg = ''; if (j === k) x.kgMan = false; } }); salvaSessao();
  if (rotaAtual !== 'sessao') return; if (s.passos[s.p] && !s.passos[s.p].includes(i)) { const p = s.passos.findIndex(g => g.includes(i)); if (p >= 0) s.p = p; }
  routes.sessao(); const x = $(`.set[data-i="${i}"][data-k="${k}"] input[data-f="kg"]`); if (x) { x.scrollIntoView({ block: 'center' }); x.focus(); }
}
function concluirPasso() {
  const s = S.sessao; if (!s) return; const passo = s.passos[s.p]; if (!passo) return go('fim');
  passo.forEach(i => { s.feito[i] = true; guardaCargaDo(s, i); }); s.corrigir = { p: s.p, em: Date.now() }; // 3 min pra voltar e corrigir a última série
  // Vai pro próximo que ainda falta (pulou o aparelho ocupado e voltou nele: não cai no que já fez)
  const pend = j => !s.passos[j].every(i => completo(s, i));
  let prox = s.passos.findIndex((g, j) => j > s.p && pend(j)), pulado = false;
  if (prox < 0) { const antes = s.passos.map((g, j) => j).filter(j => j < s.p && pend(j) && !s.passos[j].every(i => opcional(s.exs[i]))); prox = antes.length && antes.length <= 2 ? antes[0] : -1; pulado = prox >= 0; } // pulou muita coisa: o pop-up "Faltam N" decide
  // Acabou tudo: não fecha o treino sozinho com o app escondido (cardio acabou no bolso); se faltou algo, o pop-up pergunta
  if (prox < 0) { s.p = s.passos.length - 1; salvaSessao(); if (rotaAtual === 'sessao') routes.sessao(); return document.hidden ? undefined : confirmarFim(); }
  s.p = prox; salvaSessao();
  const ant = avisoAtual(), msg = `${passo.map(i => tc(s.exs[i].nome)).join(' + ')} ✓` + (pulado ? ' · ' + t('Faltou o {x}, que você pulou', { x: tc(s.exs[s.passos[prox][0]].nome) }) : ''); // aviso da volta ("tirei 3 min") não some: junta
  routes.sessao(); window.scrollTo(0, 0); toast(ant && !ant.txt.includes(msg) ? ant.txt + ' · ' + msg : msg, false, ant?.fixo ? { fixo: true } : { curto: !pulado && !ant });
}
function confirmarFim() {
  if (encerrarTrabalho()) return setTimeout(confirmarFim, 80); // cardio rodando: primeiro registra os minutos feitos
  const s = S.sessao;
  // Digitou kg/reps e esqueceu de tocar no ✓ (costume do Mfit): pergunta antes de jogar fora
  const preench = []; s.exs.forEach((e, i) => s.sets[i].forEach((x, k) => { if (!x.done && (x.reps !== '' || x.kgMan)) preench.push([i, k]); }));
  if (preench.length && !s.semMarcarOk) {
    const nomes = [...new Set(preench.map(([i]) => s.exs[i].nome))].join(', ');
    return escolher(tp(preench.length, '{n} série preenchida sem marcar', '{n} séries preenchidas sem marcar'), t('{x}: você digitou e não tocou no ✓. Marco como feitas?', { x: nomes }), [t('Marcar como feitas'), t('Não fiz essas')]).then(o => {
      if (o < 0 || S.sessao !== s) return;
      if (o !== 0) { s.semMarcarOk = true; salvaSessao(); return confirmarFim(); }
      // "Marcar como feitas" passa pela mesma conferência do ✓: 300 kg digitado e não marcado não vira "recorde"
      const marcar = () => {
        const estranha = preench.find(([i, k]) => cargaEstranha(s, i, k) != null);
        if (estranha) { const [i, k] = estranha; return perguntar(T('Confere a carga'), T('{x}: {v} kg na série {n}? Parece bem mais que o normal.', { x: s.exs[i].nome, v: dec(cargaEstranha(s, i, k)), n: k + 1 }), T('Corrigir'), T('Tá certo')).then(r => { if (S.sessao !== s) return; if (r !== false) { if (rotaAtual !== 'sessao') go('sessao'); return corrigirCarga(s, i, k); } s.sets[i][k].kgOk = true; salvaSessao(); marcar(); }); }
        preench.forEach(([i, k]) => marcarFeita(s, i, k)); [...new Set(preench.map(([i]) => i))].forEach(i => { if (s.sets[i].every(x => x.done)) s.feito[i] = true; guardaCargaDo(s, i); });
        salvaSessao(); if (rotaAtual === 'sessao') routes.sessao(); confirmarFim();
      };
      marcar();
    });
  }
  const n = feitosCount(s);
  // Mesma conta do "X de Y feitos": exercício pela metade ainda falta (opcional não conta como faltando)
  const obr = s.exs.map((e, i) => i).filter(i => !opcional(s.exs[i])), faltam = obr.filter(i => !completo(s, i)), meio = faltam.filter(i => s.sets[i].some(x => x.done)).length, falta = faltam.length;
  if (!falta) return go('fim');
  overlay(`<div class="modal" id="m"><div class="box" style="padding:18px;display:flex;flex-direction:column;gap:12px"><h2>${n && falta === 1 ? t('Falta 1 exercício: {x}', { x: esc(tc(s.exs[faltam[0]].nome)) }) + (meio ? ' ' + t('(pela metade)') : '') : n ? tp(falta, 'Falta {n} exercício', 'Faltam {n} exercícios') + (meio ? ' ' + tp(meio, '({n} pela metade)', '({n} pela metade)') : '') : t('Nenhuma série marcada')}</h2>
    <p class="muted">${n ? t('Quer encerrar assim mesmo? Fica no seu histórico, mas sem pontos: só treino completo pontua.') : t('Se encerrar agora, esse treino não conta. Quer continuar?')}</p>
    <button class="btn sm" id="volta">${t('Continuar treino')}</button><button class="btn ghost sm" id="enc">${n ? t('Encerrar e registrar') : s.dor?.length ? t('Avisar o Igor da dor e encerrar') : t('Descartar treino')}</button></div></div>`);
  $('#volta').onclick = closeOverlay;
  $('#enc').onclick = () => { closeOverlay(); if (n || s.dor?.length) go('fim'); else { sairDaSessao(); db.desfazerCargas(s.chave); S.sessao = null; db.LS.del('sessao'); toast(t('Treino descartado')); go('home'); } };
}
function seriesDaSessao(s) {
  const rows = [];
  // Cada série vai com o nome do exercício que ela fez de verdade (trocou no meio? cada uma no seu)
  s.exs.forEach((e, i) => s.sets[i].forEach((st, k) => { if (!st.done) return; const nome = st.nome || e.nome; const kg = st.kg; /* campo vazio = sem carga (o ✓ já preenche com a sugestão; se ela apagou, não grava escondido) */ rows.push({ exercicio_id: st.nome ? st.eid : (e.nome === e.original ? (e.id || null) : null), exercicio_nome: nome, n: serieN(e, k), kg: kg === '' || semCarga(e) ? null : numero(kg), reps: tempo(e.reps) ? null : st.reps !== '' ? repsNum(st.reps) : (repsAlvo(e.reps, k) || null), feita: true }); })); // série de tempo não inventa reps
  return rows;
}
// Guardou na fila com sinal (4G travado, treino começado sem sinal): já tenta mandar, sem esperar ela fechar o app.
const novaFila = item => { const f = db.LS.get('fila', []); f.push({ uid: Date.now() + '-' + Math.random().toString(36).slice(2, 7), dono: S.perfil?.id || null, em: Date.now(), ...item }); db.LS.set('fila', f); if (navigator.onLine !== false) setTimeout(sincronizarFila, 1500); };
// Feedback do fim: é uma tela com rota (voltar funciona) e o que ela escreve fica salvo.
routes.fim = () => {
  clearInterval(clockIv); soltarTela(); encerrarTrabalho(); pararDescanso(); const s = S.sessao; if (!s) return go('home');
  if (s.pausadoEm) { s.inicio += Date.now() - s.pausadoEm; s.pausadoEm = null; }
  if (!s.fimEm) s.fimEm = Date.now();
  s.fb = s.fb || {}; s.descansoAte = null; salvaSessao();
  const dur = Math.max(0, Math.floor((s.fimEm - s.inicio) / 1000)), n = feitosCount(s);
  // Opcional (HIIT) não conta: fez todo o resto = "Mandou bem!", 7 de 7
  const obr = s.exs.map((e, i) => i).filter(i => !opcional(s.exs[i])), nObr = obr.filter(i => completo(s, i)).length;

  const escala = (id, a, b) => `<div class="scale" id="${id}">${Array.from({ length: 11 }, (_, i) => `<button type="button" class="${s.fb[id] === i ? 'on' : ''}">${i}</button>`).join('')}</div><div class="row between muted small" style="margin-top:4px"><span>${a}</span><span>${b}</span></div>`;
  render(`<div class="view noTabs fx" style="padding-top:16px"><button class="back" id="volta" style="align-self:flex-start">‹ ${t('Voltar pro treino')}</button>
  ${s.dor?.length ? `<div class="card" style="border:1px solid var(--warn)"><b>⚠ ${t('Você anotou dor em {x}.', { x: esc(s.dor.map(tc).join(', ')) })}</b><p class="muted">${t('Vai junto com o seu recado pro Igor. Se quiser, conta mais embaixo.')}</p></div>` : ''}
  <div><p class="muted">${esc(nomeCurto(s.titulo))} · ${dur < 60 ? t('{n} s', { n: dur }) : t('{n} min', { n: Math.round(dur / 60) })} · ${t('{a} de {b}', { a: nObr, b: obr.length })}${opcFeito(s) ? ' + ' + t('opcional ✓') : ''}</p><h1>${nObr >= obr.length ? t('Mandou bem!') : t('Treino incompleto ({a} de {b})', { a: nObr, b: obr.length })}</h1>${nObr >= obr.length ? '' : `<div class="card" style="border:1.5px solid var(--warn);margin-top:8px"><p style="font-weight:600">${t('Treino incompleto fica no seu histórico, mas não soma pontos nem conta no desafio. Dá pra voltar e terminar.')}</p><p class="muted small mt">${t('Só fica registrado quando você tocar em Enviar, lá embaixo.')}</p></div>`}</div>
  <p class="muted small">${t('Esforço = quanto cansou. Nota = quanto você curtiu.')}</p><div id="esfBox"><label class="l">${t('Quanto esforço foi?')}</label>${escala('esf', t('0 · muito leve'), t('10 · no limite'))}</div>
  <div id="notaBox"><label class="l">${t('Que nota você dá pro treino?')}</label>${escala('nota', t('0 · não curti'), t('10 · amei'))}</div>
  <div class="field"><label class="l" for="fb">${t('Quer falar algo pro Igor? (opcional)')}</label><textarea class="input" id="fb" placeholder="${t('Senti a lombar no búlgaro... / Tá leve, pode subir carga...')}">${esc(s.fb.txt || '')}</textarea></div>
  <p class="err" id="e" hidden>${t('Marca o esforço e a nota, é rapidinho.')}</p>
  <button class="btn" id="env">${t('Enviar e gerar meu card')}</button><p class="muted center small">${t('O Igor vê isso no painel dele e te responde aqui no app.')}</p></div>`);
  $$('.scale').forEach(sc => sc.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; $$('button', sc).forEach(x => x.classList.remove('on')); b.classList.add('on'); s.fb[sc.id] = +b.textContent; salvaSessao(); sc.classList.remove('falta'); if ($('#esf .on') && $('#nota .on')) $('#e').hidden = true; });
  $('#fb').oninput = () => { s.fb.txt = $('#fb').value; salvaSessao(); };
  $('#volta').onclick = () => go('sessao');
  $('#env').onclick = async () => {
    if (!$('#esf .on') || !$('#nota .on')) { // diz qual falta e leva até ela
      const falta = !$('#esf .on') ? 'esf' : 'nota'; $('#e').textContent = !$('#esf .on') && !$('#nota .on') ? t('Marca o esforço e a nota, é rapidinho.') : falta === 'esf' ? t('Falta marcar o esforço ↑') : t('Falta a nota do treino ↑');
      $('#e').hidden = false; $$('.scale').forEach(x => x.classList.toggle('falta', !$('.on', x))); $('#' + falta + 'Box').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    $('#env').disabled = true; $('#env').textContent = t('Enviando…');
    const dor = s.dor?.length ? `⚠ dor: ${s.dor.join(', ')}` : ''; // em português pro Igor, em qualquer idioma do app
    // Recorde: carga maior que a melhor da última vez (a gente comemora no card)
    const recordes = s.exs.map((e, i) => { const mx = Math.max(0, ...s.sets[i].filter((x, k) => x.done && bateuMeta(x.reps, e.reps, k)).map(x => numero(x.kg) || 0)); return !semCarga(e) && e.ultima?.kg && mx > +e.ultima.kg ? `${e.nome} ${dec(mx)} kg` : null; }).filter(Boolean).slice(0, 3);
    const pontos = await enviarSessao(s, { esforco: +$('#esf .on').textContent, nota: +$('#nota .on').textContent, comentario: [$('#fb').value.trim(), dor].filter(Boolean).join(' · ') || null });
    const esfN = +$('#esf .on').textContent;
    go('card', JSON.stringify({ kcal: K.kcalFeito(S.perfil, Math.max(1, Math.round(dur / 60)), esfN, { hiit: s.exs.some((e, i) => /hiit|cardio/i.test(e.nome) && s.sets[i].some(x => x.done)) }), titulo: s.titulo, min: Math.max(1, Math.round(dur / 60)), seg: Math.round(dur), ex: completosCount(s), total: obr.length, series: seriesFeitas(s), completo: nObr >= obr.length, quando: s.registrarEm || diaDoTreino(s, s.fimEm || Date.now()), recordes, pontos, express: !!s.express, hiit: s.exs.some((e, i) => /hiit|cardio/i.test(e.nome) && s.sets[i].some(x => x.done)) }));
    if (!pontos) toast(navigator.onLine === false ? t('Sem internet agora, mas tá guardado no celular. Envio sozinha quando o sinal voltar.') : t('Sem conexão com o servidor agora (internet lenta ou Wi-Fi sem internet): tá guardado no celular e eu envio sozinha.'));
  };
};
// Treino pausado no domingo à noite e terminado na segunda: conta no dia em que ela fez a maioria das séries.
function diaDoTreino(s, fim) {
  const em = Object.values(s.sets).flat().filter(x => x.done && x.feitaEm).map(x => x.feitaEm).sort((a, b) => a - b);
  if (!em.length) return fim;
  const meio = em[Math.floor(em.length / 2)], dia = diaLocal(meio);
  return dia === diaLocal(fim) ? fim : Math.max(...em.filter(x => diaLocal(x) === dia));
}
// Manda o treino pro banco (ou pra fila, sem sinal). As séries substituem as que já estiverem lá: reenviar nunca duplica.
// STRAVA --------------------------------------------------------------------------------
// Ligar uma vez; ao finalizar o treino o app lança a atividade lá (Musculação). Os tokens ficam só no servidor.
async function cartaoStrava() {
  const box = $('#stv'); if (!box) return;
  const pinta = (html) => { if ($('#stv')) $('#stv').innerHTML = `<div class="row between"><b style="font-size:0.9375rem">Strava</b>${html.pill || ''}</div>${html.corpo}`; };
  let st = null; try { st = await db.strava.status(); db.LS.set('strava_on', !!st.conectado); } catch { /* sem sinal: mostra o último estado */ }
  if (!st) return pinta({ corpo: `<p class="muted">${t('Sem internet agora. Volta aqui com sinal pra ver o Strava.')}</p>` });
  if (!st.configurado) return pinta({ corpo: `<p class="muted">${t('O Igor ainda tá ligando o Strava. Em breve você conecta por aqui.')}</p>` });
  if (!st.conectado) {
    pinta({ corpo: `<p class="muted">${t('Quando você finalizar o treino, ele já aparece no seu Strava. Você autoriza uma vez e pode desligar quando quiser.')}</p><button class="btn sm" id="stvOn" style="margin-top:8px">${t('Conectar com Strava')}</button>` });
    $('#stvOn').onclick = async () => { const b = $('#stvOn'); b.disabled = true; try { const { url } = await db.strava.url(); location.href = url; } catch (e) { b.disabled = false; toast(e?.codigo === 'nao_configurado' ? t('O Igor ainda tá ligando o Strava. Em breve você conecta por aqui.') : t('Não deu pra conectar o Strava agora. Tenta de novo.'), true); } };
    return;
  }
  const auto = db.LS.get('strava_auto', true);
  pinta({ pill: `<span class="pill good">${t('Conectado')}</span>`, corpo: `<p class="muted">${t('Conectado como {x}.', { x: esc(st.atleta || 'Strava') })}</p><label class="row" style="gap:8px;margin-top:8px"><input type="checkbox" id="stvAuto" ${auto ? 'checked' : ''}> <span class="small">${t('Lançar meus treinos no Strava quando eu finalizar')}</span></label><p class="muted small">${t('Se o seu relógio já manda a musculação pro Strava, desliga aqui pra não duplicar.')}</p><button class="btn ghost sm" id="stvOff" style="margin-top:8px;width:auto">${t('Desconectar')}</button>` });
  $('#stvAuto').onchange = e => db.LS.set('strava_auto', e.target.checked);
  $('#stvOff').onclick = async () => { try { await db.strava.desconectar(); db.LS.set('strava_on', false); toast(t('Strava desconectado.')); cartaoStrava(); } catch { toast(t('Não deu pra desconectar agora. Tenta de novo.'), true); } };
}
// Lança o treino finalizado no Strava (se ela conectou e deixou ligado). Silencioso: nunca atrapalha o fim do treino.
function lancarNoStrava(s, patch) {
  if (DEMO && !db.strava) return; if (!db.LS.get('strava_on', false) || !db.LS.get('strava_auto', true)) return;
  const d = new Date(s.inicio), z = n => String(n).padStart(2, '0');
  const inicio = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
  db.strava.enviar({ chave: String(s.chave || s.id), titulo: nomeTreino(s.titulo), inicio, duracao_s: patch.duracao_s, descricao: `${patch.exercicios_feitos}/${patch.exercicios_total} exercícios · Igor Sousa Team 💪` }).catch(e => { if (e?.codigo === 'reconectar' || e?.codigo === 'nao_conectado') db.LS.set('strava_on', false); });
}
async function enviarSessao(s, fb) {
  s.enviada = true; salvaSessao();
  const fim = s.fimEm || s.pausadoEm || s.ult || Date.now();
  const obr = obrigatorios(s), obrT = obr.length ? obr : s.exs.map((e, i) => i);
  const patch = { duracao_s: Math.max(0, Math.floor((fim - s.inicio) / 1000)), exercicios_feitos: obrT.filter(i => completo(s, i)).length, exercicios_total: obrT.length, esforco: fb.esforco ?? null, nota: fb.nota ?? null, comentario: [s.express ? '⚡ Express' : '', fb.comentario || ''].filter(Boolean).join(' · ') || null, finalizada_em: new Date(s.registrarEm || diaDoTreino(s, fim)).toISOString() };
  const series = seriesDaSessao(s); let pontos = true, seriesOk = false;
  const item = () => ({ s: { titulo: s.titulo, treino_id: s.treino_id, programa_treino_id: s.programa_treino_id || null, total: s.exs.length }, sid: s.local ? null : s.id, seriesOk, series, patch });
  try {
    if (s.local) { novaFila(item()); pontos = false; }
    else { await comLimite(db.salvarSeries(s.id, series), 12000); seriesOk = true; await comLimite(db.finalizarSessao(s.id, patch), 12000); }
  } catch (er) { pontos = false; novaFila(item()); }
  lancarNoStrava(s, patch);
  if (S.sessao === s) { S.sessao = null; db.LS.del('sessao'); }
  S.sessoes = null;
  return pontos;
}
// Envia o que ficou guardado sem sinal. Uma de cada vez, sem duplicar: cada item sai da fila assim que sobe,
// e a sessão já criada no banco é reaproveitada (não cria outra).
let sincronizando = false;
const erroDeRede = er => /fetch|network|Failed|lento|timeout|offline|load failed/i.test(String(er?.message || er || ''));
async function sincronizarFila() {
  if (sincronizando || !S.perfil || S.perfil.role === 'admin' || navigator.onLine === false) return; sincronizando = true; let enviados = 0, evs = 0, velhos = 0; let L = p => comLimite(p, 15000); // Wi-Fi sem internet: chamada pendurada não trava a fila pra sempre
  const atualiza = (uid, patch) => db.LS.set('fila', db.LS.get('fila', []).map(x => x.uid === uid ? { ...x, ...patch } : x));
  try {
    // Item sem dono (versão antiga do app) fica com quem está logado agora
    db.LS.set('fila', db.LS.get('fila', []).map((x, j) => ({ ...x, uid: x.uid || 'u' + Date.now() + j, dono: x.dono || S.perfil.id })));
    for (const it0 of db.LS.get('fila', []).filter(x => x.dono === S.perfil.id)) {
      const it = db.LS.get('fila', []).find(x => x.uid === it0.uid); if (!it) continue;
      const lim = 15000 * 2 ** Math.min(it.lentas || 0, 2); L = p => comLimite(p, lim); // 4G que conecta mas é lento: cada volta espera mais (15 → 30 → 60 s), senão nunca sobe
      try {
        if (it.tipo === 'pontos') await L(db.registrarPontos(S.perfil.id, it.motivo, it.pontos, it.ref));
        else if (it.tipo === 'evolucao') {
          const fotos = (await idb('readonly', st => st.get(it.idb)).catch(() => null)) || {};
          await L(db.salvarEvolucao(S.perfil.id, it.row, fotos));
          if (it.pontos) await db.registrarPontos(S.perfil.id, 'evolucao', 80, it.ref).catch(() => {});
          idb('readwrite', st => st.delete(it.idb)).catch(() => {}); evs++;
        } else {
          let sid = it.sid;
          if (!sid) { const sess = await L(db.iniciarSessao(S.perfil.id, { treino_id: it.s.treino_id || null, programa_treino_id: it.s.programa_treino_id || null, titulo: it.s.titulo, total: it.s.total || 0 })); sid = sess.id; atualiza(it.uid, { sid }); }
          if (!it.seriesOk) { await L(db.salvarSeries(sid, it.series || it.s.series || [])); atualiza(it.uid, { seriesOk: true }); }
          await L(db.finalizarSessao(sid, it.patch)); enviados++; if (!it.em || Date.now() - it.em > 90000) velhos++;
        }
        db.LS.set('fila', db.LS.get('fila', []).filter(x => x.uid !== it.uid));
      } catch (er) {
        if (erroDeRede(er)) { if (/lento/.test(String(er?.message))) atualiza(it.uid, { lentas: (it.lentas || 0) + 1 }); break; } // sem sinal: tenta tudo de novo depois, na mesma ordem
        // Erro do banco (ex.: o Igor republicou o treino e o id antigo sumiu): reenvia sem os ids, pelo nome, e segue pros próximos
        const s0 = it.s ? { ...it.s, treino_id: null, programa_treino_id: null } : it.s, series = (it.series || []).map(r => ({ ...r, exercicio_id: null }));
        atualiza(it.uid, { s: s0, series, sid: it.falhas ? null : it.sid, seriesOk: false, falhas: (it.falhas || 0) + 1 });
      }
    }
  } finally { sincronizando = false; }
  if (enviados) { toast(velhos ? t('Treino feito sem sinal foi enviado ✓') : t('Registrado ✓')); if (rotaAtual === 'home') routes.home(); }
  else if (evs) { toast(t('Registro do mês enviado ✓')); if (rotaAtual === 'evolucao') routes.evolucao(); }
}
// Enquanto tiver coisa na fila, tenta de novo de tempo em tempo e quando ela volta pro app (não só no evento "online").
setInterval(() => { if (db.LS.get('fila', []).some(daFila)) sincronizarFila(); }, 45000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && db.LS.get('fila', []).some(daFila)) sincronizarFila(); });

// CARD -------------------------------------------------------------------------
routes.card = async (arg) => { try { ['800 54px "Barlow Condensed"', '500 30px Barlow', '700 48px Barlow'].forEach(f => document.fonts?.load(f)); } catch {} // fontes do story já carregam aqui: no toque, o compartilhar sai na hora (iPhone recusa se demorar)
  const d = JSON.parse(arg || '{}'); const sessoes = await sessoesComFila(S.perfil); const st = streakDias(sessoes);
  const data = dataLocal(d.quando || Date.now(), { day: 'numeric', month: 'short' }); // treino registrado depois: a data do dia em que ela treinou
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="home">‹ ${t('Início')}</button>${d.completo === false ? `<span class="pill quebra">${t('incompleto: sem pontos')}</span>` : d.pontos === false ? `<span class="pill quebra">${t('pontos quando a internet voltar')}</span>` : `<span class="pill on">${t('+{n} pts', { n: 50 })}</span>`}</div>
  <div class="share"><div class="row between"><div class="logo sm">IGOR SOUSA <b>TEAM</b></div><span class="pill">${data}</span></div>
    <div><div class="logo" style="font-size:2.5rem">${d.ex === 0 || d.completo === false ? t('Treino<br>registrado') : t('Treino<br>feito')} <b>✓</b></div><div class="row wrap" style="gap:6px 18px;margin-top:14px"><div class="big" style="font-size:1.875rem">${d.seg != null && d.seg < 60 ? '&lt;1' : d.min}<small> ${t('min')}</small></div>${d.kcal ? `<div class="big" style="font-size:1.875rem">~${num(d.kcal)}<small> kcal</small></div>` : ''}${d.ex === 0 && d.series ? `<div class="big" style="font-size:1.875rem">${d.series}<small> ${tp(d.series, 'série', 'séries')}</small></div>` : `<div class="big" style="font-size:1.875rem">${d.completo === false && d.total ? `${d.ex}/${d.total}` : d.ex}<small> ${tp(d.completo === false && d.total ? d.total : d.ex, 'exercício', 'exercícios')}</small></div>`}<div class="big" style="font-size:1.875rem;color:var(--accent)">🔥${st.semanas}<small> ${tp(st.semanas, 'semana seguida', 'semanas seguidas')}</small></div></div>
    <p class="muted mt small">${esc(primeiroNome(S.perfil.nome))} · ${esc(nomeCurto(d.titulo))} · ${esc(C.INSTAGRAM)}</p></div></div>
  ${d.recordes?.length && d.completo !== false ? `<div class="card" style="border:1px solid var(--accent)"><b>🏆 ${tp(d.recordes.length, 'Recorde!', 'Recordes!')}</b><p class="muted">${esc(d.recordes.join(' · '))} · ${t('mais do que da última vez')}</p></div>` : ''}
  ${d.completo === false ? `<button class="btn ghost sm" data-go="evolucao">${t('Minha evolução')}</button>` : `<div class="row"><button class="btn sm" style="flex:1" id="share">${t('Postar no story')}</button><button class="btn ghost sm" style="flex:1" data-go="evolucao">${t('Minha evolução')}</button></div>
  <button class="btn ghost sm" id="shareFoto">📸 ${t('Story com a sua foto de fundo')}</button>`}
  ${d.titulo === 'Cardio 20 min' || d.hiit || d.express || d.ex === 0 || d.completo === false ? '' : `<button class="btn ghost sm" data-go="assistente" data-arg='${esc(JSON.stringify({ pergunta: t('Me passa um cardio de 20 minutos pra fazer agora'), contexto: 'Ela acabou de terminar o ' + (d.titulo || 'treino') + '.', enviar: true, cardio: true }))}'>🔥 ${t('Quer um cardio de 20 min agora?')}</button>`}
  ${A.lembreteSuportado() && !A.lembreteLigado() && Notification.permission === 'default' && !db.LS.get('lembretePerg') ? `<div class="card" id="lemb"><b style="font-size:0.9375rem">🔔 ${t('Quer que eu te lembre se passar uns dias sem treinar?')}</b><p class="muted">${t('Um aviso carinhoso, sem cobrança. Dá pra desligar no Perfil.')}</p><div class="row mt"><button class="btn ghost sm" id="lembN" style="flex:1">${t('Agora não')}</button><button class="btn sm" id="lembS" style="flex:1">${t('Quero')}</button></div></div>` : ''}
  <p class="muted center small">${t('Cada story é um convite pra sua amiga entrar no time.')}</p>${amigaBtn(S.perfil)}</div>`, 'home');
  if ($('#lemb')) { $('#lembN').onclick = () => { db.LS.set('lembretePerg', Date.now()); $('#lemb').remove(); }; $('#lembS').onclick = async () => { db.LS.set('lembretePerg', Date.now()); const r = await A.ligarLembrete(); $('#lemb')?.remove(); toast(msgLembrete(r)); }; }
  // Story fala o grupo do treino ("Quadríceps"), não só "Treino A"; em cima, o recorde ou o treino da semana
  const dadosCard = () => {
    const tr = (S.plano?.treinos || []).find(x => d.titulo === `Treino ${x.letra}`), wk = isoWeek(new Date(d.quando || Date.now()));
    const nSem = sessoes.filter(x => isoWeek(new Date(x.finalizada_em)) === wk && treinoCompleto(x) && /^Treino [A-Z]$/.test(x.titulo || '')).length;
    const destaque = d.recordes?.length ? '🏆 ' + d.recordes[0] : d.completo !== false && tr && nSem ? t('{n}º treino da semana', { n: nSem }) : '';
    return { nome: primeiroNome(S.perfil.nome), titulo: tr?.nome ? `${nomeTreino(d.titulo)} · ${tr.nome}` : nomeCurto(d.titulo), minutos: d.seg != null && d.seg < 60 ? '<1' : d.min, exercicios: d.ex, series: d.series, streak: st.semanas, data, insta: C.INSTAGRAM, completo: d.completo !== false, total: d.total, destaque };
  };
  if ($('#shareFoto')) $('#shareFoto').onclick = async () => {
    const bt = $('#shareFoto'), rot = bt.textContent; if (bt.disabled) return; bt.disabled = true; bt.textContent = t('Gerando imagem…');
    let blob = null; try { blob = await cardImagem({ ...dadosCard(), transparente: true, modo: 'blob' }); } catch {} finally { if (document.body.contains(bt)) { bt.disabled = false; bt.textContent = rot; } }
    if (!blob) return toast(t('Não consegui gerar a imagem agora. Tira um print dessa tela e posta 😉'), true);
    artePorCima(blob);
  };
  if ($('#share')) $('#share').onclick = async () => {
    const bt = $('#share'), rot = bt.textContent; if (bt.disabled) return; bt.disabled = true; bt.textContent = t('Gerando imagem…');
    let r; try { r = await cardImagem(dadosCard()); } catch { r = 'erro'; } finally { if (document.body.contains(bt)) { bt.disabled = false; bt.textContent = rot; } }
    if (r === 'erro') return toast(t('Não consegui gerar a imagem agora. Tira um print dessa tela e posta 😉'), true);
    if (r === 'cancel') return;
    pontosStory(r);
  };
};

// Arte sem fundo (igual Strava): ela copia, abre o story com a foto dela e cola por cima.
function artePorCima(blob) {
  const url = URL.createObjectURL(blob), podeCopiar = !!(navigator.clipboard?.write && window.ClipboardItem);
  overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px;margin-top:16px">
    <h2>${t('Story com a sua foto')}</h2>
    <div class="xadrez"><img src="${url}" alt="${t('Arte do treino sem fundo')}"></div>
    <ol class="passos-ig"><li>${podeCopiar ? t('Toca em <b>Copiar a arte</b>.') : t('Toca em <b>Salvar a arte</b>.')}</li><li>${t('No Instagram, abre o story e escolhe a sua foto.')}</li><li>${podeCopiar ? t('Toca em <b>Aa</b>, segura o dedo na tela e escolhe <b>Colar</b>. A arte entra por cima da foto: é só ajustar o tamanho.') : t('Toca no ícone de figurinha, escolhe a arte que você salvou e ajusta o tamanho.')}</li></ol>
    ${podeCopiar ? `<button class="btn" id="copiaArte">${t('Copiar a arte')}</button>` : ''}
    <button class="btn ${podeCopiar ? 'ghost' : ''} sm" id="salvaArte">${t('Salvar a arte')}</button>
    <button class="btn ghost sm" id="c">${t('Fechar')}</button></div></div>`);
  const fecha = () => { closeOverlay(); URL.revokeObjectURL(url); };
  $('#c').onclick = fecha;
  const ok = r => { pontosStory(r); };
  if ($('#copiaArte')) $('#copiaArte').onclick = async () => {
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast(t('Arte copiada ✓ Agora abre o story e cola por cima da sua foto.')); $('#copiaArte').textContent = t('Copiada ✓'); ok('shared'); }
    catch { toast(t('Não deu pra copiar aqui. Toca em Salvar a arte.'), true); }
  };
  $('#salvaArte').onclick = async () => {
    const file = new File([blob], 'treino-feito-sem-fundo.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); ok('shared'); return; } catch (e) { if (e?.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); ok('download');
  };
}
// +30 do story (card do treino e resumo da semana, mesmo limite do dia). Avisa da imagem na hora; os pontos chegam depois.
async function pontosStory(r) {
  const ref = diaLocal(), onde = r === 'download' ? (/iPhone|iPad|iPod/.test(navigator.userAgent) ? t('Imagem salva em Arquivos › Downloads: abre ela, toca em compartilhar e escolhe o Instagram.') : t('Imagem salva no celular (Downloads/Galeria): abre o Instagram e escolhe ela.')) + ' ' : t('Card pronto!') + ' ';
  const fila = () => { novaFila({ tipo: 'pontos', motivo: 'story', pontos: 30, ref }); return t('Os +30 pts entram quando a internet voltar.'); };
  if (navigator.onLine === false) return toast(onde + fila());
  const reg = comLimite(db.registrarPontos(S.perfil.id, 'story', 30, ref), 8000).catch(() => null);
  let ok = await Promise.race([reg, new Promise(res => setTimeout(() => res('lento'), 1500))]), junto = true;
  if (ok === 'lento') { toast(onde.trim()); junto = false; ok = await reg; }
  const msg = ok === null ? fila() : ok ? t('+{n} pts', { n: 30 }) : t('(os pontos do story de hoje já foram contados)');
  toast(junto ? onde + msg : msg);
}
// Indicar amiga pelo WhatsApp, com a mensagem pronta e o código dela
function amigaBtn(p, soBotao = false) {
  if (!p?.cod_indicacao) return '';
  const msg = t('Tô treinando com o Igor Sousa e tô amando! Quando for assinar, fala pro Igor que foi indicação minha (código {c}) 🧡', { c: p.cod_indicacao });
  return `<a class="btn ghost sm ${soBotao ? 'mt' : ''}" style="width:100%;border-color:var(--wa);color:var(--fg)" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">💬 ${t('Chamar minha amiga no WhatsApp')}</a>`;
}
const msgLembrete = r => r === 'negado' ? t('Sem permissão. Dá pra ligar nos ajustes do celular.') : r === 'ok' ? t('Lembretes ligados ✓') : r === 'instalar' ? t('Quase lá: adiciona o app à tela inicial pra o aviso funcionar.') : t('Seu navegador não suporta. No iPhone: Compartilhar → Adicionar à Tela de Início.');
// " · ~210 kcal" (vazio se faltar peso)
const kcalTxt = k => k ? ` · ~${t('{n} kcal', { n: num(k) })}` : '';
// TREINO ESQUECIDO ABERTO ------------------------------------------------------------
// 1h30 depois de começar sem finalizar: o servidor manda um aviso no celular (função push) e, quando ela abre o app,
// pergunta se já terminou. Uma vez por treino. (Mais de 12 h: o boot já trata como "treino pela metade".)
async function perguntaTreinoAberto() {
  const s = S.sessao; if (!s || s.fimEm || s.pausadoEm || s.perguntouFim || document.querySelector('#overlay .modal')) return; // pausado de propósito: não empurra a fechar
  const comecou = +String(s.chave || '').replace('local-', '') || s.inicio; const passou = Date.now() - comecou;
  if (!(passou > 90 * 60000 && passou < 12 * 3600000)) return;
  s.perguntouFim = true; salvaSessao();
  const hora = new Date(comecou).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' });
  const c = contaObr(s), inc = c.a < c.b, metade = c.a < c.b / 2; // incompleto não pontua: não promete pontos; faltando muito, "continuar" vem em destaque
  const txt = t('Seu {x} tá aberto desde as {h}. Se já acabou, finaliza pra registrar.', { x: nomeTreino(s.titulo), h: hora }) + (inc ? ' ' + t('{a} de {b} feitos: incompleto fica no histórico, mas não pontua.', c) : ' ' + t('Finalizando, entram os pontos.'));
  const ops = metade ? [t('Ainda tô treinando'), t('Já terminei, finalizar')] : [t('Já terminei, finalizar'), t('Ainda tô treinando')];
  let o = await escolher(t('Terminou o treino? 💪'), txt, ops); if (metade && o >= 0) o = 1 - o;
  if (o === 0) { if (!s.fimEm) { s.fimEm = s.ult || Date.now(); s.pausadoEm = null; salvaSessao(); } go('fim'); }
}
// Inscreve o celular pros avisos com o app fechado (só se ela já liberou notificação). 1x por dia, em silêncio.
async function ativarPush() {
  try {
    if (DEMO || !('serviceWorker' in navigator) || !('PushManager' in window) || Notification.permission !== 'granted' || !S.perfil || S.perfil.role === 'admin') return;
    const hoje = diaLocal(); if (db.LS.get('pushEm') === hoje) return;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) { const k = await db.push.chave(); const raw = Uint8Array.from(atob(k.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((k.length + 3) % 4)), c => c.charCodeAt(0)); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw }); }
    await db.push.inscrever(sub.toJSON()); db.LS.set('pushEm', hoje);
  } catch { /* função ainda não publicada ou sem sinal: tenta de novo amanhã/no próximo treino */ }
}
// Conteúdo do Igor em outra língua: o que o glossário não dá conta, a IA traduz e a tela se atualiza sozinha
if (!DEMO && db.traduzir) ligarTradutor((id, textos) => db.traduzir(id, textos));
let redesenho = null;
window.addEventListener('traducoes', () => { clearTimeout(redesenho); redesenho = setTimeout(() => { if (!rotaAtual || !routes[rotaAtual] || ['sessao', 'fim', 'assistente', 'login', 'entrada'].includes(rotaAtual) || document.querySelector('#overlay .modal') || document.activeElement?.matches?.('input,textarea')) return; routes[rotaAtual](argAtual); }, 300); });
// Alarme do descanso pelo servidor: no iPhone, com a tela apagada, é o único jeito de tocar e vibrar
{ const ps = new URLSearchParams(location.search), q = ps.get('strava'); if (q) { ps.delete('strava'); history.replaceState(null, '', location.pathname + (ps.toString() ? '?' + ps : '') + location.hash); setTimeout(() => { if (q === 'ok') { db.LS.set('strava_on', true); toast(t('Strava conectado ✓ O próximo treino que você finalizar vai pro seu Strava.')); } else toast(q === 'sem_permissao' ? t('Pra lançar os treinos, o Strava precisa da permissão de publicar. Tenta de novo e deixa essa opção marcada.') : t('Não deu pra conectar o Strava agora. Tenta de novo.'), true); }, 1200); } }
if (!DEMO) ligarAvisoRemoto({
  agendar: d => (S.perfil && S.perfil.role !== 'admin' ? db.push.descanso(d) : Promise.resolve(false)),
  cancelar: id => db.push.cancelarDescanso(id).catch(() => {}),
  inscrever: () => { db.LS.del('pushEm'); ativarPush(); }
});
// HYROX NA ACADEMIA (opcional, 3 níveis, troca todo mês) ---------------------------------
const cardHyrox = mini => `<button class="lib ${mini ? 'mini' : ''}" data-go="hyrox" style="background-image:url(icons/hyrox_s.jpg)"><b>${t('Hyrox')}</b><span>${t('Na academia · 3 níveis')}</span></button>`;
const importaHyrox = () => import('./hyrox.js').catch(() => import('./hyrox.js?r=' + Date.now())).catch(() => { toast(t('Sem internet pra abrir agora. Depois da 1ª vez abre sem sinal.'), true); return null; });
const nivelHyrox = () => { const n = db.LS.get('hyroxNivel', null); return n && n.dono === S.perfil?.id ? n.id : null; };
routes.hyrox = async (trocar) => {
  const H = await importaHyrox(); if (!H) { if (rotaAtual === 'hyrox') go('lib', null, { hist: false }); return; } if (rotaAtual !== 'hyrox') return;
  const nv = trocar === 'nivel' ? null : nivelHyrox(), topo = `<div class="topbar"><button class="back" data-go="lib">‹ ${t('Programas')}</button><h2>${t('Hyrox')}</h2></div>`;
  if (!nv) {
    render(`<div class="view fx">${topo}<div class="lib" style="aspect-ratio:16/9;background-image:url(icons/hyrox_s.jpg)"><b style="font-size:26px">${t('Hyrox na academia')}</b><span>${t('8 km de corrida + 8 estações, adaptado pra academia comum')}</span></div>
    <p class="muted">${t('Qual é o seu nível agora? Dá pra trocar quando quiser.')}</p>
    ${H.NIVEIS.map(x => `<button class="card hy-nivel" data-nv="${x.id}" style="width:100%;text-align:left;color:var(--fg);border:1px solid ${x.id === nivelHyrox() ? 'var(--accent)' : 'var(--line)'}"><b>${t(x.nome)}</b><p class="muted">${t(x.sub)}</p></button>`).join('')}</div>`, 'home');
    $$('[data-nv]').forEach(b => b.onclick = () => { db.LS.set('hyroxNivel', { id: b.dataset.nv, dono: S.perfil?.id }); go('hyrox', null, { hist: false }); });
    return;
  }
  const f = H.faseDoMes(), fase = H.FASES[f], nome = H.NIVEIS.find(x => x.id === nv)?.nome, treinos = H.treinosDoMes(nv);
  const linha = e => `${e.series > 1 ? (e.circuito ? t('{n} voltas ×', { n: e.series }) : t('{n} séries ×', { n: e.series })) + ' ' : ''}${esc(tc(e.reps))}`;
  render(`<div class="view fx">${topo}
  <div class="card hero" style="color:#1a0d00"><span class="pill" style="background:rgba(0,0,0,.18);color:#1a0d00">${t('Fase do mês')} · ${t('{a} de {b}', { a: f + 1, b: 3 })}</span>
    <div class="logo" style="font-size:1.9rem;margin:8px 0 2px;color:#1a0d00">${t(fase.nome)}</div><p style="font-weight:600">${t(fase.txt)}</p>
    <button class="btn dark sm" style="margin-top:8px" data-go="hyrox" data-arg="nivel">${t('Nível')}: ${t(nome)} · ${t('trocar')}</button></div>
  ${treinos.map((tr, ti) => { const exs = tr.exercicios; return `<div class="card"><div class="row between"><div><b>${esc(tc(tr.nome))}</b><p class="muted">${T('{n} min', { n: tr.duracao_min })}${kcalTxt(K.kcalTreino(S.perfil, exs, tr.duracao_min))}</p></div><button class="btn sm" data-ht="${ti}">${T('Iniciar')}</button></div>
    <div class="mt">${exs.map((e, j) => `<div class="ex${e.circuito ? ' hy-circ' : ''}"><div class="n">${e.ordem}</div><button class="t" data-hf="${ti}-${j}"><b>${esc(tc(e.nome))}</b><span>${linha(e)}${e.circuito && e.descanso_s ? ' · ' + t('descanso {n}s no fim da volta', { n: e.descanso_s }) : ''}</span></button></div>`).join('')}</div></div>`; }).join('')}
  <div class="card"><b>${t('Como encaixar na semana')}</b><p class="muted">${t('Faz 1 ou 2 desses por semana, além do seu treino do mês. Os itens ligados são um circuito: faz um atrás do outro e só descansa no fim da volta.')}</p></div>
  <div class="card" style="border:1px solid var(--accent)"><b>⚠ ${t('Cuidado com o joelho')}</b><p class="muted">${t('No Hyrox, a maioria das lesões vem de excesso de volume, principalmente no joelho. Dor que piora durante o treino: para e chama o Igor. Já teve lesão antes? Começa no Iniciante.')}</p></div>
  <p class="muted center small">${t('Treino novo todo mês. Sem o aparelho? Toca no exercício e troca pela opção.')}</p></div>`, 'home');
  $$('[data-ht]').forEach(b => b.onclick = () => { const tr = treinos[+b.dataset.ht]; b.disabled = true; iniciarSessao({ titulo: `Hyrox · ${tr.nome}`, exercicios: tr.exercicios, duracao_min: tr.duracao_min }).finally(() => { b.disabled = false; }); });
  $$('[data-hf]').forEach(b => b.onclick = () => { const [ti, j] = b.dataset.hf.split('-').map(Number); const e = treinos[ti].exercicios[j]; abrirHistorico(e.nome, e); });
};
// SPINNING GUIADO ---------------------------------------------------------------------
const cardSpin = mini => `<button class="lib ${mini ? 'mini' : ''}" data-go="spin" style="background-image:url(icons/spin_s.jpg)"><b>${t('Spinning')}</b><span>${t('Aulas guiadas · 10 a 30 min')}</span></button>`;
// Spinning sem sinal e sem o app instalado ainda: o import falha; avisa e tenta de novo com outro endereço
const importaSpin = () => import('./spin.js').catch(() => import('./spin.js?r=' + Date.now())).catch(() => { toast(t('Sem internet pra abrir as aulas agora. Depois da 1ª vez elas abrem sem sinal.'), true); return null; });
routes.spin = async (filtro) => {
  const SP = await importaSpin(); if (!SP) { if (rotaAtual === 'spin') go('lib', null, { hist: false }); return; } if (rotaAtual !== 'spin') return;
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="lib">‹ ${t('Programas')}</button><h2>${t('Spinning')}</h2></div>${SP.htmlLista(filtro, S.perfil)}</div>`, 'home');
  $$('[data-dur]').forEach(b => b.onclick = () => go('spin', b.dataset.dur || '', { hist: false }));
  $$('[data-spin]').forEach(b => b.onclick = e => { e.stopPropagation(); go('spinAula', b.dataset.spin); });
};
// Aula pela metade guardada no celular (12 h): recarregou ou o Android fechou o app, ela continua de onde parou
const spinGuardada = () => { const g = db.LS.get('spinAberta', null); return g && g.dono === S.perfil?.id && Date.now() - g.em < 12 * 3600000 ? g : null; };
const fezSpin = (g, a) => Math.max(0, Math.round((g.feito || 0) + (a.blocos[g.i]?.seg || 0) - (g.resta || 0)));
// Abriu o app com uma aula pela metade: continuar, registrar ou descartar (pergunta uma vez)
async function ofereceSpin() {
  const g = spinGuardada(); if (!g || g.perguntou || S.sessao || document.querySelector('#overlay .modal')) return;
  db.LS.set('spinAberta', { ...g, perguntou: true });
  const SP = await importaSpin(), a = SP?.AULAS.find(x => x.id === g.id); if (!a) return db.LS.del('spinAberta');
  if (rotaAtual !== 'home') return;
  const seg = fezSpin(g, a), total = a.blocos.reduce((x, b) => x + b.seg, 0);
  const o = await escolher(t('Aula pela metade'), t('Sua aula {x} ficou em {t}.', { x: SP.nomeAula(a), t: fmtMin(seg) }), [t('Continuar a aula'), ...(seg >= 60 ? [t('Registrar o que pedalei')] : []), t('Descartar')]);
  if (o === 0) return go('spinAula', a.id);
  if (o < 0) return;
  db.LS.del('spinAberta'); if (o === 1 && seg >= 60) { registraSpin(a, seg, total); toast(seg >= total * 0.9 ? t('Aula registrada ✓') : t('Aula registrada ✓ (incompleta não pontua)')); if (rotaAtual === 'home') routes.home(); }
}
// Só aula quase inteira (90%) conta como treino completo (pontos, desafio, semana), igual à regra do treino
function registraSpin(a, seg, total) {
  if (seg < 60) return false; // menos de 1 min pedalando não vira treino
  const completa = seg >= total * 0.9, titulo = `Spinning · ${a.nome} ${a.min}`, fim = new Date().toISOString();
  novaFila({ s: { titulo, total: 1 }, sid: null, seriesOk: true, series: [], patch: { duracao_s: seg, exercicios_feitos: completa ? 1 : 0, exercicios_total: 1, finalizada_em: fim } });
  S.sessoes = null; return true;
}
routes.spinAula = async (id) => {
  const SP = await importaSpin(); if (!SP || rotaAtual !== 'spinAula') return;
  const a = SP.AULAS.find(x => x.id === id); if (!a) return go('spin');
  pararSpin?.();
  render(`<div class="view fx spin-view"><div class="topbar"><button class="back" id="sVolta">‹ ${t('Aulas')}</button><span class="pill">${t('Spinning')} · ${t('{n} min', { n: SP.duracaoAula(a) })}</span></div>${SP.htmlPlayer(a, S.perfil)}</div>`);
  const feitoTela = (seg, total, registrado) => {
    const completa = registrado && seg >= total * 0.9, semSinal = registrado && navigator.onLine === false, mins = Math.max(1, Math.round(seg / 60));
    render(`<div class="view fx"><div class="card hero" style="color:#1a0d00;text-align:center"><div class="logo" style="font-size:2.4rem;color:#1a0d00">${completa ? t('Aula feita!') + ' 🔥' : registrado ? t('Boa, registrado!') : t('Aula pulada')}</div><p style="font-weight:700;font-size:1.1rem">${seg < 60 ? t('{n} s pedalando', { n: seg }) : t('{n} min pedalando', { n: mins })}${kcalTxt(SP.kcalFeitoSpin(S.perfil, a, seg))}</p><p style="font-weight:600">${esc(SP.nomeAula(a))}</p></div>
    <p class="muted center">${!registrado ? t('Menos de 1 min pedalando não conta como treino.') : completa ? t('Bebe água e alonga a panturrilha e o quadril. Conta como treino da semana.') : t('Aula incompleta fica no seu histórico, mas não pontua nem conta na semana.')}${semSinal ? ' ' + t('Sem internet agora: tá guardado no celular e eu envio quando o sinal voltar.') : ''}</p>
    ${registrado ? `<button class="btn" id="spStory">${t('Postar no story')}</button>` : ''}<button class="btn ${registrado ? 'ghost' : ''}" data-go="home">${t('Voltar pro início')}</button><button class="btn ghost" data-go="spin">${t('Ver outras aulas')}</button></div>`, 'home');
    if ($('#spStory')) $('#spStory').onclick = async () => {
      const bt = $('#spStory'), rot = bt.textContent; if (bt.disabled) return; bt.disabled = true; bt.textContent = t('Gerando imagem…');
      const st = streakDias(await sessoesComFila(S.perfil).catch(() => [])), k = SP.kcalFeitoSpin(S.perfil, a, seg);
      let r; try { r = await cardImagem({ nome: primeiroNome(S.perfil.nome), titulo: `${t('Spinning')} · ${SP.nomeAula(a)}`, minutos: mins, exercicios: 1, series: 0, streak: st.semanas, data: dataLocal(Date.now(), { day: 'numeric', month: 'short' }), insta: C.INSTAGRAM, completo: completa, rotulo: completa ? t('AULA|FEITA') : t('AULA|REGISTRADA'), stat2: k ? [`~${num(k)}`, 'kcal'] : [`${a.blocos.length}`, t('blocos')] }); } catch { r = 'erro'; } finally { if (document.body.contains(bt)) { bt.disabled = false; bt.textContent = rot; } }
      if (r === 'erro') return toast(t('Não consegui gerar a imagem agora. Tira um print dessa tela e posta 😉'), true);
      if (r !== 'cancel') pontosStory(r);
    };
  };
  const g = spinGuardada(), retomar = g && g.id === a.id ? g : null;
  pararSpin = SP.iniciarPlayer(a, {
    manterTela: manterTelaAcesa, soltarTela, retomar,
    salvar: st => st ? db.LS.set('spinAberta', { ...st, dono: S.perfil?.id }) : db.LS.del('spinAberta'),
    aoTerminar: ({ seg, total }) => { pararSpin = null; db.LS.del('spinAberta'); const ok = registraSpin(a, seg, total); feitoTela(seg, total, ok); beep('fim'); },
    aoSair: async ({ seg, total, comecou, voltar }) => {
      if (!comecou) { pararSpin?.(); pararSpin = null; db.LS.del('spinAberta'); return go('spin'); }
      const o = await escolher(t('Sair da aula?'), seg >= 60 ? t('Você pedalou {n} min dessa aula.', { n: Math.round(seg / 60) }) : t('Você pedalou menos de 1 min: isso não conta como treino.'), seg >= 60 ? [t('Continuar pedalando'), t('Registrar e sair'), t('Sair sem registrar')] : [t('Continuar pedalando'), t('Sair')]);
      if (o <= 0 || rotaAtual !== 'spinAula') return voltar(); // voltar do celular no pop-up: continua a aula
      pararSpin?.(); pararSpin = null; db.LS.del('spinAberta');
      if (o === 1 && seg >= 60) { const ok = registraSpin(a, seg, total); return feitoTela(seg, total, ok); }
      go('spin');
    },
  });
  if (retomar) toast(t('Sua aula ficou pausada em {t}. Toca em Seguir quando estiver pronta.', { t: fmtMin(fezSpin(retomar, a)) }));
  $('#sVolta').onclick = () => $('#sSair').click();
};
// O TIME (comunidade) -----------------------------------------------------------------
routes.comunidade = async () => {
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="home">‹ ${t('Início')}</button><h2>${t('O time')}</h2></div><div class="card"><p class="muted">${t('Carregando…')}</p></div></div>`, 'home');
  const d = await rapido(db.comunidade(), null, 8000); if (rotaAtual !== 'comunidade') return;
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="home">‹ ${t('Início')}</button><h2>${t('O time')}</h2></div>
  ${d ? A.htmlTime(d) : `<div class="card"><b>${t('O time abre já já 🔥')}</b><p class="muted">${t('Sem conexão com o time agora. Tenta de novo daqui a pouco.')}</p><button class="btn ghost sm mt" id="tn" style="width:100%">↻ ${t('Tentar de novo')}</button></div>`}</div>`, 'home');
  if ($('#tn')) $('#tn').onclick = () => routes.comunidade();
};
// RESUMO DA SEMANA ---------------------------------------------------------------------
routes.semana = async (arg) => {
  const [key, aba] = String(arg || '').split('|'), p = S.perfil, k = key || isoWeek(new Date());
  const [sessoes, doBanco] = await Promise.all([sessoesComFila(p, 200), rapido(db.cargasRecentes(p.id), null, 4000)]);
  if (rotaAtual !== 'semana') return;
  const r = A.resumoSemana({ sessoes, cargas: { ...db.LS.get('cargas', {}), ...(doBanco || {}) }, perfil: p, semanaKey: k, isoWeek, kcalDe: x => K.kcalFeito(S.perfil, Math.round((x.duracao_s || 0) / 60), x.esforco), semanasSeguidas: streakDias(sessoes).semanas });
  const atual = k === isoWeek(new Date()), titulo = A.periodoSemana(atual), tab = aba === 'home' ? 'home' : 'evolucao';
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="home">‹ ${t('Início')}</button><span class="row" style="gap:6px"><button class="pill ${atual ? '' : 'on'}" data-go="semana" data-arg="${isoWeek(new Date(Date.now() - 7 * 86400000))}|${tab}">${t('Semana passada')}</button><button class="pill ${atual ? 'on' : ''}" data-go="semana" data-arg="${isoWeek(new Date())}|${tab}">${t('Esta semana')}</button></span></div>
  ${A.htmlResumo(r, { nome: primeiroNome(p.nome), titulo })}
  ${r.treinos && (!atual || r.bateu) ? `<button class="btn" id="shSem">${t('Postar no story')}</button>` : `<button class="btn" data-go="treino">${t('Abrir treino')}</button>`}
  <p class="muted center small">${r.bateu ? t('Semana assim merece story. Marca o Igor!') : t('Toda semana conta. O que importa é não parar.')}</p>
  ${amigaBtn(p)}</div>`, tab);
  if ($('#shSem')) $('#shSem').onclick = async () => { const b = $('#shSem'), rot = b.textContent; b.disabled = true; b.textContent = t('Gerando imagem…'); let x; try { x = await A.imagemResumo(r, { nome: primeiroNome(p.nome), titulo, insta: C.INSTAGRAM }); } catch { x = 'erro'; } b.disabled = false; b.textContent = rot; if (x === 'erro') toast(t('Não consegui gerar a imagem agora. Tira um print dessa tela e posta 😉'), true); else if (x !== 'cancel') pontosStory(x); };
};

// PONTOS --------------------------------------------------------------------------
routes.pontos = async () => {
  const [p0, log0] = await Promise.all([rapido(db.perfil(), null, 3000), rapido(db.meusPontos(S.perfil.id), null, 3000)]);
  const p = p0 || S.perfil; S.perfil = p; const log = log0 || db.LS.get('pontosLog', []); if (log0) db.LS.set('pontosLog', log0.slice(0, 30));
  if (rotaAtual !== 'pontos') return;
  const nomes = { treino: 'Treino completo', semana: 'Semana completa', desafio: 'Desafio do mês', story: 'Card no story', checkin: 'Check-in com foto', evolucao: 'Foto de evolução', indicacao: 'Amiga indicada', renovacao: 'Mês renovado' };
  render(`<div class="view fx"><div class="topbar"><h2>${t('Meus pontos')}</h2><span class="pill on">${t('{n} pts', { n: num(p.pontos) })}</span></div>
  <div class="card"><h3>${t('Como ganhar')}</h3><div style="display:grid;gap:8px;margin-top:8px;font-size:0.875rem">
    ${[['Treino completo', 50], ['Semana completa', 100], ['Desafio do mês', 200], ['Card no story', 30], ['Foto de evolução (1x/mês)', 80], ['Amiga indicada assinou', 300]].map(([a, b]) => `<div class="row between" style="gap:8px"><span>${t(a)}</span><b style="color:var(--accent)">+${b}</b></div>`).join('')}</div>
    <p class="muted mt small">${t('Não precisa mandar comprovante dos treinos: os pontos entram sozinhos.')} ${t('Vale o treino completo (o HIIT opcional não precisa).')}</p></div>
  <div class="row between"><h3>${t('Prêmios do trimestre')}</h3><span class="muted small">${t('vale até {d}', { d: dataLocal(new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3 + 3, 0), { day: 'numeric', month: 'short' }) })}</span></div>
  ${(() => { const PR = [[900, 'Strap'], [1200, 'Elástico'], [1800, 'Luva'], [3000, 'Bag']], prox = PR.find(([v]) => v > p.pontos), ja = PR.some(([v]) => p.pontos >= v);
    return (ja ? `<p style="font-weight:600">${t('Você já pode escolher um prêmio! Chama o Igor no WhatsApp pra trocar.')}</p><a class="btn sm" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}?text=${encodeURIComponent('Oi Igor! Quero trocar meus pontos por um prêmio 🎁')}" target="_blank" rel="noopener">${t('Chamar o Igor no WhatsApp')}</a>` : '') + (prox ? `<p class="muted">${t('Faltam <b style="color:var(--fg)">{n} pts</b> pra {x}.', { n: num(prox[0] - p.pontos), x: t(prox[1]) })}</p>` : ''); })()}
  <div class="grid2 pontos-premios">${[['Strap<br>IS Team', 900, 'faixa de punho pra puxar peso', '🏋️‍♀️'], ['Elástico<br>+ adesivo', 1200, '', '🎗️'], ['Luva', 1800, '', '🧤'], ['Bag', 3000, '', '🎒']].map(([n, v, sub, ic]) => `<div class="lib"><span aria-hidden="true" style="position:absolute;top:12px;left:12px;font-size:2.5rem;line-height:1">${ic}</span><b>${t(n)}</b>${sub ? `<span>${t(sub)}</span>` : ''}<span>${t('{n} pts', { n: num(v) })} · ${p.pontos >= v ? t('dá pra trocar') : t('faltam {n}', { n: num(v - p.pontos) })}</span></div>`).join('')}</div>
  <p class="muted small">${t('Juntou pontos pra mais de um? O Igor te explica no WhatsApp como fica a troca.')}</p>
  <div class="card"><h3>${t('Histórico')}</h3>${log.length ? log.slice(0, 15).map(l => `<div class="row between" style="padding:6px 0;font-size:0.8125rem;gap:8px"><span>${nomes[l.motivo] ? t(nomes[l.motivo]) : esc(l.motivo)}<span class="muted"> · ${fmtData(l.created_at)}</span></span><b style="color:var(--accent)">+${l.pontos}</b></div>`).join('') + (log.slice(0, 15).reduce((a, l) => a + (+l.pontos || 0), 0) < (p.pontos || 0) ? `<p class="muted small mt">${t('Aqui aparecem só os mais recentes. Os antigos continuam no seu saldo.')}</p>` : '') : `<p class="muted mt">${t('Seu primeiro treino concluído já vale 50.')}</p>`}</div></div>`, 'pontos');
};

// EVOLUÇÃO -------------------------------------------------------------------------
// Número digitado do jeito dela ("72,5 kg", "72.5") vira número; fora da faixa, avisa em vez de salvar vazio.
// Reps: "12+4+4" (drop) = 20 repetições no total
const repsNum = v => { const ns = String(v ?? '').match(/\d+/g); return ns ? ns.reduce((a, b) => a + +b, 0) : null; };
const numero = v => { const m = String(v ?? '').match(/\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; };
const virgula = v => dec(v); // separador decimal do idioma (64,5 / 64.5)
const ANG = [['foto_path', 'Frente'], ['foto_lado', 'Lado'], ['foto_costas', 'Costas']];
routes.evolucao = async () => {
  const p = S.perfil; if (!S.plano) S.plano = await rapido(db.planoAtual(p.id), db.LS.get('plano'));
  const [ev, sessoes, log, doBanco] = await Promise.all([rapido(db.evolucao(p.id), db.LS.get('evolucao', [])), sessoesComFila(p, 200), rapido(db.meusPontos(p.id), []), rapido(db.cargasRecentes(p.id), null)]);
  if (rotaAtual !== 'evolucao') return;
  const mesAtual = mesLocal(), jaContou = log.some(l => l.motivo === 'evolucao' && (l.ref === mesAtual || (l.created_at && mesLocal(l.created_at) === mesAtual))) || db.LS.get('fila', []).some(x => x.tipo === 'evolucao' && x.ref === mesAtual);
  const comPeso = ev.filter(e => e.peso_kg != null), comCint = ev.filter(e => e.cintura_cm != null);
  const p1 = comPeso[0], p2 = comPeso[comPeso.length - 1], c1 = comCint[0], c2 = comCint[comCint.length - 1];
  const meses = {}; sessoes.forEach(s => { const k = mesLocal(s.finalizada_em); meses[k] = (meses[k] || 0) + 1; });
  if (Object.keys(meses).length && meses[mesLocal()] == null) meses[mesLocal()] = 0; // mês de agora aparece mesmo zerado (não parece que o app perdeu o mês)
  const ks = Object.keys(meses).sort().slice(-4); const mx = Math.max(1, ...ks.map(k => meses[k]));
  // Minhas cargas: por treino, com a última carga e se subiu; inclui as trocas que ela já fez
  // Minhas cargas vem do banco (celular novo não "perde" nada); o celular completa com o treino que ainda não subiu
  const local = db.LS.get('cargas', {}), cargas = { ...(doBanco || {}) }, visto = new Set();
  Object.entries(local).forEach(([n, c]) => { if (!cargas[n] || String(c.data || '') > String(cargas[n].data || '')) cargas[n] = { ...c, ant: c.ant ?? cargas[n]?.kg ?? null }; });
  if (doBanco) db.LS.set('cargas', cargas);
  const grupos = (S.plano?.treinos || []).map(tr => ({ tit: T('Treino {l}', { l: tr.letra }), nomes: tr.exercicios.filter(e => !tempo(e.reps) && !semCarga(e)).flatMap(e => [e.nome, ...(e.alternativa && cargas[e.alternativa] ? [e.alternativa] : [])]).filter(n => !visto.has(n) && visto.add(n)) })).filter(g => g.nomes.length);
  const outros = Object.keys(cargas).filter(n => !visto.has(n)); if (outros.length) grupos.push({ tit: t('Outros'), nomes: outros });
  const nomes = grupos.flatMap(g => g.nomes);
  const linhaCarga = n => { const c = cargas[n], d = c && c.ant != null ? +c.kg - +c.ant : 0; return `<button class="linha" data-hist="${esc(n)}"><span style="color:var(--fg);flex:1;min-width:0">${esc(tc(n))}</span><span>${c ? `<b style="color:var(--fg)">${dec(c.kg)} kg</b>${d ? ` <i style="font-style:normal;color:${d > 0 ? 'var(--accent)' : 'var(--muted)'}">${d > 0 ? '+' : '−'}${dec(Math.abs(d))} kg</i>` : ''}` : t('sem registro')} ›</span></button>`; };
  render(`<div class="view fx"><div class="topbar"><h2>${t('Minha evolução')}</h2></div>
  <button class="card row" data-go="semana" style="gap:12px;text-align:left;border:1px solid var(--accent);color:var(--fg);width:100%"><div style="font-size:1.5rem">📊</div><div style="flex:1"><b style="font-size:0.9375rem">${t('Resumo da semana')}</b><p class="muted">${t('Treinos, minutos e cargas que subiram. Dá pra postar no story.')}</p></div><span style="color:var(--accent)">›</span></button>
  <div class="row" id="ang" style="gap:6px">${ANG.map(([k, l], i) => `<button class="pill big-pill ${i ? '' : 'on'}" data-a="${k}">${t(l)}</button>`).join('')}</div>
  <div id="fotos"></div>
  <button class="btn ghost sm" id="add" style="align-self:flex-start">+ ${t('Registro do mês')}${jaContou ? '' : ' (' + t('+{n} pts', { n: 80 }) + ')'}</button>
  <div class="grid2"><div class="card"><h3>${t('Peso')}</h3><div class="big" style="margin-top:4px">${p2 ? virgula(p2.peso_kg) : p.peso_kg ? virgula(p.peso_kg) : '–'}<small> kg</small></div><p class="muted">${p1 && p2 && p1 !== p2 ? t('{d} kg desde {data}', { d: (p2.peso_kg > p1.peso_kg ? '+' : '−') + virgula(Math.abs(p2.peso_kg - p1.peso_kg).toFixed(1)), data: fmtData(p1.data) }) : !p2 && p.peso_kg ? t('da sua anamnese · seu ponto de partida') : t('registra pra acompanhar')}</p></div>
  <div class="card"><h3>${t('Cintura')}</h3><div class="big" style="margin-top:4px">${c2 ? virgula(c2.cintura_cm) : '–'}<small> cm</small></div><p class="muted">${c1 && c2 && c1 !== c2 ? t('{d} cm desde {data}', { d: (c2.cintura_cm > c1.cintura_cm ? '+' : '−') + Math.abs(c2.cintura_cm - c1.cintura_cm).toFixed(0), data: fmtData(c1.data) }) : c2 ? t('medida em {data}', { data: fmtData(c2.data) }) : ''}</p></div></div>
  <div class="card"><h3>${t('Treinos por mês')}</h3><p class="muted small">${t('Quantos treinos você fez em cada mês')}</p><div class="row" style="align-items:flex-end;gap:10px;height:110px;margin-top:8px">${ks.length ? ks.map(k => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end"><b style="font-size:0.9375rem">${meses[k]}</b><div style="width:100%;height:${meses[k] / mx * 56}px;background:var(--accent);border-radius:6px"></div><span class="muted small">${dataLocal(k + '-15T12:00', { month: 'short' })}</span></div>`).join('') : `<p class="muted">${t('Seu primeiro treino aparece aqui.')}</p>`}</div></div>
  ${sessoes.length ? `<div class="card"><h3>${t('Meus treinos')}</h3><p class="muted small">${t('Toca num dia pra ver as séries que você fez.')}</p>${sessoes.slice(0, 8).map((x, j) => `<button class="linha" data-dia="${j}"><span style="color:var(--fg);flex:1;min-width:0">${fmtData(x.finalizada_em)} · ${esc(nomeCurto(x.titulo))}</span><span>${[x.duracao_s ? durCurta(x.duracao_s) : '', x.exercicios_total ? t('{a} de {b}', { a: x.exercicios_feitos ?? 0, b: x.exercicios_total }) : '', x.pendente ? '⏳' : ''].filter(Boolean).join(' · ')} ›</span></button>`).join('')}</div>` : ''}
  ${nomes.length ? `<div class="card"><h3>${t('Minhas cargas')}</h3><p class="muted">${t('O peso mais pesado do último treino e quanto mudou desde o anterior. Toca no exercício pra ver a evolução.')}</p>${(() => { const com = grupos.map(g => ({ ...g, nomes: g.nomes.filter(n => cargas[n]) })).filter(g => g.nomes.length), sem = nomes.filter(n => !cargas[n]);
    return (com.length ? com.map(g => `<p class="small" style="margin-top:12px;color:var(--accent);font-weight:600">${esc(g.tit)}</p>${g.nomes.map(linhaCarga).join('')}`).join('') : `<p class="muted mt">${t('Quando você anotar o peso durante o treino, ele aparece aqui.')}</p>`)
      + (sem.length ? `<details class="mt"><summary class="linha" style="cursor:pointer;color:var(--muted)"><span>${tp(sem.length, 'Ver {n} exercício ainda sem registro', 'Ver {n} exercícios ainda sem registro')}</span><span class="seta">▾</span></summary>${sem.map(linhaCarga).join('')}</details>` : ''); })()}</div>` : ''}</div>`, 'evolucao');
  $$('[data-hist]').forEach(b => b.onclick = () => abrirHistorico(b.dataset.hist));
  $$('[data-dia]').forEach(b => b.onclick = () => verTreinoDoDia(sessoes[+b.dataset.dia]));
  // Antes x agora, por ângulo: primeira foto que existe x a mais recente
  const fotos = async k => {
    const com = ev.filter(e => e[k]), a = com[0], z = com[com.length - 1], so1 = com.length === 1;
    const [u1, u2] = await Promise.all([so1 ? null : rapido(db.fotoUrl(a?.[k]), null), rapido(db.fotoUrl(z?.[k]), null)]);
    const el = $('#fotos'); if (!el) return;
    const semNet = t('Sem internet pra mostrar a foto');
    // Com uma foto só, ela aparece como "hoje"; o outro quadro espera a do mês que vem
    const vazio = (txt, foto) => foto ? '' : `<span>${txt}<br><b style="color:var(--accent)">+ 📷 ${t('tirar foto')}</b></span>`;
    el.innerHTML = `<div class="grid2"><div class="photo ${u1 ? '' : 'vazia'}" style="${u1 ? `background-image:url(${u1})` : ''}">${u1 ? '' : so1 ? vazio(t('Daqui a 1 mês: sua próxima foto')) : a ? semNet : vazio(t('Sua primeira foto'))}</div><div class="photo ${u2 ? '' : 'vazia'}" style="${u2 ? `background-image:url(${u2})` : ''}">${u2 ? '' : z ? semNet : vazio(t('Foto de hoje'))}</div></div>
      <div class="row between" style="margin-top:6px"><span class="muted small">${a && !so1 ? t('Antes') + ' · ' + fmtData(a.data) : ''}</span><span class="muted small">${so1 ? t('Sua 1ª foto') + ' · ' + fmtData(z.data) : z ? t('Agora') + ' · ' + fmtData(z.data) : ''}</span></div>`;
  };
  fotos('foto_path');
  if (S.abrirRegistro) { S.abrirRegistro = false; setTimeout(() => $('#add')?.click(), 50); }
  $('#fotos').onclick = e => { if (e.target.closest('.photo.vazia')) $('#add').click(); }; // quadro vazio abre o registro do mês
  $$('#ang [data-a]').forEach(b => b.onclick = () => { $$('#ang .pill').forEach(x => x.classList.toggle('on', x === b)); fotos(b.dataset.a); });
  $('#add').onclick = () => {
    // Já mandou as 3 desse mês (foto tremida, criança entrou): dá pra trocar só uma
    const mesCompleto = ev.some(e => String(e.data || '').slice(0, 7) === mesAtual && e.foto_path && e.foto_lado && e.foto_costas);
    const slot = (k, lab) => `<label class="photo" for="f-${k}" style="aspect-ratio:3/4;cursor:pointer;position:relative"><img src="icons/guia-${k}.jpg" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.9"><span style="position:absolute;bottom:6px;left:0;right:0;font-weight:600;color:var(--fg);font-size:0.875rem;text-shadow:0 1px 3px #000">${lab}<br><span style="color:var(--accent)">+ 📷</span></span><input id="f-${k}" type="file" accept="image/*" hidden></label>`;
    overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px;margin-top:20px"><h2>${t('Registro do mês')}</h2>
      <p class="muted">${t('Três fotos, sempre do mesmo jeito: roupa de treino, mesmo lugar, luz de frente, celular na altura do umbigo. Só você e o Igor veem.')}</p>
      ${mesCompleto ? `<p class="small" style="color:var(--accent)">${t('Você já mandou as 3 desse mês: dá pra trocar só a que saiu ruim.')}</p>` : ''}<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${slot('frente', t('Frente'))}${slot('lado', t('Lado'))}${slot('costas', t('Costas'))}</div>
      <div class="grid2"><div class="field"><label class="l" for="pk">${t('Peso (kg)')}</label><input class="input" id="pk" inputmode="decimal" placeholder="${t('ex. {v}', { v: dec(64.5) })}" value="${virgula(p2?.peso_kg)}"></div><div class="field"><label class="l" for="ci">${t('Cintura (cm)')}</label><input class="input" id="ci" inputmode="decimal" placeholder="${t('ex. {v}', { v: 72 })}" value="${virgula(c2?.cintura_cm)}"></div></div>
      <p class="err" id="e" hidden></p>
      <div class="row"><button class="btn ghost sm" id="c" style="flex:1">${t('Cancelar')}</button><button class="btn sm" id="s" style="flex:1">${t('Salvar')}</button></div></div></div>`);
    // Fotos escolhidas ficam guardadas no celular (rascunho): cancelou ou a criança chamou, não precisa escolher de novo
    const escolhidas = {};
    const mostraFoto = (k, f) => { escolhidas[k] = f; const lb = $(`label[for="f-${k}"]`); if (!lb) return; lb.style.backgroundImage = `url(${URL.createObjectURL(f)})`; lb.querySelector('img').style.opacity = 0; };
    idb('readonly', st => st.get('rascunho-mes')).then(r => { if (r && r.mes === mesAtual) Object.entries(r.fotos || {}).forEach(([k, f]) => { if (!escolhidas[k]) mostraFoto(k, f); }); }).catch(() => {});
    const guardaRasc = () => idb('readwrite', st => st.put({ mes: mesAtual, fotos: { ...escolhidas } }, 'rascunho-mes')).catch(() => {});
    // Foto que o celular não abre (ex.: HEIC no Android): avisa na hora e não guarda (antes travava em "Salvando…")
    ['frente', 'lado', 'costas'].forEach(k => $(`#f-${k}`).onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { (await createImageBitmap(f)).close?.(); } catch { return erro(t('Essa foto não abriu aqui. Tira outra na hora ou escolhe uma em JPG.')); } if ($('#e')) $('#e').hidden = true; mostraFoto(k, f); guardaRasc(); });
    $('#c').onclick = closeOverlay;
    const erro = x => { if (!$('#e') || !$('#s')) return toast(x, true); $('#e').textContent = x; $('#e').hidden = false; $('#s').disabled = false; $('#s').textContent = t('Salvar'); }; // pop-up fechado pelo voltar: avisa embaixo
    $('#s').onclick = async () => {
      $('#s').disabled = true; $('#e').hidden = true;
      const pv = $('#pk').value.trim(), cv = $('#ci').value.trim(), peso = numero(pv), cint = numero(cv);
      if (pv && peso == null) return erro(t('Confere o peso: digita só o número, ex. {v}', { v: dec(64.5) }));
      if (pv && (peso < 30 || peso > 250)) return erro(t('{v} kg? Confere se não sobrou ou faltou um número (ex. {e}).', { v: dec(peso), e: dec(64.5) }));
      if (cv && (cint == null || cint < 40 || cint > 200)) return erro(t('Confere a cintura em centímetros, ex. 72'));
      const arquivos = { ...escolhidas }; // lido antes de esperar qualquer coisa: se ela tocar em voltar, as fotos não se perdem
      const n = ['frente', 'lado', 'costas'].filter(k => arquivos[k]).length;
      if (n > 0 && n < 3 && !mesCompleto) return erro(t('Faltam fotos: manda as 3 (frente, lado e costas) pra comparar certinho. As que você já escolheu ficam guardadas.'));
      if (!n && peso == null && cint == null) return erro(t('Coloca as fotos ou pelo menos o peso.'));
      $('#s').textContent = t('Salvando…');
      const fotos = {}; try { for (const k of ['frente', 'lado', 'costas']) { const f = arquivos[k]; if (f) fotos[k] = await comprimir(f); } } catch { return erro(t('Uma das fotos não abriu aqui. Troca ela (tira outra na hora ou escolhe em JPG).')); }
      const row = { data: diaLocal(), peso_kg: peso, cintura_cm: cint };
      try {
        await comLimite(db.salvarEvolucao(p.id, row, fotos), 25000);
        if (peso && peso !== p.peso_kg) db.salvarPerfil({ peso_kg: peso }).then(x => { if (x) S.perfil = x; }).catch(() => {});
        let ganhou = false; if (n === 3) ganhou = await comLimite(db.registrarPontos(p.id, 'evolucao', 80, mesAtual), 10000).catch(er => { if (!erroDeRede(er)) return false; novaFila({ tipo: 'pontos', motivo: 'evolucao', pontos: 80, ref: mesAtual }); return 'fila'; }); // 4G caiu só nos pontos: vão pra fila (não diz que já foram contados)
        if ($('#s')) closeOverlay(); idb('readwrite', st => st.delete('rascunho-mes')).catch(() => {}); toast(n === 3 ? (ganhou === 'fila' ? t('Registrado! Os +80 pts entram quando o sinal voltar.') : ganhou ? t('Registrado! +80 pts') : t('Registrado! (os pontos de foto desse mês já foram contados)')) : n ? t('Foto trocada ✓') : t('Medidas registradas ✓'));
      } catch (er) {
        // Sem sinal ou 4G travado: guarda fotos e medidas no celular e manda sozinha depois (as fotos não se perdem)
        if (!/fetch|network|Failed|lento|timeout|offline/i.test(String(er?.message)) && navigator.onLine !== false) return erro(traduzErro(er));
        try { await guardarEvolucaoOffline({ row, fotos, pontos: n === 3, ref: mesAtual }); } catch { return erro(traduzErro(er)); }
        if ($('#s')) closeOverlay(); idb('readwrite', st => st.delete('rascunho-mes')).catch(() => {}); toast(t('Sem sinal agora: fotos e medidas guardadas no celular. Envio sozinha quando a internet voltar.'));
      }
      if (rotaAtual === 'evolucao' && S.perfil) routes.evolucao(); // não puxa ela de outra tela se o envio demorou
    };
  };
};
// Diário: as séries de um treino feito (o que ela usava no Mfit)
async function verTreinoDoDia(x) {
  overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:8px;margin-top:20px"><h2>${esc(nomeCurto(x.titulo))}</h2><p class="muted">${fmtData(x.finalizada_em)}${x.duracao_s ? ' · ' + durCurta(x.duracao_s) : ''}</p><div id="dl"><p class="muted">${t('Carregando…')}</p></div><button class="btn ghost sm" id="c">${t('Fechar')}</button></div></div>`);
  $('#c').onclick = closeOverlay;
  const rows = x.pendente ? (x.series?.length ? x.series : null) : !x.id ? null : await rapido(db.seriesDe(x.id), null, 6000), el = $('#dl'); if (!el) return;
  if (!rows) return el.innerHTML = `<p class="muted">${x.pendente ? t('Esse treino ainda tá esperando sinal pra subir. As séries aparecem aqui depois.') : t('Sem internet pra mostrar as séries agora.')}</p>`;
  const txt = r => r.kg != null ? (r.reps != null ? t('{kg} kg, {n} vezes', { kg: dec(r.kg), n: r.reps }) : `${dec(r.kg)} kg`) : r.reps != null ? tp(r.reps, '{n} vez', '{n} vezes') : '✓';
  const desenha = () => {
    const por = {}; rows.forEach((r, j) => (por[r.exercicio_nome] = por[r.exercicio_nome] || []).push([r, j]));
    const edita = !x.pendente && rows.some(r => r.id);
    el.innerHTML = (x.pendente ? `<p class="muted small">${t('Ainda esperando sinal pra subir. Tá guardado no celular.')}</p>` : edita ? `<p class="muted small">${t('Anotou errado? Toca na série pra corrigir.')}</p>` : '') + (Object.keys(por).length ? Object.entries(por).map(([n, l]) => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${esc(tc(n))}</b><p class="muted" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${l.map(([r, j]) => edita && r.id ? `<button class="chip" data-sr="${j}">${txt(r)} ✎</button>` : `<span>${txt(r)}</span>`).join(' · ')}</p></div>`).join('') : `<p class="muted">${t('Nenhuma série anotada nesse treino.')}</p>`);
    $$('#dl [data-sr]').forEach(b => b.onclick = () => corrige(rows[+b.dataset.sr]));
  };
  // Corrigir uma série de um treino que já passou (como no Mfit): muda só ela, as outras do dia ficam
  const corrige = r => {
    el.innerHTML = `<b>${esc(r.exercicio_nome)} · ${T('série {n}', { n: r.n })}</b><div class="row" style="gap:8px;margin-top:8px"><div class="field" style="flex:1"><label class="l" for="ekg">kg</label><input id="ekg" inputmode="decimal" value="${r.kg != null ? dec(r.kg) : ''}"></div><div class="field" style="flex:1"><label class="l" for="erp">${t('vezes')}</label><input id="erp" inputmode="numeric" value="${r.reps ?? ''}"></div></div><p class="err" id="ee" hidden></p><button class="btn sm" id="es">${t('Salvar correção')}</button><button class="btn ghost sm" id="ev">${t('Voltar')}</button>`;
    $('#ev').onclick = desenha;
    $('#es').onclick = async () => {
      const kg = $('#ekg').value.trim() === '' ? null : numero($('#ekg').value), reps = $('#erp').value.trim() === '' ? null : parseInt($('#erp').value, 10);
      if ((kg != null && (!(kg >= 0) || kg > 400)) || (reps != null && !(reps >= 0 && reps < 200))) { $('#ee').textContent = t('Confere os números (kg até 400, vezes até 200).'); $('#ee').hidden = false; return; }
      $('#es').disabled = true; $('#es').textContent = t('Salvando…');
      try {
        await comLimite(db.editarSerie(r.id, { kg, reps }), 12000);
        const cs = db.LS.get('cargas', {}), c = cs[r.exercicio_nome]; if (c && r.kg != null && +c.kg === +r.kg && kg != null) { cs[r.exercicio_nome] = { ...c, kg, reps: reps ?? c.reps }; db.LS.set('cargas', cs); } // a "Última" acompanha
        r.kg = kg; r.reps = reps; S.sessoes = null; Object.keys(fresco).forEach(k => delete fresco[k]); desenha(); toast(t('Série corrigida ✓'));
      } catch (er) { $('#ee').textContent = erroDeRede(er) ? t('Sem sinal agora. Tenta de novo quando a internet voltar.') : traduzErro(er); $('#ee').hidden = false; $('#es').disabled = false; $('#es').textContent = t('Salvar correção'); }
    };
  };
  desenha();
}
// Fotos do registro do mês guardadas no celular (IndexedDB) quando não tem sinal; a fila manda depois.
const abrirIdb = () => new Promise((ok, no) => { const r = indexedDB.open('isteam', 1); r.onupgradeneeded = () => r.result.createObjectStore('fotos'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
async function idb(modo, fn) { const d = await abrirIdb(); return new Promise((ok, no) => { const tx = d.transaction('fotos', modo); const r = fn(tx.objectStore('fotos')); tx.oncomplete = () => ok(r?.result); tx.onerror = () => no(tx.error); }); }
async function guardarEvolucaoOffline({ row, fotos, pontos, ref }) {
  const uid = 'ev' + Date.now(); await idb('readwrite', st => st.put(fotos, uid));
  novaFila({ tipo: 'evolucao', idb: uid, row, pontos, ref });
  db.LS.set('evolucao', [...db.LS.get('evolucao', []).filter(e => e.data !== row.data), row].sort((a, b) => a.data.localeCompare(b.data)));
}
async function comprimir(file) {
  const img = await createImageBitmap(file); const max = 1080; const r = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = img.width * r; c.height = img.height * r; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(new File([b], 'foto.jpg', { type: 'image/jpeg' })), 'image/jpeg', .8));
}

// PERFIL ----------------------------------------------------------------------------
const chipOff = () => { try { return localStorage.getItem('chip_off') === '1'; } catch { return false; } };
routes.perfil = async () => {
  const [p0, ss] = await Promise.all([rapido(db.perfil(), null, 3000), rapido(db.minhasSessoes(S.perfil.id, 30), db.LS.get('sessoes', []), 3000)]);
  const p = p0 || S.perfil; S.perfil = p; const sessoes = ss || [];
  if (rotaAtual !== 'perfil') return;
  const resp = sessoes.filter(s => s.resposta_igor).sort((a, b) => String(b.respondida_em || b.finalizada_em).localeCompare(String(a.respondida_em || a.finalizada_em)));
  const lidasAntes = db.LS.get('respLidas', []), novas = resp.filter(r => !lidasAntes.includes(r.id)).length;
  if (resp.length) db.LS.set('respLidas', [...new Set([...db.LS.get('respLidas', []), ...resp.map(r => r.id)])].slice(-50)); // viu aqui = lida
  render(`<div class="view fx"><div class="topbar"><h2>${t('Perfil')}</h2>${p.role === 'admin' ? `<button class="pill on" data-go="admin">${t('Painel do Igor')}</button>` : ''}</div>
  <div class="card row" style="gap:12px"><div style="width:52px;height:52px;border-radius:50%;background:var(--accent);display:grid;place-items:center;font-family:var(--display);font-size:1.375rem;font-weight:800;color:var(--accent-ink)">${esc((p.nome || '?')[0].toUpperCase())}</div><div><b style="font-size:1.0625rem">${esc(p.nome)}</b>${p.plano === 'personalizado' ? ` <span class="pill" style="vertical-align:middle">${t('Personalizado')}</span>` : ''}<p class="muted">${t('No time desde {data}', { data: dataLocal(p.created_at, { month: 'short', year: 'numeric' }) })} · ${t('{n} pts', { n: num(p.pontos) })}</p></div></div>
  <div class="card"><div class="row between"><b style="font-size:0.9375rem">${t('Minha anamnese')}</b><button class="btn ghost sm" id="ed">${t('editar')}</button></div><p class="muted">${esc([rotuloAnam('objetivo', p.objetivo), p.dias_semana ? t('{n}x/semana', { n: p.dias_semana }) : null, p.tempo_treino_min ? t('{n} min', { n: p.tempo_treino_min }) : null, rotuloAnam('local_treino', p.local_treino), (p.foco || []).length ? t('foco: {x}', { x: p.foco.map(f => rotuloAnam('foco', f)).join(', ') }) : null, p.limitacoes ? t('atenção: {x}', { x: tc(p.limitacoes.replace(/^\s*aten[cç][aã]o\s*:?\s*/i, '')) }) : null].filter(Boolean).join(' · ') || t('preencha pro Igor montar seu treino'))}</p>${(() => { const m = tmb(p); return m ? `<p class="muted mt">${t('Seu corpo gasta umas <b style="color:var(--fg)">{g} calorias por dia</b> (num dia sem treino, umas {b}). É uma estimativa e atualiza quando você registra o peso.', { g: num(m.gasto), b: num(m.tmb) })}</p>` : ''; })()}</div>
  <div class="card"><div class="row between"><b style="font-size:0.9375rem">${t('Respostas do Igor')}</b>${novas ? `<span class="pill on">${tp(novas, '{n} nova', '{n} novas')}</span>` : ''}</div>${resp.length ? resp.slice(0, 3).map(s => `<div class="mt"><p class="muted small">${t('Seu {x}', { x: esc(s.titulo ? nomeCurto(s.titulo) : t('treino')) })} · ${fmtData(s.finalizada_em)}${s.comentario ? ': "' + esc(s.comentario) + '"' : ''}</p><p style="margin-top:2px">↳ "${esc(tlivre(s.resposta_igor))}"</p></div>`).join('') + `<p class="muted small mt">${t('Quer responder? Escreve no recado do próximo treino ou')} <a href="https://wa.me/${esc(C.WHATSAPP_IGOR)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;min-height:44px;padding:0 6px;margin:-12px -2px">${t('chama no WhatsApp')}</a>.</p>` : `<p class="muted">${t('Quando você mandar feedback no fim do treino, ele responde aqui.')}</p>`}</div>
  <div class="card"><div class="row between"><b style="font-size:0.9375rem">${t('Indique uma amiga')}</b><b style="color:var(--accent)">${t('+{n} pts', { n: 300 })}</b></div><p class="muted">${t('Seu código:')} <b style="color:var(--fg)">${esc(p.cod_indicacao || '')}</b>. ${t('Quando ela assinar, é só ela falar seu código pro Igor no WhatsApp: os +300 entram pra você.')}</p>${amigaBtn(p, true)}</div>
  <div class="card"><div class="row between"><b style="font-size:0.9375rem">${t('Cronômetro na tela de bloqueio')}</b><button class="sw ${chipOff() ? '' : 'on'}" id="chipOn" role="switch" aria-checked="${!chipOff()}" aria-label="${t('Cronômetro na tela de bloqueio')}"></button></div><p class="muted">${t('Mostra o descanso em cima, como o Spotify, e apita quando acaba. Pode pausar a música enquanto o descanso roda.')}</p></div>
  ${'<div class="card" id="stv"><div class="row between"><b style="font-size:0.9375rem">Strava</b></div><p class="muted">…</p></div>'}
  <div class="card"><div class="row between"><b style="font-size:0.9375rem">🌐 ${t('Idioma')}</b><button class="btn ghost sm" id="idi">${infoIdioma().flag} ${infoIdioma().nome}</button></div><p class="muted">${t('O app aparece nesse idioma. Treinos, dicas e recados do Igor continuam em português.')}</p></div>
  <div class="card"><div class="row between"><b style="font-size:0.9375rem">${t('Lembretes')}</b>${A.lembreteSuportado() ? `<button class="sw ${A.lembreteLigado() ? 'on' : ''}" id="notif" aria-label="${t('Lembretes')}"></button>` : ''}</div><p class="muted">${A.lembreteSuportado() ? t('Aviso carinhoso se passar 3 dias sem treinar. Funciona com o app instalado na tela inicial.') : (/iPhone|iPad|iPod/.test(navigator.userAgent) ? t('Lembrete de 3 dias sem treinar: no iPhone chega em breve.') + ' ' + t('No descanso, deixa o app aberto: com a tela apagada o iPhone não apita.') : t('Seu navegador não aceita lembrete automático. Abre o app pelo Chrome e instala na tela inicial pra ligar.') + ' ' + t('No descanso, deixa o app aberto: com a tela apagada o celular pode não apitar.'))}</p></div>
  <div class="card"><div class="row between"><b style="font-size:0.9375rem">🔥 ${t('Aparecer no time')}</b><button class="sw ${p.comunidade === false ? '' : 'on'}" id="swTime" aria-label="${t('Aparecer no time')}"></button></div><p class="muted">${t('Seu primeiro nome e a inicial aparecem no ranking e em "treinou agora há pouco". Nada de foto, carga ou peso.')}</p></div>
  <button class="btn ghost sm" id="tour" style="width:100%">🧭 ${t('Ver o passeio pelo app de novo')}</button>
  <div class="card"><div class="row between"><b style="font-size:0.9375rem">${t('Senha')}</b><button class="btn ghost sm" id="pw">${t('trocar')}</button></div><p class="muted">${p.senha_trocada === false ? t('Se ainda é o seu número de WhatsApp, troca aqui.') : t('Quer mudar sua senha? Troca aqui quando quiser.')}</p></div>
  <a class="btn ghost sm" style="width:100%" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}" target="_blank" rel="noopener">${t('Chamar o Igor')}</a>
  <button class="link-fim" id="out" style="margin-top:14px">${t('Sair da minha conta')}</button></div>`, 'perfil');
  $('#idi').onclick = escolherIdioma; if ($('#stv')) cartaoStrava(); if ($('#chipOn')) $('#chipOn').onclick = () => { const b = $('#chipOn'), liga = !b.classList.contains('on'); b.classList.toggle('on', liga); b.setAttribute('aria-checked', liga); try { liga ? localStorage.removeItem('chip_off') : localStorage.setItem('chip_off', '1'); } catch {} };
  $('#out').onclick = async () => {
    const pend = db.LS.get('fila', []).filter(daFila).length;
    if (pend && navigator.onLine !== false) await sincronizarFila();
    const falta = db.LS.get('fila', []).filter(daFila).length;
    if ((await perguntar(t('Sair do app?'), (falta ? tp(falta, 'Você tem {n} registro que ainda não subiu (falta sinal). Ele fica guardado no celular e sobe quando você entrar de novo.', 'Você tem {n} registros que ainda não subiram (falta sinal). Eles ficam guardados no celular e sobem quando você entrar de novo.') + ' ' : '') + (S.sessao ? t('Seu treino pausado continua guardado neste celular.') + ' ' : '') + t('Pra entrar de novo vai precisar do seu e-mail e da sua senha.'), t('Ficar'), t('Sair'))) !== false) return; // "Ficar" em destaque: quem enxerga mal não sai sem querer
    if (S.sessao) { db.LS.set('sessao@' + S.perfil.id, S.sessao); db.LS.del('sessao'); S.sessao = null; } // treino pausado é só dela: quem entrar depois não vê
    A.limparLembrete(); await db.logout().catch(() => {}); ['chat', 'chatRasc', 'chatPend', 'chatRest', 'chatEm', 'cargas', 'evolucao', 'sessoes'].forEach(k => db.LS.del(k)); S.perfil = null; go('entrada'); // outra pessoa no mesmo celular não vê a conversa dela
  };
  if ($('#notif')) $('#notif').onclick = async () => { if (A.lembreteLigado()) { await A.desligarLembrete(); toast(t('Lembretes desligados.')); return routes.perfil(); } const r = await A.ligarLembrete(); toast(msgLembrete(r)); routes.perfil(); };
  $('#tour').onclick = () => { A.refazerPasseio(p); go('home'); setTimeout(() => { if (rotaAtual === 'home' && !$('#overlay')?.innerHTML && !document.querySelector('.tour')) A.passeio(p); }, 700); }; // pediu: mostra (também no demo)
  $('#swTime').onclick = async () => { const b = $('#swTime'), quer = !b.classList.contains('on'); b.classList.toggle('on', quer); try { S.perfil = await db.salvarPerfil({ comunidade: quer }); toast(quer ? t('Você aparece no time ✓') : t('Pronto: você não aparece mais no time.')); } catch { b.classList.toggle('on', !quer); toast(t('Não deu pra salvar agora. Tenta de novo com internet.'), true); } };
  $('#pw').onclick = () => {
    overlay(`<div class="modal" id="m"><form class="box" id="fs" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>${t('Trocar senha')}</h2>
      <div class="field"><label class="l" for="n0">${t('Senha de agora')}</label>${campoSenha('n0', p.senha_trocada === false ? t('se nunca trocou, é seu WhatsApp') : '', 'current-password')}</div>
      <div class="field"><label class="l" for="n1">${t('Nova senha')}</label>${campoSenha('n1', t('6 ou mais'))}</div><div class="field"><label class="l" for="n2">${t('Repete a senha')}</label>${campoSenha('n2', t('repete'))}</div>
      <p class="err" id="e" hidden></p><div class="row" style="flex-wrap:wrap;gap:8px"><button type="button" class="btn ghost sm" id="c" style="flex:1 1 120px;min-width:0">${t('Cancelar')}</button><button class="btn sm" id="s" style="flex:1 1 120px;min-width:0">${t('Salvar')}</button></div></form></div>`);
    $('#c').onclick = closeOverlay;
    $('#fs').onsubmit = async ev => { ev.preventDefault(); const er = erroSenha($('#n1').value, $('#n2').value); if (er) { $('#e').textContent = er; $('#e').hidden = false; return; }
      if (!$('#n0').value.trim()) { $('#e').textContent = t('Digita a senha de agora (a que você usa pra entrar).'); $('#e').hidden = false; return; }
      $('#e').hidden = true; $('#s').disabled = true; try { if (!(await comLimite(db.conferirSenha($('#n0').value), 12000))) { $('#e').textContent = t('A senha de agora não confere. Esqueceu? Sai do app e toca em "Esqueci minha senha".'); $('#e').hidden = false; $('#s').disabled = false; return; } await db.trocarSenha($('#n1').value); await db.salvarPerfil({ senha_trocada: true }).catch(() => {}); closeOverlay(); toast(t('Senha trocada ✓ Na próxima vez, entra com ela.')); } catch (e) { $('#e').textContent = traduzErro(e); $('#e').hidden = false; $('#s').disabled = false; } };
  };
  $('#ed').onclick = () => anamneseForm(p, () => go('perfil'));
};
// Mesmas regras de senha no 1º acesso, no Perfil e no "esqueci a senha"
function erroSenha(a, b) {
  const w = String(S.perfil?.whatsapp || '').replace(/\D/g, '');
  return a.length < 6 ? t('A senha precisa ter pelo menos 6 caracteres.') : a !== a.trim() || !a.trim() ? t('A senha não pode começar nem terminar com espaço.') : a !== b ? t('As duas senhas não estão iguais.') : w.length >= 8 && a.replace(/\D/g, '').endsWith(w.slice(-8)) && a.replace(/\D/g, '').length >= 8 ? t('Escolhe uma diferente do seu WhatsApp.') : '';
}
// Taxa metabólica basal (Mifflin-St Jeor) e gasto diário estimado
export function tmb(p) {
  if (!p.peso_kg || !p.altura_m || !p.nascimento || p.altura_m < 1.2 || p.altura_m > 2.2 || p.peso_kg < 30 || p.peso_kg > 250) return null;
  const idade = Math.floor((Date.now() - new Date(p.nascimento)) / 31557600000); if (!(idade >= 14 && idade <= 90)) return null;
  const base = 10 * p.peso_kg + 6.25 * (p.altura_m * 100) - 5 * idade + (p.sexo === 'M' ? 5 : -161);
  const fator = { sedentaria: 1.2, leve: 1.375, moderada: 1.55, alta: 1.725 }[p.atividade || 'leve'];
  return { tmb: Math.round(base), gasto: Math.round(base * fator), idade };
}
// ANAMNESE: uma pergunta por tela ------------------------------------------------
const PARTES = ['Glúteo', 'Pernas', 'Abdômen', 'Costas', 'Braços', 'Peito', 'Ombro'];
// Anamnese enxuta (27/10): base do app + o que funcionava na do Mfit (cardio, horário, tipo de academia) + sexo,
// triagem de segurança (PAR-Q) dentro de "saúde", equipamento de casa, exercício que evita e ciclo. `se` = só aparece quando faz sentido.
const ehF = r => r.sexo !== 'M';
const Q = [
  { k: 'objetivo', t: 'Qual seu objetivo principal?', tipo: 'um', op: ['Emagrecer', 'Ganhar massa', 'Os dois', 'Correr melhor', 'Saúde e disposição'], req: true },
  { k: 'sexo', t: 'Você é:', sub: 'Entra na conta de quanto você gasta em cada treino.', tipo: 'um', op: [['Mulher', 'F'], ['Homem', 'M']], req: true },
  { k: 'dias_semana', t: 'Quantos dias por semana você consegue treinar de verdade?', tipo: 'um', op: [2, 3, 4, 5, 6], req: true, num: true },
  { k: 'tempo_treino_min', t: 'Quanto tempo você tem por treino?', tipo: 'um', op: [['até 30 min', 30], ['40 min', 40], ['50 a 60 min', 60]], req: true, num: true },
  { k: 'horario', t: 'Que horas você costuma treinar?', tipo: 'um', op: [['De manhã cedo (antes das 9h)', 'cedo'], ['Manhã', 'manha'], ['Hora do almoço', 'almoco'], ['Tarde', 'tarde'], ['Noite', 'noite'], ['Varia muito', 'varia']] },
  { k: 'local_treino', t: 'Onde vai treinar?', tipo: 'um', op: [['Academia', 'academia'], ['Casa', 'casa'], ['Os dois', 'ambos']], req: true },
  { k: 'academia_tipo', t: 'Como é a sua academia?', sub: 'Muda as máquinas que o Igor pode usar no seu treino.', tipo: 'um', op: [['Grande, de rede (Smart Fit, Bluefit...)', 'rede'], ['De bairro, menor', 'bairro'], ['Do prédio ou condomínio', 'condominio']], se: r => r.local_treino !== 'casa' },
  { k: 'equipamento', t: 'O que você tem pra treinar em casa?', sub: 'Pode marcar mais de uma.', tipo: 'multi', op: ['Halteres', 'Elástico ou superband', 'Caneleira', 'Kettlebell', 'Nada, só o corpo'], excl: 'Nada, só o corpo', se: r => r.local_treino === 'casa' || r.local_treino === 'ambos' },
  { k: 'experiencia', t: 'Há quanto tempo treina musculação?', tipo: 'um', op: ['Nunca treinei', 'Menos de 6 meses', '6 meses a 2 anos', 'Mais de 2 anos'], req: true },
  { k: 'foco', t: 'Que partes do corpo você quer focar mais?', sub: 'Pode marcar mais de uma.', tipo: 'multi', op: PARTES, req: true },
  { k: 'cardio', t: 'Topa fazer um cardio rápido no fim do treino?', tipo: 'um', op: [['Topo, sempre', 'sim'], ['Às vezes', 'as_vezes'], ['Prefiro não', 'nao']] },
  { k: 'limitacoes', t: 'Sente dor, tem lesão ou alguma limitação?', sub: 'Se não tiver, pode pular.', tipo: 'texto', ph: 'ex. lombar, joelho direito, ombro...' },
  { k: 'evita', t: 'Tem algum exercício que você não gosta ou não consegue fazer?', sub: 'Se não tiver, pode pular.', tipo: 'texto', ph: 'ex. agachamento livre, burpee, corrida...' },
  { k: 'saude', t: 'Alguma dessas se aplica a você?', sub: 'Pode marcar mais de uma. Se nenhuma, marca "Nenhuma".', tipo: 'multi', op: ['Nenhuma', 'Dor no peito quando faço esforço', 'Tontura forte ou já desmaiei', 'Médico disse pra só treinar com acompanhamento', 'Pressão alta', 'Diabetes', 'Problema cardíaco', 'Asma', 'Cirurgia (estética ou de saúde) no último ano', 'Tomo medicação contínua'], req: true, excl: 'Nenhuma' },
  { k: 'gestacao', t: 'Está grávida ou teve filho nos últimos 12 meses?', tipo: 'um', op: [['Não', 'nao'], ['Grávida', 'gravida'], ['Pós-parto', 'pos_parto']], req: true, se: ehF },
  { k: 'ciclo', t: 'E o seu ciclo menstrual?', sub: 'Ajuda o Igor a adaptar o treino nas semanas mais difíceis.', tipo: 'um', op: [['Regular', 'regular'], ['Irregular', 'irregular'], ['Tomo anticoncepcional', 'anticoncepcional'], ['Não menstruo (DIU, contínuo, menopausa...)', 'nao'], ['Prefiro não dizer', 'nd']], se: r => ehF(r) && r.gestacao !== 'gravida' },
  { k: 'sono_estresse', t: 'Como anda seu sono e seu estresse?', sub: 'Juntando os dois: escolhe o que mais parece com você.', tipo: 'um', op: [['😩 1 · durmo mal e vivo estressada', 1], ['😕 2 · durmo mal ou ando bem estressada', 2], ['😐 3 · mais ou menos', 3], ['🙂 4 · durmo bem, um pouco de estresse', 4], ['😄 5 · durmo bem e tô tranquila', 5]], num: true },
  { k: 'atividade', t: 'Fora do treino, como é seu dia a dia?', sub: 'Pra calcular quanto você gasta por dia.', tipo: 'um', op: [['Sentada a maior parte (escritório, estudo)', 'sedentaria'], ['Anda bastante, fica em pé', 'leve'], ['Trabalho ativo, carrego peso', 'moderada'], ['Muito ativo o dia inteiro', 'alta']], req: true },
  { k: 'nascimento', t: 'Sua data de nascimento', sub: 'Com a idade eu calculo quantas calorias seu corpo gasta por dia.', tipo: 'data', req: true },
  { k: 'medidas', t: 'Seu peso e altura', sub: 'Com isso o app calcula o gasto de cada treino.', tipo: 'medidas', req: true },
  { k: 'nutri', t: 'Faz acompanhamento com nutricionista?', tipo: 'um', op: ['Sim', 'Não', 'Quero fazer'] },
  { k: 'desistiu', t: 'O que já te fez desistir de treinar antes?', sub: 'Pra o Igor te ajudar a não repetir.', tipo: 'um', op: ['Falta de tempo', 'Falta de resultado', 'Dor ou lesão', 'Sem companhia ou motivação', 'Nunca desisti'] }
];
const CAMPOS_ANAM = ['objetivo', 'sexo', 'dias_semana', 'tempo_treino_min', 'horario', 'local_treino', 'academia_tipo', 'equipamento', 'experiencia', 'foco', 'cardio', 'limitacoes', 'evita', 'saude', 'gestacao', 'ciclo', 'sono_estresse', 'atividade', 'nascimento', 'nutri', 'peso_kg', 'altura_m', 'desistiu'];
// Rótulo de uma resposta salva (o valor no banco fica em português; aqui só o que aparece na tela)
function rotuloAnam(k, v) {
  if (v == null || v === '') return null;
  const q = Q.find(x => x.k === k), o = (q?.op || []).find(o => String(Array.isArray(o) ? o[1] : o) === String(v));
  return o ? t(Array.isArray(o) ? o[0] : o) : v;
}
// Rascunho fica no celular a cada resposta; voltar do celular = pergunta anterior; sem pular sozinho;
// no fim, uma tela pra conferir tudo antes de enviar.
const cuidadoSaude = r => (r.saude || []).some(x => /Pressão|cardíaco|Diabetes|Cirurgia|peito|desmaiei|acompanhamento/.test(x)) || (r.gestacao && r.gestacao !== 'nao');
// Logo depois da 1ª anamnese: as 3 fotos do início (viram a "foto zero" da evolução e a base da avaliação postural do Igor)
async function fotosDoInicio() {
  if (document.querySelector('#overlay .modal')) return setTimeout(fotosDoInicio, 1500);
  const o = await escolher(t('Agora, suas fotos do início 📸'), t('Três fotos rápidas: frente, lado e costas. Elas mostram sua evolução lá na frente e ajudam o Igor a ver sua postura. Só você e o Igor veem.'), [t('Tirar agora'), t('Depois')]);
  if (o === 0) { S.abrirRegistro = true; go('evolucao'); }
}
function anamneseForm(p, done, titulo = 'Me conta de você') {
  const primeira = !p.anamnese_em; // lido antes de salvar (o perfil é atualizado no lugar)
  const rasc = db.LS.get('anamnese');
  const r = rasc?.r || Object.fromEntries(CAMPOS_ANAM.map(k => [k, ['foco', 'saude', 'equipamento'].includes(k) ? (p[k] || []) : (p[k] ?? null)]));
  // -1 = boas-vindas (1ª vez); já respondeu antes = abre na revisão, ela toca só no que quer mudar
  let i = rasc ? rasc.i : (p.objetivo ? Q.length : -1), revisando = false;
  const val = o => Array.isArray(o) ? o[1] : o, lab = o => t(Array.isArray(o) ? o[0] : o);
  // O que ela digitou (dor, data, peso/altura) fica guardado também no Voltar e no Depois, não só no Próxima
  let lerAtual = () => {};
  const guarda = () => { try { lerAtual(); } catch {} db.LS.set('anamnese', { r, i: Math.max(0, i) }); };
  const fechar = () => { guarda(); voltarOverlay = null; closeOverlay(); };
  let naRevisao = false;
  // Pergunta que não se aplica (ex. tipo de academia pra quem só treina em casa) é pulada na ida, na volta e na revisão
  const ativa = q => !q.se || q.se(r);
  const prox = j => { while (j < Q.length && !ativa(Q[j])) j++; return j; };
  const ant = j => { while (j >= 0 && !ativa(Q[j])) j--; return j; };
  const ativas = () => Q.filter(ativa);
  voltarOverlay = () => { if (naRevisao) return fechar(); if (revisando || i === Q.length) { i = Q.length; return revisao(); } const a = ant(i - 1); if (a >= 0) { guarda(); i = a; guarda(); tela(); } else fechar(); };
  const caixa = (miolo, rodape) => overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:14px;margin-top:20px;min-height:70vh;overflow:visible">${miolo}<div class="row rodape">${rodape}</div></div></div>`);
  const falta = q => ativa(q) && q.req && !(q.tipo === 'medidas' ? (r.peso_kg && r.altura_m) : q.tipo === 'multi' ? (r[q.k] || []).length : r[q.k] != null && r[q.k] !== '');
  const resposta = q => {
    if (q.tipo === 'medidas') return [r.peso_kg ? virgula(r.peso_kg) + ' kg' : '', r.altura_m ? virgula(r.altura_m) + ' m' : ''].filter(Boolean).join(' · ');
    const v = r[q.k]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
    if (q.tipo === 'data') return dataLocal(v + 'T12:00', { day: '2-digit', month: 'short', year: 'numeric' });
    const nome = x => { const o = (q.op || []).find(o => String(val(o)) === String(x)); return o ? lab(o) : x; }; // texto livre fica como ela escreveu
    return Array.isArray(v) ? v.map(nome).join(', ') : nome(v);
  };
  function boasVindas() {
    caixa(`<h3>${esc(t(titulo))}</h3><div style="flex:1;display:flex;flex-direction:column;gap:12px;justify-content:center"><h2 style="font-size:1.75rem">${t('Antes do primeiro treino')}</h2><p style="font-size:1.0625rem;line-height:1.45">${t('São {n} perguntas rápidas (uns 3 minutos). Com elas o Igor monta o <b>seu</b> treino.', { n: ativas().length })}</p><p class="muted">${t('Dá pra parar e continuar depois: o que você responder fica salvo.')}</p></div>`,
      `<button class="btn ghost sm" id="cancel" style="flex:1">${t('Depois')}</button><button class="btn sm" id="next" style="flex:2">${t('Começar')}</button>`);
    $('#cancel').onclick = fechar; $('#next').onclick = () => { i = prox(0); guarda(); tela(); };
  }
  function revisao() {
    revisando = true; naRevisao = true;
    caixa(`<div class="row between"><h3>${esc(t(titulo))}</h3><span class="muted small">${t('Confere')}</span></div><h2 style="font-size:1.5rem">${t('Tá tudo certo?')}</h2><p class="muted">${primeira && p.objetivo ? t('O Igor já preencheu com o que você respondeu antes. Confere, completa o que estiver faltando e envia.') : t('Toca numa resposta pra mudar.')}</p>
      <div style="flex:1">${Q.map((q, j) => !ativa(q) ? '' : `<button class="linha" data-j="${j}" style="flex-direction:column;align-items:flex-start;gap:2px"><span class="muted small" style="text-align:left">${esc(t(q.t))}</span>${falta(q) ? `<b style="text-align:left;color:var(--accent)">${t('falta responder')} ›</b>` : `<b style="text-align:left;font-weight:600">${esc(resposta(q) || '—')}</b>`}</button>`).join('')}</div>
      <p class="err" id="e" hidden></p>`,
      `<button class="btn ghost sm" id="cancel" style="flex:1">${t('Fechar')}</button><button class="btn sm" id="next" style="flex:2">${t('Enviar pro Igor')}</button>`);
    $('#cancel').onclick = fechar;
    $$('[data-j]').forEach(b => b.onclick = () => { i = +b.dataset.j; tela(); });
    $('#next').onclick = salvar;
  }
  function tela() {
    naRevisao = false;
    if (i < 0) return boasVindas();
    i = prox(i);
    if (i >= Q.length) return revisao();
    const q = Q[i]; const sel = r[q.k];
    let corpo = '';
    const marcado = o => q.tipo === 'multi' ? (sel || []).includes(val(o)) : String(sel) === String(val(o));
    if (q.tipo === 'um' || q.tipo === 'multi') corpo = `<div id="ops" class="opcoes ${q.tipo === 'multi' ? 'multi' : ''}">${q.op.map(o => `<button type="button" class="opc ${marcado(o) ? 'on' : ''}" data-v="${esc(val(o))}">${esc(lab(o))}</button>`).join('')}</div>`;
    if (q.tipo === 'texto') corpo = `<input class="input" id="tx" value="${esc(sel || '')}" placeholder="${esc(t(q.ph || ''))}">`;
    if (q.tipo === 'data') { const hj = new Date(); corpo = `<input class="input" id="tx" type="date" value="${esc(sel || '')}" min="${hj.getFullYear() - 90}-01-01" max="${hj.getFullYear() - 14}-12-31">`; }
    if (q.tipo === 'medidas') corpo = `<div class="grid2"><div class="field"><label class="l" for="pk">${t('Peso (kg)')}</label><input class="input" id="pk" inputmode="decimal" value="${virgula(r.peso_kg)}" placeholder="${t('ex. {v}', { v: 64 })}"></div><div class="field"><label class="l" for="al">${t('Altura (m)')}</label><input class="input" id="al" inputmode="decimal" value="${virgula(r.altura_m)}" placeholder="${t('ex. {v}', { v: dec(1.65) })}"><p class="muted small" style="margin-top:4px">${t('Pode ser 1,58 ou 158')}</p></div></div>`;
    caixa(`<div class="row between"><h3>${esc(t(titulo))}</h3><span class="muted small" style="white-space:nowrap">${t('{a} de {b}', { a: ativas().indexOf(q) + 1, b: ativas().length })}</span></div><div class="bar"><i style="width:${ativas().indexOf(q) / ativas().length * 100}%"></i></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:10px"><h2 style="font-size:1.5rem">${esc(t(q.t))}</h2>${q.sub ? `<p class="muted">${esc(t(q.sub))}</p>` : ''}<p class="err" id="e" hidden>${t('Essa é importante pro Igor montar seu treino.')}</p>${corpo}</div>`, /* aviso logo embaixo da pergunta: não fica fora da tela nem atrás do rodapé */
      `${ant(i - 1) >= 0 ? `<button class="btn ghost sm" id="prev" style="flex:1">${t('Voltar')}</button>` : `<button class="btn ghost sm" id="cancel" style="flex:1">${t('Depois')}</button>`}<button class="btn sm" id="next" style="flex:2">${revisando ? t('Pronto') : prox(i + 1) >= Q.length ? t('Conferir') : t('Próxima')}</button>`);
    if ($('#ops')) $('#ops').onclick = e => { const b = e.target.closest('button'); if (!b) return; const v = q.num ? +b.dataset.v : b.dataset.v;
      if (q.tipo === 'multi') { let arr = r[q.k] || []; if (q.excl && v === q.excl) arr = [v]; else { arr = arr.filter(x => x !== q.excl); arr = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]; } r[q.k] = arr; $$('#ops button').forEach(x => x.classList.toggle('on', arr.includes(q.num ? +x.dataset.v : x.dataset.v))); }
      else { r[q.k] = v; $$('#ops button').forEach(x => x.classList.toggle('on', x === b)); }
      $('#e').hidden = true; guarda(); };
    ['#tx', '#pk', '#al'].forEach(sl => { const x = $(sl); if (x) x.addEventListener('input', () => { $('#e').hidden = true; }); }); // preencheu: o aviso vermelho some
    lerAtual = () => { if (!$('#next')) return; if ((q.tipo === 'texto' || q.tipo === 'data') && $('#tx')) r[q.k] = $('#tx').value.trim() || null;
      if (q.tipo === 'medidas' && $('#pk')) { const pk = numero($('#pk').value); let al = numero($('#al').value); if (al && al > 3) al = +(al / 100).toFixed(2); r.peso_kg = pk; r.altura_m = al; } };
    if ($('#prev')) $('#prev').onclick = () => { guarda(); i = ant(i - 1); guarda(); tela(); };
    if ($('#cancel')) $('#cancel').onclick = fechar;
    $('#next').onclick = avancar;
    function avancar() {
      if (q.tipo === 'texto' || q.tipo === 'data') r[q.k] = $('#tx').value.trim() || null;
      if (q.tipo === 'data' && r[q.k]) { const idade = (Date.now() - new Date(r[q.k] + 'T12:00')) / 31557600000; if (!(idade >= 14 && idade <= 90)) { $('#e').textContent = t('Confere o ano: ex. {v}', { v: new Date().getFullYear() - 30 }); $('#e').hidden = false; r[q.k] = null; return; } }
      if (q.tipo === 'medidas') {
        let pk = numero($('#pk').value), al = numero($('#al').value);
        if (al && al > 3) al = +(al / 100).toFixed(2); // digitou 165 (cm) → 1,65 m
        if (pk != null && (pk < 30 || pk > 250)) { $('#e').textContent = t('Confere o peso: ex. 64 ou {v}', { v: dec(64.5) }); $('#e').hidden = false; return; }
        if (al != null && (al < 1.2 || al > 2.2)) { $('#e').textContent = t('Confere a altura: ex. {v}', { v: dec(1.65) }); $('#e').hidden = false; return; }
        r.peso_kg = pk; r.altura_m = al;
      }
      const ok = q.tipo === 'medidas' ? (r.peso_kg && r.altura_m) : q.tipo === 'multi' ? (r[q.k] || []).length : r[q.k] != null && r[q.k] !== '';
      if (q.req && !ok) { $('#e').textContent = q.tipo === 'data' ? t('Toca no campo e escolhe o dia, o mês e o ano em que você nasceu.') : q.tipo === 'multi' || q.tipo === 'um' ? t('Toca numa das opções aqui embaixo. Essa é importante pro Igor montar seu treino.') : t('Essa é importante pro Igor montar seu treino.'); $('#e').hidden = false; try { $('#e').scrollIntoView({ block: 'center' }); } catch {} return; }
      i = revisando ? Q.length : prox(i + 1); guarda(); tela();
    }
  }
  async function salvar() {
    const f = Q.findIndex(falta);
    if (f >= 0) { i = f; return tela(); }
    $('#next').disabled = true; $('#next').textContent = t('Enviando…');
    Q.forEach(q => { if (!ativa(q)) r[q.k] = q.k === 'gestacao' ? 'nao' : q.tipo === 'multi' ? [] : null; });
    try { const novo = await db.salvarPerfil({ ...r, anamnese_em: new Date().toISOString() }); if (novo && S.perfil?.id === novo.id) S.perfil = novo; voltarOverlay = null; closeOverlay(); db.LS.del('anamnese'); done();
      if (primeira && S.perfil?.role !== 'admin') setTimeout(fotosDoInicio, cuidadoSaude(r) ? 2600 : 900); // 1ª vez: já pede a foto zero
      // Pressão alta, coração, diabetes, cirurgia recente ou gravidez: orientação na hora (o Igor também vê o alerta no painel)
      const cuidado = cuidadoSaude(r), urgente = (r.saude || []).some(x => /peito|desmaiei|acompanhamento/.test(x));
      toast(urgente ? t('Enviado ✓ Você marcou dor no peito, desmaio ou acompanhamento médico: antes de qualquer treino, passa no médico e leva a liberação pro Igor. Ele vai falar com você.') : cuidado ? t('Enviado ✓ Como você marcou um cuidado de saúde, leva a liberação do seu médico pro Igor antes do HIIT e de cargas altas. Até lá, cardio leve.') : t('Enviado! O Igor monta seu treino a partir disso ✓'), false, { fixo: cuidado }); }
    catch (e) { $('#e').textContent = traduzErro(e) + ' ' + t('Suas respostas ficaram salvas no celular.'); $('#e').hidden = false; $('#next').disabled = false; $('#next').textContent = t('Enviar pro Igor'); }
  }
  tela();
}

routes.admin = async () => (await import('./admin.js')).adminView(S, { render, go, anamneseForm, db });

// BOOT ------------------------------------------------------------------------
async function boot() {
  if (!(C0.DEMO || new URLSearchParams(location.search).has('demo')) && (!C.SUPABASE_URL || C.SUPABASE_URL.includes('SEU-PROJETO'))) return render(`<div class="view noTabs"><div class="logo big" style="margin-top:40px">IGOR<br>SOUSA <b>TEAM</b></div><div class="card"><b>Falta ligar o banco.</b><p class="muted">Preencha js/config.js com a URL e a anon key do projeto Supabase. O passo a passo está no README.</p></div></div>`);
  // 4G que "conecta mas não passa nada": com o perfil guardado no celular, abre em até 4 s e atualiza depois.
  const guardado = db.LS.get('perfil'), ESPERA = Symbol();
  const pronto = (p, ms) => guardado ? Promise.race([p, new Promise(r => setTimeout(() => r(ESPERA), ms))]) : p;
  S.user = await pronto(db.sessionUser().catch(() => null), 4000);
  if (S.user === ESPERA) S.user = { id: guardado.id };
  if (!S.user) return go('entrada');
  let semRede = false;
  S.perfil = await pronto(db.perfil().catch(er => { semRede = erroDeRede(er); return null; }), 4000);
  if (S.perfil === ESPERA) { S.perfil = guardado; db.perfil().then(p => { if (p && S.perfil?.id === p.id) S.perfil = p; }).catch(() => {}); }
  if (!S.perfil && (semRede || navigator.onLine === false)) { render(`<div class="view noTabs"><div class="logo big" style="margin-top:40px">IGOR<br>SOUSA <b>TEAM</b></div><h2>${t('Sem internet pra carregar sua conta')}</h2><p class="muted">${t('Na 1ª vez neste celular o app precisa de sinal. Depois ele abre mesmo sem internet.')}</p><button class="btn" id="o">↻ ${t('Tentar de novo')}</button></div>`); $('#o').onclick = () => boot(); return; }
  if (!S.perfil) { render(`<div class="view noTabs"><h2>${t('Conta sem perfil')}</h2><p class="muted">${t('Chama o Igor no WhatsApp pra liberar seu acesso.')}</p><button class="btn ghost" id="o">${t('Sair')}</button></div>`); $('#o').onclick = async () => { await db.logout(); go('entrada'); }; return; }
  if (!S.perfil.ativa && S.perfil.role !== 'admin') { A.limparLembrete(); render(`<div class="view noTabs"><h2>${t('Acesso pausado')}</h2><p class="muted">${t('Sua assinatura tá pausada. Renovou? É só me chamar que libero na hora.')}</p><a class="btn" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}">${t('Falar com o Igor')}</a><button class="btn ghost" id="o">${t('Sair')}</button></div>`); $('#o').onclick = async () => { await db.logout(); go('entrada'); }; return; }
  sincronizarFila();
  if (S.perfil.role === 'admin') return go('admin');
  if (S.perfil.senha_trocada === false) return criarSenha();
  S.sessao = db.LS.get('sessao');
  // Treino pausado de outra conta neste celular: guarda pra dona dele; o desta conta (se saiu com ele pausado) volta
  if (S.sessao?.dono && S.sessao.dono !== S.perfil.id) { db.LS.set('sessao@' + S.sessao.dono, S.sessao); S.sessao = null; db.LS.del('sessao'); }
  if (!S.sessao && db.LS.get('sessao@' + S.perfil.id)) { S.sessao = db.LS.get('sessao@' + S.perfil.id); db.LS.del('sessao@' + S.perfil.id); db.LS.set('sessao', S.sessao); }
  if (S.sessao && !S.sessao.pausadoEm && !S.sessao.fimEm) { const ult = S.sessao.ocultoEm || S.sessao.ult; if (ult && Date.now() - ult > FORA_MAX) { S.sessao.pausadoEm = ult; S.sessao.ocultoEm = null; db.LS.set('sessao', S.sessao); } else if (S.sessao.ocultoEm) { const g = descontaFora(S.sessao); if (g >= 60000) setTimeout(() => toast(t('Você ficou fora: tirei {n} min de tempo parado do relógio do treino.', { n: Math.round(g / 60000) })), 1500); } } // o celular fechou o app em menos de 5 min: desconta igual
  const h = location.hash.slice(1);
  // Encerrou o treino e fechou o app sem tocar em Enviar: depois de 2 h registra sozinho com o que ela já tinha marcado
  if (S.sessao?.fimEm && Date.now() - S.sessao.fimEm > 2 * 3600000 && seriesFeitas(S.sessao)) {
    const s0 = S.sessao; S.sessao = null; db.LS.del('sessao'); const fb = s0.fb || {}, dor = s0.dor?.length ? `⚠ dor: ${s0.dor.join(', ')}` : '';
    enviarSessao(s0, { esforco: fb.esf ?? null, nota: fb.nota ?? null, comentario: [String(fb.txt || '').trim(), dor].filter(Boolean).join(' · ') || null }).then(ok => { toast(ok ? t('Seu {x} foi registrado ✓ (você tinha saído antes de enviar)', { x: nomeTreino(s0.titulo) }) : t('{x} guardado no celular. Envio quando o sinal voltar.', { x: nomeCurto(s0.titulo) }), false, { fixo: true }); if (rotaAtual === 'home') routes.home(); }); // Início redesenha com o treino já contado (não manda fazer de novo)
  }
  // Treino esquecido há mais de 12h: não apaga, pergunta se ela quer registrar o que fez
  const s = S.sessao, velho = s && Date.now() - (s.pausadoEm || s.ult || s.inicio) > 12 * 3600000;
  if (velho && !seriesFeitas(s)) { S.sessao = null; db.LS.del('sessao'); }
  else if (velho) {
    go('home');
    const quando = dataLocal(s.pausadoEm || s.ult || s.inicio, { weekday: 'long' });
    const o = await escolher(t('Treino pela metade'), t('Seu {x} de {dia} ficou com {n} séries marcadas. Quer registrar o que você fez?', { x: nomeTreino(s.titulo), dia: quando, n: seriesFeitas(s) }), [t('Registrar o que fiz'), t('Continuar o treino'), t('Descartar')]);
    if (o < 0) { if (!s.pausadoEm) s.pausadoEm = s.ocultoEm || s.ult || Date.now(); salvaSessao(); return routes.home(); } // voltar: fica pausado, nada se perde
    if (o === 0) { s.fimEm = s.registrarEm = s.pausadoEm || s.ocultoEm || s.ult || Date.now(); s.pausadoEm = null; salvaSessao(); go('fim'); } // fica no dia em que ela parou
    else if (o === 1) { if (!s.pausadoEm) s.pausadoEm = s.ocultoEm || s.ult || Date.now(); salvaSessao(); go('sessao'); }
    else { db.desfazerCargas(s.chave); S.sessao = null; db.LS.del('sessao'); toast(t('Treino descartado')); routes.home(); }
    return;
  }
  if (S.sessao && ['sessao', 'fim'].includes(h)) { go(h); setTimeout(perguntaTreinoAberto, 900); return; }
  if (A.lembreteLigado()) A.ligarLembrete({ silencioso: true });
  ativarPush();
  setTimeout(perguntaTreinoAberto, 900);
  if (A.boasVindasPendente(S.perfil)) await A.boasVindas(S.perfil);
  go(['treino', 'videos', 'pontos', 'evolucao', 'perfil', 'lib', 'assistente', 'comunidade'].includes(h) ? h : 'home');
  // Sem anamnese enviada: abre sozinha. Já preenchida pelo Igor (veio do Mfit) = abre na tela de conferir, ela só revisa e envia.
  if (!S.perfil.anamnese_em && S.perfil.role !== 'admin') anamneseForm(S.perfil, () => go('home'), S.perfil.objetivo ? 'Confere sua anamnese' : 'Me conta de você');
}
// 1º acesso: a senha inicial é o WhatsApp; ela cria uma só dela antes de entrar.
function criarSenha() {
  render(`<div class="view noTabs fx" style="padding-top:28px"><div class="logo big" style="font-size:1.875rem">IGOR<br>SOUSA <b>TEAM</b></div>
  <div><h1>${t('Bem-vinda, {nome}!', { nome: esc(primeiroNome(S.perfil.nome)) })}</h1><p class="mt" style="font-size:1rem;line-height:1.45">${t('Sua senha de agora é o seu WhatsApp. Cria uma senha só sua (pelo menos 6 letras ou números) pra ninguém entrar no seu app.')}</p></div>
  <form id="fs" style="display:flex;flex-direction:column;gap:14px"><div class="field"><label class="l" for="n1">${t('Nova senha')}</label>${campoSenha('n1', t('6 ou mais'))}</div>
  <div class="field"><label class="l" for="n2">${t('Repete a senha')}</label>${campoSenha('n2', t('repete'))}</div>
  <p class="muted small">${t('Dica: algo fácil pra você lembrar e difícil pros outros adivinharem. Não use o WhatsApp.')}</p>
  <p class="err" id="e" hidden></p><button class="btn" id="s">${t('Salvar e entrar')}</button></form>
  <a class="btn ghost sm" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}" target="_blank" rel="noopener">${t('Chamar o Igor no WhatsApp')}</a>
  <button class="link-fim" id="naoSou">${t('Não é você, {nome}? Sair', { nome: esc(primeiroNome(S.perfil.nome)) })}</button></div>`);
  $('#naoSou').onclick = async () => { await db.logout().catch(() => {}); S.perfil = null; go('entrada'); };
  $('#fs').onsubmit = async ev => {
    ev.preventDefault();
    const a = $('#n1').value, erro = erroSenha(a, $('#n2').value);
    if (erro) { $('#e').textContent = erro; $('#e').hidden = false; return; }
    $('#e').hidden = true; $('#s').disabled = true; $('#s').textContent = t('Salvando…');
    try { await db.trocarSenha(a); S.perfil = await db.salvarPerfil({ senha_trocada: true }); if (S.perfil?.anamnese_em) toast(t('Senha criada ✓ Guarda ela!'), false, { curto: true }); boot(); } // anamnese abrindo logo depois: o aviso não cobre o título dela
    catch (er) { $('#e').textContent = traduzErro(er); $('#e').hidden = false; $('#s').disabled = false; }
  };
}
window.addEventListener('online', sincronizarFila);
db.sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') { overlay(`<div class="modal" id="m"><form class="box" id="fs" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>${t('Cria sua nova senha')}</h2><div class="field"><label class="l" for="n1">${t('Nova senha')}</label>${campoSenha('n1', t('6 ou mais'))}</div><div class="field"><label class="l" for="n2">${t('Repete a senha')}</label>${campoSenha('n2')}</div><p class="err" id="e" hidden></p><button class="btn sm" id="s">${t('Salvar')}</button><button type="button" class="btn ghost sm" id="c">${t('Agora não')}</button></form></div>`); $('#c').onclick = () => closeOverlay(); $('#fs').onsubmit = async ev => { ev.preventDefault(); const er = erroSenha($('#n1').value, $('#n2').value); if (er) { $('#e').textContent = er; $('#e').hidden = false; return; } if ($('#s').disabled) return; $('#e').hidden = true; $('#s').disabled = true; $('#s').textContent = t('Salvando…'); try { await db.trocarSenha($('#n1').value); await db.salvarPerfil({ senha_trocada: true }).then(p => { if (p && S.perfil?.id === p.id) S.perfil = p; }).catch(() => {}); closeOverlay(); toast(t('Senha criada ✓')); boot(); } catch (e) { $('#e').textContent = traduzErro(e); $('#e').hidden = false; $('#s').disabled = false; $('#s').textContent = t('Salvar'); } }; } }); // link do e-mail: a senha nova já vale como a dela (não pede de novo no 1º acesso)
boot();
