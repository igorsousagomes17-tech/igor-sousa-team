const C0 = window.ISTEAM_CONFIG;
const DEMO = !!(C0.DEMO || new URLSearchParams(location.search).has('demo'));
const db = DEMO ? await import('./db-mock.js') : await import('./db.js');
import { $, $$, esc, toast, overlay, closeOverlay, fmtMin, hoje, primeiroNome, fmtData, videoModal, restTimer, tabs, cardImagem, pararDescanso, descansoAtivo, minimizarDescanso, campoSenha, traduzErro } from './ui.js';
import { adminView } from './admin.js';
import { t, t as T, tp, num, dec, dataLocal, idioma, setIdioma, IDIOMAS, infoIdioma } from './i18n.js'; // T = t, pra quando "t" já é nome de variável

const C = window.ISTEAM_CONFIG;
const app = $('#app');
const S = { user: null, perfil: null, plano: null, programas: null, sessao: null };

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

// ROTEADOR ----------------------------------------------------------------
const routes = {};
// Cada tela entra no histórico do navegador: o "voltar" do celular volta pra tela anterior em vez de fechar o app.
let rotaAtual = null, argAtual = null, voltarOverlay = null;
// Resposta rápida no 4G ruim: se o banco demorar, segue com o que tem guardado no celular.
const rapido = (p, fb, ms = 5000) => Promise.race([Promise.resolve(p).catch(() => fb), new Promise(r => setTimeout(() => r(fb), ms))]).then(v => v ?? fb);
function go(name, arg, { hist = true } = {}) {
  if (!routes[name]) name = 'home';
  if (['sessao', 'fim'].includes(rotaAtual) && !['sessao', 'fim'].includes(name)) sairDaSessao();
  arg = arg ?? null;
  const st = { name, arg };
  if (hist) { const igual = name === rotaAtual && arg === argAtual; if (rotaAtual === null || igual || ['entrada', 'login'].includes(rotaAtual) && name !== 'login') history.replaceState(st, '', '#' + name); else history.pushState(st, '', '#' + name); }
  rotaAtual = name; argAtual = arg;
  $$('.tabs .tab').forEach(t => t.classList.toggle('on', t.dataset.go === name)); // acende a aba na hora, antes de carregar
  window.scrollTo(0, 0); Promise.resolve(routes[name](arg)).then(() => { if (rotaAtual === name) window.scrollTo(0, 0); });
}
const comLimite = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('lento')), ms))]);
const repoe = () => history.pushState({ name: rotaAtual, arg: argAtual }, '', '#' + rotaAtual);
window.addEventListener('popstate', ev => {
  if (voltarOverlay) { voltarOverlay(); return repoe(); } // anamnese: voltar = pergunta anterior
  if ($('#overlay').innerHTML) { closeOverlay(); return repoe(); } // voltar fecha pop-up primeiro
  if (minimizarDescanso()) return repoe(); // descanso aberto: voltar só minimiza, o tempo continua
  const st = ev.state || { name: S.perfil ? 'home' : 'entrada' };
  if (!S.perfil && !['entrada', 'login'].includes(st.name)) return go('entrada', null, { hist: false });
  if (S.perfil && ['entrada', 'login'].includes(st.name)) { history.replaceState({ name: 'home', arg: null }, '', '#home'); return go('home', null, { hist: false }); }
  if (rotaAtual === 'sessao' && S.sessao && st.name !== 'sessao' && st.name !== 'fim') toast(t('Treino pausado. Continua pela tela inicial.'));
  go(st.name, st.arg, { hist: false });
});
// Pergunta simples no estilo do app (sem pop-up do navegador)
function perguntar(titulo, texto, sim, nao) {
  return new Promise(res => {
    overlay(`<div class="modal" id="m"><div class="box" style="padding:18px;display:flex;flex-direction:column;gap:12px"><h2>${esc(titulo)}</h2><p class="muted">${esc(texto)}</p><button class="btn sm" id="q-s">${esc(sim)}</button><button class="btn ghost sm" id="q-n">${esc(nao)}</button></div></div>`);
    $('#q-s').onclick = () => { closeOverlay(); res(true); }; $('#q-n').onclick = () => { closeOverlay(); res(false); };
  });
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go, g.dataset.arg); }
  const v = e.target.closest('[data-vid]'); if (v) videoModal(v.dataset.vid, v.dataset.url, v.dataset.dica);
});
function render(html, tab) { app.innerHTML = html + (tab ? tabs(tab) : ''); }

// STREAK semanal: semanas seguidas com pelo menos 1 treino (contadas em dias pra exibir)
function streakDias(sessoes) {
  const dias = new Set(sessoes.map(s => s.finalizada_em.slice(0, 10)));
  let n = 0, d = new Date();
  for (let i = 0; i < 400; i++) { const k = d.toISOString().slice(0, 10); if (dias.has(k)) n++; else if (i > 0 && n > 0 && !dias.has(k)) { /* tolera dias sem treino dentro da semana */ } d.setDate(d.getDate() - 1); if (i > 7 && n === 0) break; }
  // simplificação v1: dias com treino nos últimos 30 dias contínuos sem semana vazia
  const semanas = new Set(sessoes.map(s => isoWeek(new Date(s.finalizada_em))));
  let w = isoWeek(new Date()), count = 0;
  while (semanas.has(w)) { count++; w = isoWeek(new Date(new Date().getTime() - count * 7 * 86400000)); }
  return { dias: n, semanas: count };
}
const fogo = st => '🔥 ' + tp(st.semanas, '{n} semana', '{n} semanas');
// "Treino A" é o nome gravado no banco (fica em português); na tela aparece no idioma dela.
const nomeTreino = x => String(x || '').replace(/^Treino ([A-Z])$/, (_, l) => t('Treino {l}', { l }));
// Seletor de idioma (Perfil e tela de entrada): trocar re-desenha a tela atual na hora.
function escolherIdioma() {
  overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:8px"><h2>🌐 ${t('Idioma')}</h2><div class="opcoes">${IDIOMAS.map(i => `<button type="button" class="opc ${i.id === idioma() ? 'on' : ''}" data-l="${i.id}" lang="${i.id}"><span style="font-size:20px;margin-right:8px">${i.flag}</span>${i.nome}</button>`).join('')}</div><button class="btn ghost sm" id="lc" style="margin-top:4px">${t('Fechar')}</button></div></div>`);
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
  <div class="logo big" style="font-size:34px;margin-top:24px">IGOR<br>SOUSA <b>TEAM</b></div>
  <form id="f" style="display:flex;flex-direction:column;gap:14px">
    ${DEMO ? `<div class="card" style="padding:10px 14px"><p class="muted small"><b style="color:var(--fg)">${t('Modo demonstração.')}</b> ${t('Já preenchi o seu acesso (painel do Igor). Pra ver como aluna, troca o e-mail por ana@demo.com.')}</p></div>` : ''}
    <div class="field"><label class="l" for="em">${t('E-mail')}</label><input class="input" id="em" type="email" autocomplete="username" inputmode="email" required value="${DEMO ? 'igor@demo.com' : ''}"></div>
    <div class="field"><label class="l" for="pw">${t('Senha')}</label><div class="senha"><input class="input" id="pw" type="password" autocomplete="current-password" required value="${DEMO ? 'demo1234' : ''}"><button type="button" class="olho">${t('mostrar')}</button></div></div>
    <p class="err" id="err" hidden></p>
    <button class="btn" id="bt">${t('Entrar')}</button>
    <p class="muted center"><a href="#" id="esq">${t('Esqueceu a senha?')}</a> · <a href="${esc(C.KIWIFY_CHECKOUT)}" target="_blank" rel="noopener">${t('Assinar')}</a></p>
    <p class="muted center small">${t('Pagamento pela Kiwify. Confirmou, recebe o acesso no WhatsApp.')}</p></form></div>`);
  $('#lang').onclick = escolherIdioma;
  $('#f').onsubmit = async e => {
    e.preventDefault(); $('#bt').disabled = true; $('#err').hidden = true;
    try { await db.login($('#em').value, $('#pw').value); await boot(); }
    catch (er) { $('#err').textContent = /fetch|network|Failed/i.test(String(er?.message)) ? t('Sem internet agora. Tenta de novo quando o sinal voltar.') : t('E-mail ou senha não conferem. Se for sua primeira vez, a senha é seu WhatsApp (só números, com DDD).'); $('#err').hidden = false; $('#bt').disabled = false; }
  };
  $('#esq').onclick = async e => { e.preventDefault(); const em = $('#em').value; if (!em) return toast(t('Digita seu e-mail primeiro'), true); try { await db.esqueciSenha(em); toast(t('Te mandei um link por e-mail pra criar outra senha.')); } catch { toast(t('Não consegui. Chama o Igor no WhatsApp.'), true); } };
};

// HOME -----------------------------------------------------------------------
// Treinos feitos sem sinal entram na contagem na hora (sequência, meta, treino de hoje), antes de subir pro banco.
const pendentesDaFila = () => db.LS.get('fila', []).filter(it => it.tipo !== 'pontos' && it.patch?.exercicios_feitos > 0).map(it => ({ titulo: it.s.titulo, finalizada_em: it.patch.finalizada_em || new Date().toISOString(), pendente: true }));
async function sessoesComFila(p, lim) { const ss = await rapido(db.minhasSessoes(p.id, lim), db.LS.get('sessoes', [])); return [...pendentesDaFila(), ...ss].sort((a, b) => b.finalizada_em.localeCompare(a.finalizada_em)); }
const seriesFeitas = s => Object.values(s.sets).flat().filter(x => x.done).length;
const haQuanto = x => { const m = Math.round((Date.now() - x) / 60000); return m < 1 ? '' : m < 60 ? t('{n} min', { n: m }) : m < 1440 ? t('{n}h', { n: Math.round(m / 60) }) : tp(Math.round(m / 1440), '{n} dia', '{n} dias'); };
// Resposta do Igor ainda não vista (conta a partir da data da resposta)
function respostaNova(sessoes) {
  const lidas = db.LS.get('respLidas', []);
  return sessoes.filter(x => x.resposta_igor && !lidas.includes(x.id)).find(x => Date.now() - new Date(x.respondida_em || x.finalizada_em) < 14 * 86400000);
}
routes.home = async () => {
  const p = S.perfil;
  const [plano, sessoes, recado, desafio, programas] = await Promise.all([rapido(db.planoAtual(p.id), db.LS.get('plano')), sessoesComFila(p), rapido(db.recadoAtual(), null), rapido(db.desafioAtual(), null), rapido(db.programas(), db.LS.get('programas', []))]);
  if (rotaAtual !== 'home') return; // ela já foi pra outra tela enquanto carregava
  S.plano = plano; S.programas = programas; S.sessoes = sessoes;
  const st = streakDias(sessoes);
  const sa = S.sessao, resp = respostaNova(sessoes);
  const mesCount = sessoes.filter(s => s.finalizada_em >= new Date(new Date().setDate(1)).toISOString().slice(0, 10)).length;
  const wk = isoWeek(new Date()); const semCount = sessoes.filter(s => isoWeek(new Date(s.finalizada_em)) === wk).length;
  const meta = p.dias_semana || 4; const dmeta = desafio?.meta_treinos || 16;
  const prox = proximoTreino(plano, sessoes);
  const sf = sa ? seriesFeitas(sa) : 0;
  render(`<div class="view fx"><div class="topbar"><div class="logo sm">IGOR SOUSA <b>TEAM</b></div><span class="pill on" title="${t('semanas seguidas treinando')}">${fogo(st)}</span></div>
  <div><p class="muted" style="text-transform:capitalize">${hoje()}</p><h1>${t('Bora, {nome}?', { nome: esc(primeiroNome(p.nome)) })}</h1></div>
  ${!p.objetivo ? `<div class="card" style="border:1px solid var(--accent)"><b style="font-size:16px">${t('Falta me contar de você')}</b><p class="muted">${t('{n} perguntas rápidas (uns 3 min) pro Igor montar o seu treino.', { n: Q.length })}</p><button class="btn sm mt" id="anam" style="width:100%">${t('Responder agora')}</button></div>` : ''}
  ${sa ? `<div class="card hero"><span class="pill" style="background:rgba(0,0,0,.18);color:#1a0d00">${sa.pausadoEm ? (haQuanto(sa.pausadoEm) ? t('Treino pausado há {t}', { t: haQuanto(sa.pausadoEm) }) : t('Treino pausado há pouco')) : t('Treino em andamento')}</span><div class="logo" style="font-size:28px;margin:8px 0 4px;color:#1a0d00">${esc(nomeTreino(sa.titulo))}</div><p style="color:#1a0d00;font-weight:600">${tp(sf, '{n} série feita', '{n} séries feitas')} · ${t('{a} de {b} exercícios · tudo salvo', { a: feitosCount(sa), b: sa.exs.length })}</p><button class="btn dark" style="margin-top:8px" data-go="sessao">${t('Continuar de onde parei')}</button><button class="back" id="desc" style="color:#1a0d00;margin-top:4px;text-decoration:underline">${t('descartar esse treino')}</button></div>`
    : prox ? `<div class="card hero"><div class="row between"><span class="pill" style="background:rgba(0,0,0,.18);color:#1a0d00">${t('Treino de hoje')}</span><span class="small" style="font-weight:600">~${t('{n} min', { n: prox.duracao_min || 40 })}</span></div>
    <div class="logo" style="font-size:30px;margin:8px 0 4px;color:#1a0d00">${t('Treino {l}', { l: esc(prox.letra) })}<br><span style="font-weight:600;font-size:17px;font-family:var(--body);text-transform:none">${esc(prox.nome)}</span></div>
    <button class="btn dark" style="margin-top:8px" data-go="treino" data-arg="${esc(prox.letra)}">${t('Abrir treino')}</button></div>`
    : `<div class="card"><b>${t('Seu treino do mês tá chegando.')}</b><p class="muted">${t('O Igor tá montando com base na sua anamnese. Enquanto isso, os programas extras já estão liberados.')}</p></div>`}
  ${resp ? `<button class="card" id="resp" style="text-align:left;border:1px solid var(--accent);color:var(--fg);width:100%"><b style="font-size:15px">💬 ${t('O Igor te respondeu')}</b><p class="muted">"${esc(resp.resposta_igor)}"</p><p class="small mt" style="color:var(--accent)">${t('toca pra ver')}</p></button>` : ''}
  ${recado ? `<${recado.midia_url ? `a href="${esc(recado.midia_url)}" target="_blank" rel="noopener"` : 'div'} class="card row" style="gap:12px;color:var(--fg);text-decoration:none"><div style="width:44px;height:44px;border-radius:50%;background:${recado.midia_url ? 'var(--accent)' : '#2a2a2e'};display:grid;place-items:center;flex-shrink:0;color:${recado.midia_url ? 'var(--accent-ink)' : 'var(--accent)'};font-size:18px">${recado.midia_url ? '▶' : '💬'}</div><div style="flex:1;min-width:0"><b style="font-size:15px">${t('Recado do Igor')}</b><p class="muted">${esc(recado.texto || '')}${recado.midia_url ? ' · ' + t('toca pra ouvir') : ''}</p></div></${recado.midia_url ? 'a' : 'div'}>` : ''}
  <div class="grid2">
    <button class="card" data-go="pontos" style="text-align:left;border:0;color:var(--fg)"><h3>${esc(desafio?.titulo || t('Desafio do mês'))}</h3><div class="big" style="margin:6px 0 4px">${mesCount}<small>/${tp(dmeta, '{n} treino', '{n} treinos')}</small></div><div class="bar"><i style="width:${Math.min(100, mesCount / dmeta * 100)}%"></i></div><p class="muted mt">${mesCount >= dmeta ? t('Batido! +{n} pts', { n: desafio?.pontos_bonus || 200 }) : t('Faltam {n} pra +{b} pts', { n: dmeta - mesCount, b: desafio?.pontos_bonus || 200 })}</p></button>
    <div class="card"><h3>${t('Meta da semana')}</h3><div class="big" style="margin:6px 0 4px">${semCount}<small>/${tp(meta, '{n} treino', '{n} treinos')}</small></div><div class="row" style="gap:4px">${Array.from({ length: meta }, (_, i) => `<i class="dot ${i < semCount ? 'on' : ''}"></i>`).join('')}</div><p class="muted mt">${semCount >= meta ? t('Semana fechada 💪') : tp(meta - semCount, 'Falta {n} · você consegue', 'Faltam {n} · você consegue')}</p></div>
  </div>
  <button class="card row" data-go="assistente" style="gap:12px;text-align:left;border:1px solid var(--line);color:var(--fg);width:100%"><div style="width:44px;height:44px;border-radius:50%;background:var(--accent);display:grid;place-items:center;flex-shrink:0;color:var(--accent-ink);font-size:20px">💬</div><div style="flex:1;min-width:0"><b style="font-size:15px">${t('Tira-dúvidas 24h')}</b><p class="muted">${t('Pergunta sobre seu treino, execução, carga, cardio... a IA do time responde na hora.')}</p></div></button>
  <div class="row between"><h3>${t('Programas extras')}</h3><button class="back" style="color:var(--accent)" data-go="lib">${t('ver todos')}</button></div>
  <div class="hscroll">${programas.map(pr => `<button class="lib mini" data-go="programa" data-arg="${pr.slug}" style="background-image:url(${esc(pr.capa_url)})"><b>${esc(pr.titulo)}</b><span>${esc(subProg(pr))}</span></button>`).join('')}</div></div>`, 'home');
  if ($('#desc')) $('#desc').onclick = async () => { if (await perguntar(t('Descartar treino?'), t('O que você marcou nesse treino vai ser apagado.'), t('Descartar'), t('Manter'))) { pararDescanso(); S.sessao = null; db.LS.del('sessao'); routes.home(); } };
  if ($('#resp')) $('#resp').onclick = () => { db.LS.set('respLidas', [...db.LS.get('respLidas', []), resp.id].slice(-50)); go('perfil'); };
  if ($('#anam')) $('#anam').onclick = () => anamneseForm(S.perfil, () => go('home'));
};
// "N treinos" sempre bate com o que tem de verdade no programa
function subProg(pr) {
  const n = (pr.programa_treinos || []).length;
  if (!n) return t('em breve');
  const sub = pr.subtitulo || '', tx = tp(n, '{n} treino', '{n} treinos');
  return /^\s*\d+\s*(treinos?|rotinas?)/i.test(sub) ? sub.replace(/^\s*\d+\s*(treinos?|rotinas?)/i, tx) : sub || tx;
}
function proximoTreino(plano, sessoes) {
  if (!plano?.treinos?.length) return null;
  const ultimo = sessoes.find(s => /^Treino [A-Z]$/.test(s.titulo || '')); // só o treino do mês (programa extra não mexe na ordem)
  if (!ultimo) return plano.treinos[0];
  const i = plano.treinos.findIndex(t => ultimo.titulo === `Treino ${t.letra}`);
  return plano.treinos[(i + 1) % plano.treinos.length];
}

// TREINO MENSAL ---------------------------------------------------------------
routes.treino = async (letra) => {
  const plano = S.plano || await rapido(db.planoAtual(S.perfil.id), db.LS.get('plano')); S.plano = plano;
  if (!plano?.treinos?.length) return render(`<div class="view"><div class="topbar"><h2>${t('Treino mensal')}</h2></div><div class="card"><b>${t('Ainda não tem treino montado.')}</b><p class="muted">${t('Assim que o Igor liberar, aparece aqui e você recebe um aviso.')}</p></div></div>`, 'treino');
  if (!letra && S.sessao) letra = (S.sessao.titulo.match(/^Treino ([A-Z])$/) || [])[1]; // treino pausado abre primeiro
  if (!letra) { const ses = S.sessoes || await sessoesComFila(S.perfil); letra = proximoTreino(plano, ses)?.letra; }
  const tr = plano.treinos.find(x => x.letra === letra) || plano.treinos[0];
  const mes = dataLocal(plano.mes + 'T12:00', { month: 'long' });
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="home">‹ ${t('Início')}</button><span class="row" style="gap:6px">${S.perfil.plano === 'personalizado' ? `<span class="pill">${t('Personalizado')}</span>` : ''}<span class="pill" style="text-transform:capitalize">${esc(mes)}</span></span></div>
  <div class="row wrap" style="gap:6px">${plano.treinos.map(x => `<button class="pill big-pill ${x.letra === tr.letra ? 'on' : ''}" data-go="treino" data-arg="${esc(x.letra)}">${t('Treino {l}', { l: esc(x.letra) })}</button>`).join('')}</div>
  <div><h1>${t('Treino {l}', { l: esc(tr.letra) })}</h1><p class="muted">${esc(tr.nome)} · ${tp(tr.exercicios.length, '{n} exercício', '{n} exercícios')} · ~${t('{n} min', { n: tr.duracao_min || 40 })}</p></div>
  ${plano.obs ? `<div class="card" style="padding:10px 14px"><p class="muted"><b style="color:var(--fg)">${t('Do Igor:')}</b> ${esc(plano.obs)}</p></div>` : ''}
  <div>${tr.exercicios.map(e => `<div class="ex"><div class="n">${e.ordem}</div><button class="t" data-hist="${esc(e.nome)}"><b>${esc(e.nome)}</b><span>${e.series > 1 ? t('{n} séries ×', { n: e.series }) + ' ' : ''}${esc(e.reps)}${e.descanso_s ? ' · ' + t('descanso {n}s', { n: e.descanso_s }) : ''}${e.biset_com ? ' · <b style="color:var(--accent);display:inline;font-size:13px">' + t('bi-set: emenda com o {n}', { n: e.biset_com }) + '</b>' : ''}</span><span class="ult" data-n="${esc(e.nome)}"></span></button><button class="play" data-vid="${esc(e.nome)}" data-url="${esc(e.video_url || '')}" data-dica="${esc(e.dica || '')}" aria-label="${t('Ver vídeo')}"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></button></div>`).join('')}</div>
  ${S.sessao ? `<button class="btn" data-go="sessao">▶ ${t('Continuar {x}', { x: esc(nomeTreino(S.sessao.titulo)) })} (${feitosCount(S.sessao)}/${S.sessao.exs.length})</button><button class="btn ghost" id="ini">${t('Começar o Treino {l} do zero', { l: esc(tr.letra) })}</button>` : `<button class="btn" id="ini">▶ ${t('Iniciar treino')}</button>`}<button class="btn ghost" id="pdf">📄 ${t('Baixar treino em PDF')}</button><p class="muted center small">${t('Esse treino fica salvo no celular e abre mesmo sem sinal. Vídeo e o 1º PDF precisam de internet. Toca no nome do exercício pra ver suas cargas.')}</p></div>`, 'treino');
  // Última carga de cada exercício: mostra o que tem no celular na hora e atualiza com o banco em segundo plano.
  const mostraUlt = (nome, u) => { const el = $$('.ult').find(x => x.dataset.n === nome); if (el && u?.kg) el.innerHTML = `${t('Última:')} <b>${dec(u.kg)} kg</b>${u.reps ? ' × ' + u.reps : ''}`; };
  const cache = db.LS.get('cargas', {}); tr.exercicios.forEach(e => mostraUlt(e.nome, cache[e.nome]));
  tr.exercicios.forEach(e => { if (!tempo(e.reps)) db.ultimaCarga(S.perfil.id, e.nome).then(u => mostraUlt(e.nome, u)).catch(() => {}); });
  $('#ini').onclick = () => { const b = $('#ini'); b.disabled = true; b.textContent = t('Abrindo…'); iniciarSessao({ titulo: `Treino ${tr.letra}`, treino_id: tr.id, exercicios: tr.exercicios, duracao_min: tr.duracao_min }).finally(() => { if (document.body.contains(b)) { b.disabled = false; b.textContent = '▶ ' + t('Iniciar treino'); } }); };
  $$('[data-hist]').forEach(b => b.onclick = () => abrirHistorico(b.dataset.hist));
  $('#pdf').onclick = async () => {
    const b = $('#pdf'); b.disabled = true; b.textContent = t('Gerando PDF...');
    try { const { gerarPdfTreino } = await import('./pdf.js'); await gerarPdfTreino(plano, S.perfil); }
    catch (e) { toast(navigator.onLine === false ? t('Sem internet pra gerar o PDF agora. Depois da 1ª vez ele funciona sem sinal.') : t(e.message || 'Não deu pra gerar o PDF'), true); }
    b.disabled = false; b.textContent = '📄 ' + t('Baixar treino em PDF');
  };
};

// TIRA-DÚVIDAS (IA do time) -----------------------------------------------------------
// Responde com o prompt do Igor + os dados da aluna (treino, cargas, anamnese). Quem conversa com a IA é o servidor.
document.addEventListener('click', e => { const d = e.target.closest('[data-duvida]'); if (!d) return; e.preventDefault(); go('assistente', JSON.stringify({ pergunta: t('Sobre o exercício {x}: ', { x: d.dataset.duvida }), contexto: `Ela está no meio do treino (${S.sessao?.titulo || ''}), no exercício ${d.dataset.duvida}.` })); });
const SUGESTOES = ['Como faço o búlgaro do jeito certo?', 'Quando eu subo a carga?', 'Senti dor no joelho, e agora?', 'Musculação ou cardio primeiro?', 'Não tô vendo resultado, o que pode ser?', 'Como funciona o bi-set?'];
// Respostas de erro do servidor (vêm em português): no idioma dela, pelo código do erro.
const ERROS_IA = { ia_desligada: 'O tira-dúvidas ainda tá sendo ligado pelo Igor. Enquanto isso, manda sua dúvida no recado do fim do treino ou no WhatsApp dele.', pausada: 'Seu acesso tá pausado. Fala com o Igor pra liberar.', ia_falhou: 'Não consegui responder agora. Tenta de novo em um minutinho.', limite: 'Você já usou as {n} perguntas de hoje. Amanhã libera de novo! Se for urgente, chama o Igor no WhatsApp.' };
routes.assistente = async (arg) => {
  const a = (() => { try { return JSON.parse(arg || '{}'); } catch { return {}; } })();
  render(`<div class="view fx chat"><div class="topbar"><button class="back" id="volta">‹ ${t('Voltar')}</button><span class="pill">${t('IA do time')}</span></div>
  <div><h2>${t('Tira-dúvidas')}</h2><p class="muted small">${t('Responde com base no seu treino e nas regras do Igor. Não substitui o Igor, médico nem nutricionista.')}</p></div>
  <div id="msgs" class="msgs"><p class="muted center small">${t('Carregando conversa…')}</p></div>
  <div class="chatbar"><textarea class="input" id="tx" rows="1" maxlength="1500" placeholder="${t('Escreve sua dúvida…')}">${esc(a.pergunta || '')}</textarea><button class="btn sm" id="env" style="width:auto;padding:0 18px" aria-label="${t('Enviar')}">➤</button></div>
  <a class="small center" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}" target="_blank" rel="noopener" style="color:var(--muted)">${t('Caso individual ou mudança no treino? Fala direto com o Igor')}</a></div>`, 'home');
  $('#volta').onclick = () => history.length > 1 ? history.back() : go('home');
  const box = $('#msgs');
  const bolha = (papel, texto) => `<div class="msg ${papel === 'user' ? 'eu' : 'ia'}">${esc(texto).replace(/\n/g, '<br>')}</div>`;
  const desce = () => { box.scrollTop = box.scrollHeight; window.scrollTo(0, document.body.scrollHeight); };
  let hist = [];
  try { hist = await db.assistente.historico(S.perfil.id); } catch {}
  if (rotaAtual !== 'assistente') return;
  box.innerHTML = hist.length ? hist.map(m => bolha(m.papel, m.texto)).join('')
    : `<div class="msg ia">${t('Oi, {nome}! Sou a assistente do time do Igor. Posso te explicar seu treino, execução, carga, descanso, cardio, sono... Manda a dúvida 💪', { nome: esc(primeiroNome(S.perfil.nome)) })}</div>`;
  if (!hist.length) box.insertAdjacentHTML('beforeend', `<div class="sug">${SUGESTOES.map(q => `<button class="pill" data-q="${esc(t(q))}">${esc(t(q))}</button>`).join('')}</div>`);
  desce();
  $$('.sug [data-q]').forEach(b => b.onclick = () => { $('#tx').value = b.dataset.q; enviar(); });
  const tx = $('#tx'); const ajusta = () => { tx.style.height = 'auto'; tx.style.height = Math.min(140, tx.scrollHeight) + 'px'; }; tx.oninput = ajusta; ajusta();
  if (a.pergunta) { tx.focus(); tx.setSelectionRange(tx.value.length, tx.value.length); }
  tx.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } };
  $('#env').onclick = enviar;
  let indo = false;
  async function enviar() {
    const texto = tx.value.trim(); if (!texto || indo) return;
    if (!navigator.onLine) return toast(t('Sem internet agora. Tenta de novo quando o sinal voltar.'), true);
    indo = true; $('#env').disabled = true; tx.value = ''; ajusta();
    $$('.sug').forEach(x => x.remove());
    box.insertAdjacentHTML('beforeend', bolha('user', texto) + '<div class="msg ia digitando" id="dig"><i></i><i></i><i></i></div>'); desce();
    let r;
    try { r = await db.assistente.perguntar(texto, a.contexto); } catch (er) { r = { resposta: t('Não consegui responder agora. Confere a internet e tenta de novo.'), erro: true }; }
    $('#dig')?.remove();
    if (r.erro && ERROS_IA[r.erro] && idioma() !== 'pt') r.resposta = t(ERROS_IA[r.erro], { n: (String(r.resposta || '').match(/\d+/) || [30])[0] });
    box.insertAdjacentHTML('beforeend', bolha('assistant', r.resposta || t('Não consegui responder agora.')));
    if (r.restantes != null && r.restantes <= 5) box.insertAdjacentHTML('beforeend', `<p class="muted center small">${tp(r.restantes, '{n} pergunta restante hoje', '{n} perguntas restantes hoje')}</p>`);
    a.contexto = null; desce(); indo = false; $('#env').disabled = false;
  }
};

// BIBLIOTECA DE VÍDEOS: todos os exercícios do treino do mês + programas extras, com busca ---------------
routes.videos = async () => {
  const [plano, programas] = await Promise.all([S.plano || rapido(db.planoAtual(S.perfil.id), db.LS.get('plano')), S.programas || rapido(db.programas(), db.LS.get('programas', []))]);
  const mapa = new Map();
  const add = (e, onde) => { if (!e?.nome || /hiit|cardio/i.test(e.nome)) return; const k = e.nome.trim().toLowerCase(); const a = mapa.get(k) || { nome: e.nome, video_url: null, dica: null, onde: new Set() }; a.video_url = a.video_url || e.video_url || null; a.dica = a.dica || e.dica || null; a.onde.add(onde); mapa.set(k, a); };
  (plano?.treinos || []).forEach(t => t.exercicios.forEach(e => { add(e, T('Treino {l}', { l: t.letra }) + ' · ' + t.nome); if (e.alternativa) add({ nome: e.alternativa }, T('troca do {x}', { x: e.nome })); }));
  (programas || []).forEach(pr => (pr.programa_treinos || []).forEach(t => (t.exercicios || []).forEach(e => add(e, pr.titulo))));
  const lista = [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const comVideo = lista.filter(x => x.video_url).length;
  render(`<div class="view fx"><div class="topbar"><h2>${t('Vídeos')}</h2><span class="pill">${tp(lista.length, '{n} exercício', '{n} exercícios')}</span></div>
  <p class="muted">${t('Como fazer cada exercício, com o Igor. Dá pra assistir antes de ir pra academia.')}${!comVideo ? ' ' + t('Os vídeos estão sendo gravados e vão aparecendo aqui.') : comVideo < lista.length ? ' ' + t('<b style="color:var(--fg)">{n} já gravados</b>, o resto chegando.', { n: comVideo }) : ''}</p>
  <input class="input" id="busca" type="search" placeholder="${t('Buscar: búlgaro, glúteo, costas...')}" autocomplete="off">
  <div id="lv"></div></div>`, 'videos');
  const norm = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const desenha = (q = '') => {
    const f = lista.filter(x => norm(x.nome + ' ' + [...x.onde].join(' ')).includes(norm(q))); // acha também por treino/grupo (ex.: glúteo)
    $('#lv').innerHTML = f.length ? f.map(x => `<button class="ex vid" data-vid="${esc(x.nome)}" data-url="${esc(x.video_url || '')}" data-dica="${esc(x.dica || '')}" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);color:var(--fg);text-align:left"><div class="play" style="flex-shrink:0;${x.video_url ? '' : 'background:#2a2a2e;color:var(--muted)'}"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></div><div class="t"><b>${esc(x.nome)}</b><span>${esc([...x.onde].join(' · '))}${x.video_url ? '' : ` · <i style="color:var(--accent)">${t('em gravação')}</i>`}</span></div></button>`).join('')
      : `<div class="card" style="margin-top:8px"><p class="muted">${t('Não achei "{q}". Tenta outro nome ou chama o Igor no WhatsApp.', { q: esc(q) })}</p></div>`;
  };
  desenha(); $('#busca').oninput = e => desenha(e.target.value);
};

// PROGRAMAS EXTRAS -------------------------------------------------------------
routes.lib = async () => {
  const programas = S.programas || await rapido(db.programas(), db.LS.get('programas', []));
  render(`<div class="view fx"><div class="topbar"><h2>${t('Programas extras')}</h2></div><p class="muted">${t('Liberado pra todas as alunas, além do seu treino.')}</p>
  <div class="grid2">${programas.map(pr => `<button class="lib" data-go="programa" data-arg="${pr.slug}" style="background-image:url(${esc(pr.capa_url)})"><b>${esc(pr.titulo)}</b><span>${esc(subProg(pr))}</span></button>`).join('')}</div></div>`, 'home');
};
routes.programa = async (slug) => {
  const programas = S.programas || await rapido(db.programas(), db.LS.get('programas', [])); const pr = programas.find(p => p.slug === slug); if (!pr) return go('lib');
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="lib">‹ ${t('Programas')}</button></div>
  <div class="lib" style="aspect-ratio:16/9;background-image:url(${esc(pr.capa_url)})"><b style="font-size:26px">${esc(pr.titulo)}</b><span>${esc(subProg(pr))}</span></div>
  ${pr.programa_treinos?.length ? pr.programa_treinos.map(t => `<div class="card row between"><div><b>${esc(t.nome)}</b><p class="muted">${tp((t.exercicios || []).length, '{n} exercício', '{n} exercícios')} · ${T('{n} min', { n: t.duracao_min || 20 })}</p></div><button class="btn sm" data-pt="${t.id}">${T('Iniciar')}</button></div>`).join('') : `<div class="card"><b>${T('Em breve')}</b><p class="muted">${T('O Igor ainda tá montando esse programa. Enquanto isso, os outros já estão liberados.')}</p></div>`}</div>`, 'home');
  $$('[data-pt]').forEach(b => b.onclick = () => { const t = pr.programa_treinos.find(x => x.id === b.dataset.pt); b.disabled = true; iniciarSessao({ titulo: `${pr.titulo} · ${t.nome}`, programa_treino_id: t.id, exercicios: (t.exercicios || []).map((e, i) => ({ ordem: i + 1, series: 3, reps: '12', descanso_s: 45, ...(/casa|mobilidade|abd/i.test(pr.slug) ? { carga: false } : {}), ...e })), duracao_min: t.duracao_min }).finally(() => { b.disabled = false; }); });
};

// SESSÃO -------------------------------------------------------------------------
// Tudo da sessão fica salvo no celular a cada toque: se o app fechar, ela continua de onde parou.
const tempo = r => { const m = String(r || '').match(/(\d+(?:[.,]\d+)?)\s*(s|seg|min)\b/i); return m ? Math.round(parseFloat(m[1].replace(',', '.')) * (/min/i.test(m[2]) ? 60 : 1)) : 0; };
const repsAlvo = (r, k) => { const p = String(r || '').split('/'); const v = parseInt(p.length > 1 ? (p[k] ?? p[p.length - 1]) : r); return isNaN(v) ? '' : v; };
const porLado = r => /cada/i.test(String(r || ''));
const piramide = r => /\d\s*\/\s*\d/.test(String(r || ''));
// Exercício sem peso (peso do corpo, elástico, mobilidade): esconde a coluna de kg
const semCarga = e => e.carga === false || /prancha|dead ?bug|gato|abdominal|abs |mini ?band|alongamento|mobilidade|cossaco|polichinelo|burpee|90\/90|ponte/i.test(e.nome);
// Tradução das reps pra quem tá começando
function explicaReps(r) {
  r = String(r || '');
  if (piramide(r)) { const p = r.split('/').map(x => x.trim()); return t('{p}: uma em cada série. Sobe um pouco o peso a cada série.', { p: p.join(', ') }); }
  if (/\+\s*\(?\d/.test(r) && !/parciais/i.test(r)) return t('Faz as reps, tira um pouco de peso e já emenda as próximas, sem descansar.');
  if (/parciais/i.test(r)) return t('Parciais: no fim da série, faz meias repetições na parte de baixo, alongando.');
  if (/^\s*\d+\s*-\s*\d+/.test(r)) { const [x, y] = r.match(/\d+/g); return t('Entre {x} e {y} repetições. Chegou fácil no {y}? Sobe o peso.', { x, y }); }
  return '';
}
const salvaSessao = () => { if (S.sessao) { S.sessao.ult = Date.now(); db.LS.set('sessao', S.sessao); } };
// Saiu da tela do treino (pausar, aba, voltar): o relógio do treino para e o descanso é encerrado.
function sairDaSessao() {
  clearInterval(clockIv); soltarTela(); pararDescanso();
  if (S.sessao && !S.sessao.pausadoEm) { S.sessao.pausadoEm = Date.now(); S.sessao.descansoAte = null; salvaSessao(); }
}
// Agrupa bi-sets (exercícios seguidos marcados um com o outro) num passo só.
function montarPassos(exs) {
  const passos = [];
  for (let i = 0; i < exs.length; i++) {
    const a = exs[i], b = exs[i + 1];
    if (b && (a.biset_com === b.ordem || b.biset_com === a.ordem)) { passos.push([i, i + 1]); i++; } else passos.push([i]);
  }
  return passos;
}
let iniciando = false;
// Abre o treino na hora com o que está no celular; o banco é avisado em segundo plano (4G ruim não trava nem duplica).
async function iniciarSessao({ titulo, treino_id = null, programa_treino_id = null, exercicios, duracao_min }) {
  if (iniciando) return; iniciando = true;
  try {
    if (S.sessao && !(await perguntar('Treino em andamento', `Você tem o ${S.sessao.titulo} pela metade. Quer descartar ele e começar este?`, 'Começar este', 'Voltar pro outro'))) return go('sessao');
    pararDescanso();
    const cargas = db.LS.get('cargas', {});
    const exs = structuredClone(exercicios).sort((a, b) => a.ordem - b.ordem).map(e => ({ ...e, original: e.nome, ultima: cargas[e.nome] || null }));
    const chave = 'local-' + Date.now();
    S.sessao = { id: chave, chave, local: true, titulo, treino_id, programa_treino_id, exs, passos: montarPassos(exs), p: 0, feito: {}, sets: {}, inicio: Date.now() };
    exs.forEach((e, i) => { S.sessao.sets[i] = Array.from({ length: e.series || 1 }, () => ({ kg: '', reps: '', done: false })); });
    salvaSessao(); go('sessao');
    db.iniciarSessao(S.perfil.id, { treino_id, programa_treino_id, titulo, total: exs.length }).then(sess => { const s = S.sessao; if (sess?.id && s?.chave === chave && !s.enviada) { s.id = sess.id; s.local = false; salvaSessao(); } }).catch(() => {});
    exs.forEach((e, i) => { if (piramide(e.reps)) rapido(db.ultimasSeries(S.perfil.id, e.nome), null, 8000).then(ps => { const s = S.sessao; if (ps && s?.chave === chave && s.exs[i].nome === e.nome) { s.exs[i].porSerie = ps; salvaSessao(); if (rotaAtual === 'sessao' && !document.activeElement?.matches('input')) routes.sessao(); } }); });
    Promise.all(exs.map(e => tempo(e.reps) ? null : rapido(db.ultimaCarga(S.perfil.id, e.nome), null, 8000))).then(us => {
      const s = S.sessao; if (s?.chave !== chave) return;
      let mudou = false; us.forEach((u, i) => { if (u && s.exs[i].nome === exs[i].nome && JSON.stringify(u) !== JSON.stringify(s.exs[i].ultima)) { s.exs[i].ultima = u; mudou = true; } });
      if (mudou) { salvaSessao(); if (rotaAtual === 'sessao' && !document.activeElement?.matches('input')) routes.sessao(); }
    });
  } finally { iniciando = false; }
}
let clockIv, wake;
async function manterTelaAcesa() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch {} }
function soltarTela() { try { wake?.release(); } catch {} wake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.sessao && rotaAtual === 'sessao') manterTelaAcesa(); });
// Exercício conta como feito se tiver pelo menos 1 série marcada.
const feitosCount = s => s.exs.filter((e, i) => s.sets[i]?.some(x => x.done)).length;
// Ordem das séries no passo: no bi-set alterna A1, A2, A1, A2...
function filaDoPasso(s, passo) {
  const max = Math.max(...passo.map(i => s.sets[i].length)), fila = [];
  for (let k = 0; k < max; k++) passo.forEach(i => { if (k < s.sets[i].length) fila.push([i, k]); });
  return fila;
}
// Descanso guardado na sessão: recarregou/voltou no meio, o tempo continua de onde estava.
async function descanso(seg, txt) {
  const s = S.sessao; if (!s) return;
  s.descansoAte = Date.now() + seg * 1000; s.descansoTxt = txt; salvaSessao();
  const r = await restTimer(seg, txt, 'Descanso', { aoMudar: fim => { if (S.sessao === s) { s.descansoAte = fim; salvaSessao(); } } });
  if (S.sessao === s && !descansoAtivo()) { s.descansoAte = null; salvaSessao(); }
  return r;
}
function marcarFeita(s, i, k) { const st = s.sets[i][k], e = s.exs[i]; st.done = true; st.nome = e.nome; st.eid = e.nome === e.original ? (e.id || null) : null; }
routes.sessao = () => {
  const s = S.sessao; if (!s) return go('home');
  if (s.pausadoEm) { s.inicio += Date.now() - s.pausadoEm; s.pausadoEm = null; } // pausa não conta no tempo
  s.fimEm = null;
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
      if (t) return `<button class="rest tm" data-i="${i}" data-k="${k}">${st.done ? '✓ ' + T('feito') : lado ? `▶ 2×${fmtMin(t)}` : `▶ ${fmtMin(t)}`}</button>`;
      if (bi && !ultimoDoPar) return `<button class="rest" data-i="${i}" data-k="${k}" aria-label="${T('Série feita, vai pro A2')}">${st.done ? '✓' : '✓ → A2'}</button>`;
      return `<button class="rest" data-i="${i}" data-k="${k}" aria-label="${T('Série feita, iniciar descanso')}">${st.done ? '✓' : e.descanso_s ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>${e.descanso_s}s` : '✓'}</button>`;
    };
    const phKg = k => pir ? (e.porSerie?.[k + 1] != null ? dec(e.porSerie[k + 1]) : 'kg') : (e.ultima?.kg != null ? dec(e.ultima.kg) : 'kg'); // pirâmide: a carga daquela série da última vez
    return `<div class="bloco" data-i="${i}">
      <div class="row between" style="align-items:flex-start;gap:8px"><div style="min-width:0">${bi ? `<span class="tag">${n === 0 ? 'A1' : 'A2'}</span>` : ''}<h1 style="font-size:${bi ? 26 : 32}px">${esc(e.nome)}</h1></div></div>
      <p class="muted">${e.series > 1 ? T('{n} séries ×', { n: e.series }) + ' ' : ''}${esc(e.reps)}${!bi && e.descanso_s ? ' · ' + T('descanso {n}s', { n: e.descanso_s }) : ''}</p>
      ${ex ? `<p class="muted small">${esc(ex)}</p>` : ''}
      ${t && lado ? `<p class="muted small">${T('Eu apito na metade pra você trocar de lado.')}</p>` : ''}
      ${e.dica ? `<p class="dica">${esc(e.dica)}</p>` : ''}
      <div class="row" style="margin:8px 0;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" style="width:auto" data-vid="${esc(e.nome)}" data-url="${esc(e.video_url || '')}" data-dica="${esc(e.dica || '')}">▶ ${T('Ver execução')}</button><button class="btn ghost sm" style="width:auto" data-duvida="${esc(e.nome)}">? ${T('Dúvida')}</button>${e.alternativa ? `<button class="btn ghost sm swap" style="width:auto" data-i="${i}">⇄ ${T('Trocar por {x}', { x: esc(e.alternativa) })}</button>` : e.nome !== e.original ? `<button class="btn ghost sm swap" style="width:auto" data-i="${i}">↺ ${T('Voltar pro {x}', { x: esc(e.original) })}</button>` : ''}</div>
      ${t ? '' : `<div class="set ${sc ? 'sc' : ''}"><span class="h">${T('Série')}</span>${sc ? '' : '<span class="h">kg</span>'}<span class="h">${lado ? T('reps/lado') : T('reps')}</span><span class="h c">${ultimoDoPar && e.descanso_s ? T('descanso') : T('feito')}</span></div>`}
      ${sets.map((st, k) => t
        ? `<div class="set tset ${st.done ? 'done' : ''}" data-i="${i}" data-k="${k}"><span>${k + 1}</span><span class="muted">${esc(e.reps)}</span>${botao(k)}</div>`
        : `<div class="set ${sc ? 'sc' : ''} ${st.done ? 'done' : ''}" data-i="${i}" data-k="${k}"><span>${k + 1}</span>${sc ? '' : `<input inputmode="decimal" value="${esc(st.kg)}" data-f="kg" placeholder="${phKg(k)}" aria-label="${T('kg da série {n}', { n: k + 1 })}">`}<input inputmode="numeric" value="${esc(st.reps)}" data-f="reps" placeholder="${repsAlvo(e.reps, k) || T('reps')}" aria-label="${T('reps da série {n}', { n: k + 1 })}">${botao(k)}</div>`).join('')}
      ${!t && !sc && e.ultima?.kg != null ? `<div class="row between mt" style="gap:8px"><p class="muted small" style="flex:1">${pir ? T('Última vez (série mais pesada):') : T('Última vez:')} <b style="color:var(--fg)">${dec(e.ultima.kg)} kg × ${e.ultima.reps ?? '–'}</b>.${pir ? '' : ' ' + T('Fácil? Sobe a carga.')}</p><button class="btn ghost sm hist" data-i="${i}">${T('histórico')}</button></div>` : ''}
    </div>`;
  };
  const hint = t(bi ? 'Bi-set: faz uma série do <b>A1</b> e emenda direto no <b>A2</b>. Descansa só depois do A2.'
    : tempo(s.exs[passo[0]].reps) ? 'Exercício de tempo: toca no <b>▶</b> que eu conto pra você.'
    : s.exs[passo[0]].descanso_s ? 'Terminou a série? <b>Toca no ⏱</b> pra começar o descanso.' : 'Terminou a série? <b>Toca no ✓</b> pra marcar.');
  const ok = passo.every(i => s.feito[i]);
  render(`<div class="view fx sessao"><div class="topbar"><button class="back" id="sair">‹ ${t('Pausar')}</button><span class="pill" id="clock">${fmtMin(Math.floor((Date.now() - s.inicio) / 1000))}</span></div>
  <div class="row between"><span class="muted">${bi ? t('Bi-set') : esc(nomeTreino(s.titulo))}</span><span class="muted">${t('{a} de {b} exercícios feitos', { a: feitosCount(s), b: s.exs.length })}</span></div>
  <div class="bar"><i style="width:${s.p / s.passos.length * 100}%"></i></div>
  <p class="restHint">${hint}</p>
  ${passo.map(bloco).join('<div class="sep"></div>')}
  <div class="card row between" style="margin-top:6px"><div><b style="font-size:15px">${bi ? t('Bi-set concluído?') : t('Exercício concluído?')}</b><p class="muted">${t('Marca que eu já puxo o próximo.')}</p></div><button class="sw ${ok ? 'on' : ''}" id="sw" aria-label="${t('Concluir')}"></button></div>
  <div class="row" style="gap:8px">${s.p > 0 ? `<button class="btn ghost sm" id="prev" style="flex:1">‹ ${t('Anterior')}</button>` : ''}${s.p < s.passos.length - 1 ? `<button class="btn ghost sm" id="pular" style="flex:1">${t('Pular')} ›</button>` : ''}</div>
  <button class="link-fim" id="fim">${t('Encerrar treino')}</button></div>`);
  if (prox) { const b = $(`.set[data-i="${prox[0]}"][data-k="${prox[1]}"] .rest`); if (b) b.classList.add('next'); }
  clearInterval(clockIv); clockIv = setInterval(() => { const c = $('#clock'); if (c) c.textContent = fmtMin(Math.floor((Date.now() - s.inicio) / 1000)); }, 1000);
  // Recarregou ou voltou com o descanso rodando: ele reaparece minimizado com o tempo que falta
  if (s.descansoAte && !descansoAtivo()) { const l = Math.ceil((s.descansoAte - Date.now()) / 1000); if (l > 0) { descanso(l, s.descansoTxt); minimizarDescanso(); } else { s.descansoAte = null; salvaSessao(); } }
  $$('.set input').forEach(inp => inp.oninput = () => {
    const i = +inp.closest('.set').dataset.i, k = +inp.closest('.set').dataset.k, f = inp.dataset.f;
    s.sets[i][k][f] = inp.value;
    // carga digitada vale pras próximas séries ainda vazias (menos na pirâmide, que sobe a cada série)
    if (f === 'kg' && !piramide(s.exs[i].reps)) s.sets[i].forEach((st, j) => { if (j > k && !st.done && !st.kgMan) { st.kg = inp.value; const x = $(`.set[data-i="${i}"][data-k="${j}"] input[data-f="kg"]`); if (x) x.value = inp.value; } });
    if (f === 'kg') s.sets[i][k].kgMan = true;
    salvaSessao();
  });
  $$('.rest').forEach(b => b.onclick = async () => {
    const i = +b.dataset.i, k = +b.dataset.k, e = s.exs[i], st = s.sets[i][k];
    if (st.done) { st.done = false; salvaSessao(); return routes.sessao(); } // toque de novo desfaz
    const t = tempo(e.reps);
    if (t) { const fim = await restTimer(porLado(e.reps) ? t * 2 : t, `${e.nome} · ${T('série {n}', { n: k + 1 })}`, 'Bora!', { meio: porLado(e.reps) }); if (fim !== true || S.sessao !== s) return; }
    marcarFeita(s, i, k); salvaSessao();
    const pos = fila.findIndex(([a, c]) => a === i && c === k), seguinte = fila.slice(pos + 1).find(([a, c]) => !s.sets[a][c].done);
    const ultimoDoPar = !bi || passo.indexOf(i) === passo.length - 1;
    if (!seguinte && passo.every(x => s.sets[x].every(z => z.done))) {
      routes.sessao();
      return setTimeout(() => { if (S.sessao !== s || rotaAtual !== 'sessao') return; const prx = s.passos[s.p + 1]; concluirPasso(); if (prx && e.descanso_s && !t && S.sessao === s && rotaAtual === 'sessao') descanso(e.descanso_s, T('Próximo: {x}', { x: s.exs[prx[0]].nome })); }, 450);
    }
    routes.sessao();
    if (ultimoDoPar && e.descanso_s && !t) {
      const txt = seguinte ? T('Próxima: {x} · série {n}', { x: s.exs[seguinte[0]].nome, n: seguinte[1] + 1 }) : (s.passos[s.p + 1] ? T('Próximo: {x}', { x: s.exs[s.passos[s.p + 1][0]].nome }) : T('Última série!'));
      await descanso(e.descanso_s, txt);
    }
  });
  $$('.hist').forEach(a => a.onclick = ev => { ev.preventDefault(); abrirHistorico(s.exs[+a.dataset.i].nome); });
  $$('.swap').forEach(b => b.onclick = async () => {
    const i = +b.dataset.i, e = s.exs[i];
    if (e.alternativa) { e.trocadoDe = e.nome; e.nome = e.alternativa; e.alternativa = null; }
    else { e.alternativa = e.nome; e.nome = e.original; }
    e.ultima = db.LS.get('cargas', {})[e.nome] || null; e.porSerie = null;
    s.sets[i].forEach(st => { if (!st.done) { st.kg = ''; st.kgMan = false; } });
    salvaSessao(); toast(e.nome === e.original ? t('Voltou pro original') : t('Trocado por {x} (só hoje)', { x: e.nome })); routes.sessao();
    const nome = e.nome; rapido(db.ultimaCarga(S.perfil.id, nome), null, 6000).then(u => { if (u && S.sessao === s && e.nome === nome) { e.ultima = u; salvaSessao(); if (rotaAtual === 'sessao' && !document.activeElement?.matches('input')) routes.sessao(); } });
  });
  $('#sw').onclick = async function () {
    if (passo.every(i => s.feito[i])) { passo.forEach(i => delete s.feito[i]); salvaSessao(); return routes.sessao(); }
    // Ligou a chave sem marcar nenhuma série: pergunta em vez de contar um exercício que não foi feito
    if (!passo.some(i => s.sets[i].some(x => x.done))) {
      const fez = await perguntar(t('Nenhuma série marcada'), t('Você fez esse exercício e só esqueceu de marcar?'), t('Fiz, marcar as séries'), t('Não fiz, pular'));
      if (S.sessao !== s) return;
      if (fez) passo.forEach(i => s.sets[i].forEach((_, k) => marcarFeita(s, i, k)));
      else { s.p++; salvaSessao(); if (s.p >= s.passos.length) { s.p--; return confirmarFim(); } routes.sessao(); return window.scrollTo(0, 0); }
    }
    this.classList.add('on'); setTimeout(concluirPasso, 300);
  };
  if ($('#prev')) $('#prev').onclick = () => { s.p--; salvaSessao(); routes.sessao(); window.scrollTo(0, 0); };
  if ($('#pular')) $('#pular').onclick = () => { s.p++; salvaSessao(); routes.sessao(); window.scrollTo(0, 0); };
  $('#fim').onclick = confirmarFim;
  $('#sair').onclick = () => { toast(t('Treino pausado. O relógio parou, continua quando quiser.')); go('home'); };
};
// Histórico de carga de um exercício (no treino, na lista do treino e em Evolução > Minhas cargas)
async function abrirHistorico(nome) {
  overlay(`<div class="modal" id="hm"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:8px"><h2>${esc(nome)}</h2><p class="muted">${t('Sua carga mais pesada em cada treino, de qualquer mês.')}</p><div id="hl"><p class="muted">${t('Carregando…')}</p></div><button class="btn ghost sm" id="hc" style="margin-top:6px">${t('Fechar')}</button></div></div>`);
  $('#hc').onclick = closeOverlay; $('#hm').addEventListener('click', x => { if (x.target.id === 'hm') closeOverlay(); });
  const c = db.LS.get('cargas', {})[nome];
  const h = await rapido(db.historicoCarga(S.perfil.id, nome, 8), c ? [c] : []);
  const hl = $('#hl'); if (!hl) return;
  hl.innerHTML = h.length ? h.map(x => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="muted">${fmtData(x.data)}</span><b>${dec(x.kg)} kg × ${x.reps ?? '–'}</b></div>`).join('') : `<p class="muted">${t('Ainda sem registro. Anota o kg no treino que aparece aqui.')}</p>`;
}
function concluirPasso() {
  const s = S.sessao; if (!s) return; const passo = s.passos[s.p]; if (!passo) return go('fim');
  passo.forEach(i => { s.feito[i] = true; const ok = s.sets[i].filter(x => x.done && x.kg !== ''); if (ok.length) db.guardarCarga(ok[ok.length - 1].nome || s.exs[i].nome, +String(ok[ok.length - 1].kg).replace(',', '.'), +ok[ok.length - 1].reps || null); });
  s.p++; salvaSessao();
  if (s.p >= s.passos.length) return go('fim');
  toast(`${passo.map(i => s.exs[i].nome).join(' + ')} ✓`); routes.sessao(); window.scrollTo(0, 0);
}
function confirmarFim() {
  const s = S.sessao, n = feitosCount(s);
  const falta = s.exs.filter((e, i) => !/opcional/i.test(e.nome) && !s.sets[i].some(x => x.done)).length; // opcional não conta como faltando
  if (!falta) return go('fim');
  overlay(`<div class="modal" id="m"><div class="box" style="padding:18px;display:flex;flex-direction:column;gap:12px"><h2>${n ? tp(falta, 'Falta {n} exercício', 'Faltam {n} exercícios') : t('Nenhuma série marcada')}</h2>
    <p class="muted">${n ? t('Quer encerrar assim mesmo? O que você fez fica registrado.') : t('Se encerrar agora, esse treino não conta. Quer continuar?')}</p>
    <button class="btn sm" id="volta">${t('Continuar treino')}</button><button class="btn ghost sm" id="enc">${n ? t('Encerrar e registrar') : t('Descartar treino')}</button></div></div>`);
  $('#volta').onclick = closeOverlay;
  $('#enc').onclick = () => { closeOverlay(); if (n) go('fim'); else { sairDaSessao(); S.sessao = null; db.LS.del('sessao'); toast(t('Treino descartado')); go('home'); } };
}
function seriesDaSessao(s) {
  const rows = [];
  // Cada série vai com o nome do exercício que ela fez de verdade (trocou no meio? cada uma no seu)
  s.exs.forEach((e, i) => s.sets[i].forEach((st, k) => { if (!st.done) return; const nome = st.nome || e.nome; const kg = st.kg !== '' ? st.kg : (!piramide(e.reps) && nome === e.nome ? (e.ultima?.kg ?? '') : ''); rows.push({ exercicio_id: st.nome ? st.eid : (e.nome === e.original ? (e.id || null) : null), exercicio_nome: nome, n: k + 1, kg: kg === '' || semCarga(e) ? null : +String(kg).replace(',', '.'), reps: st.reps !== '' ? +st.reps : (repsAlvo(e.reps, k) || null), feita: true }); }));
  return rows;
}
const novaFila = item => { const f = db.LS.get('fila', []); f.push({ uid: Date.now() + '-' + Math.random().toString(36).slice(2, 7), ...item }); db.LS.set('fila', f); };
// Feedback do fim: é uma tela com rota (voltar funciona) e o que ela escreve fica salvo.
routes.fim = () => {
  clearInterval(clockIv); soltarTela(); pararDescanso(); const s = S.sessao; if (!s) return go('home');
  if (s.pausadoEm) { s.inicio += Date.now() - s.pausadoEm; s.pausadoEm = null; }
  if (!s.fimEm) s.fimEm = Date.now();
  s.fb = s.fb || {}; s.descansoAte = null; salvaSessao();
  const dur = Math.max(0, Math.floor((s.fimEm - s.inicio) / 1000)), n = feitosCount(s);
  const escala = (id, a, b) => `<div class="scale" id="${id}">${Array.from({ length: 11 }, (_, i) => `<button type="button" class="${s.fb[id] === i ? 'on' : ''}">${i}</button>`).join('')}</div><div class="row between muted small" style="margin-top:4px"><span>${a}</span><span>${b}</span></div>`;
  render(`<div class="view noTabs fx" style="padding-top:16px"><button class="back" id="volta" style="align-self:flex-start">‹ ${t('Voltar pro treino')}</button>
  <div><p class="muted">${esc(nomeTreino(s.titulo))} · ${fmtMin(dur)} · ${t('{a} de {b}', { a: n, b: s.exs.length })}</p><h1>${n === s.exs.length ? t('Mandou bem!') : t('Boa, registrado!')}</h1></div>
  <div><label class="l">${t('Quanto esforço foi?')}</label>${escala('esf', t('0 · muito leve'), t('10 · no limite'))}</div>
  <div><label class="l">${t('Que nota você dá pro treino?')}</label>${escala('nota', t('0 · não curti'), t('10 · amei'))}</div>
  <div class="field"><label class="l" for="fb">${t('Quer falar algo pro Igor? (opcional)')}</label><textarea class="input" id="fb" placeholder="${t('Senti a lombar no búlgaro... / Tá leve, pode subir carga...')}">${esc(s.fb.txt || '')}</textarea></div>
  <p class="err" id="e" hidden>${t('Marca o esforço e a nota, é rapidinho.')}</p>
  <button class="btn" id="env">${t('Enviar e gerar meu card')}</button><p class="muted center small">${t('O Igor vê isso no painel dele e te responde aqui no app.')}</p></div>`);
  $$('.scale').forEach(sc => sc.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; $$('button', sc).forEach(x => x.classList.remove('on')); b.classList.add('on'); s.fb[sc.id] = +b.textContent; salvaSessao(); if ($('#esf .on') && $('#nota .on')) $('#e').hidden = true; });
  $('#fb').oninput = () => { s.fb.txt = $('#fb').value; salvaSessao(); };
  $('#volta').onclick = () => go('sessao');
  $('#env').onclick = async () => {
    if (!$('#esf .on') || !$('#nota .on')) { $('#e').hidden = false; return; }
    $('#env').disabled = true; $('#env').textContent = t('Enviando…');
    s.enviada = true; salvaSessao();
    const patch = { duracao_s: dur, exercicios_feitos: n, esforco: +$('#esf .on').textContent, nota: +$('#nota .on').textContent, comentario: $('#fb').value.trim() || null, finalizada_em: new Date(s.fimEm).toISOString() };
    const series = seriesDaSessao(s); let pontos = true, seriesOk = false;
    const item = () => ({ s: { titulo: s.titulo, treino_id: s.treino_id, programa_treino_id: s.programa_treino_id || null, total: s.exs.length }, sid: s.local ? null : s.id, seriesOk, series, patch });
    try {
      if (s.local) { novaFila(item()); pontos = false; }
      else { await comLimite(db.salvarSeries(s.id, series), 12000); seriesOk = true; await comLimite(db.finalizarSessao(s.id, patch), 12000); }
    } catch (er) { pontos = false; novaFila(item()); }
    if (!pontos) toast(t('Sem internet agora, mas tá guardado no celular. Envio sozinha quando o sinal voltar.'));
    S.sessao = null; db.LS.del('sessao'); S.sessoes = null;
    go('card', JSON.stringify({ titulo: s.titulo, min: Math.max(1, Math.round(dur / 60)), ex: n, pontos }));
  };
};
// Envia o que ficou guardado sem sinal. Uma de cada vez, sem duplicar: cada item sai da fila assim que sobe,
// e a sessão já criada no banco é reaproveitada (não cria outra).
let sincronizando = false;
async function sincronizarFila() {
  if (sincronizando || !S.perfil || S.perfil.role === 'admin') return; sincronizando = true; let enviados = 0;
  const atualiza = (uid, patch) => db.LS.set('fila', db.LS.get('fila', []).map(x => x.uid === uid ? { ...x, ...patch } : x));
  try {
    for (;;) {
      const fila = db.LS.get('fila', []); const it = fila[0]; if (!it) break;
      if (!it.uid) { it.uid = 'u' + Date.now(); db.LS.set('fila', fila); }
      try {
        if (it.tipo === 'pontos') await db.registrarPontos(S.perfil.id, it.motivo, it.pontos, it.ref);
        else {
          let sid = it.sid;
          if (!sid) { const sess = await db.iniciarSessao(S.perfil.id, { treino_id: it.s.treino_id || null, programa_treino_id: it.s.programa_treino_id || null, titulo: it.s.titulo, total: it.s.total || 0 }); sid = sess.id; atualiza(it.uid, { sid }); }
          if (!it.seriesOk) { await db.salvarSeries(sid, it.series || it.s.series || []); atualiza(it.uid, { seriesOk: true }); }
          await db.finalizarSessao(sid, it.patch); enviados++;
        }
        db.LS.set('fila', db.LS.get('fila', []).filter(x => x.uid !== it.uid));
      } catch { break; }
    }
  } finally { sincronizando = false; }
  if (enviados) { toast(t('Treino feito sem sinal foi enviado ✓')); if (rotaAtual === 'home') routes.home(); }
}

// CARD -------------------------------------------------------------------------
routes.card = async (arg) => {
  const d = JSON.parse(arg || '{}'); const sessoes = await sessoesComFila(S.perfil); const st = streakDias(sessoes);
  const data = dataLocal(Date.now(), { day: 'numeric', month: 'short' });
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="home">‹ ${t('Início')}</button>${d.pontos === false ? `<span class="pill quebra">${t('pontos quando a internet voltar')}</span>` : `<span class="pill on">${t('+{n} pts', { n: 50 })}</span>`}</div>
  <div class="share"><div class="row between"><div class="logo sm">IGOR SOUSA <b>TEAM</b></div><span class="pill">${data}</span></div>
    <div><div class="logo" style="font-size:40px">${t('Treino<br>feito')} <b>✓</b></div><div class="row wrap" style="gap:6px 18px;margin-top:14px"><div class="big" style="font-size:30px">${d.min}<small>${t('min')}</small></div><div class="big" style="font-size:30px">${d.ex}<small>${t('exerc.')}</small></div><div class="big" style="font-size:30px;color:var(--accent)">🔥${st.semanas}<small>${t('sem. seguidas')}</small></div></div>
    <p class="muted mt small">${esc(primeiroNome(S.perfil.nome))} · ${esc(nomeTreino(d.titulo))} · ${esc(C.INSTAGRAM)}</p></div></div>
  <div class="row"><button class="btn sm" style="flex:1" id="share">${t('Postar no story')}</button><button class="btn ghost sm" style="flex:1" data-go="evolucao">${t('Minha evolução')}</button></div>
  <p class="muted center small">${t('Cada story é um convite pra sua amiga entrar no time.')}</p></div>`, 'home');
  $('#share').onclick = async () => {
    const r = await cardImagem({ nome: primeiroNome(S.perfil.nome), titulo: nomeTreino(d.titulo), minutos: d.min, exercicios: d.ex, streak: st.semanas, data, insta: C.INSTAGRAM }); if (r === 'cancel') return;
    const ref = new Date().toISOString().slice(0, 10), onde = r === 'download' ? t('Imagem salva no celular (Downloads/Galeria): abre o Instagram e escolhe ela.') + ' ' : t('Card pronto!') + ' ';
    let ok; try { ok = await comLimite(db.registrarPontos(S.perfil.id, 'story', 30, ref), 8000); } catch { ok = null; }
    if (ok === null) { novaFila({ tipo: 'pontos', motivo: 'story', pontos: 30, ref }); toast(onde + t('Os +30 pts entram quando a internet voltar.')); }
    else toast(onde + (ok ? t('+{n} pts', { n: 30 }) : t('(os pontos do story de hoje já foram contados)')));
  };
};

// PONTOS --------------------------------------------------------------------------
routes.pontos = async () => {
  const p = (await rapido(db.perfil(), null)) || S.perfil; S.perfil = p; const log = await rapido(db.meusPontos(p.id), []);
  if (rotaAtual !== 'pontos') return;
  const nomes = { treino: 'Treino concluído', semana: 'Semana completa', desafio: 'Desafio do mês', story: 'Card no story', checkin: 'Check-in com foto', evolucao: 'Foto de evolução', indicacao: 'Amiga indicada', renovacao: 'Mês renovado' };
  render(`<div class="view fx"><div class="topbar"><h2>${t('Meus pontos')}</h2><span class="pill on">${t('{n} pts', { n: num(p.pontos) })}</span></div>
  <div class="card"><h3>${t('Como ganhar')}</h3><div style="display:grid;gap:8px;margin-top:8px;font-size:14px">
    ${[['Treino concluído', 50], ['Semana completa', 100], ['Desafio do mês', 200], ['Card no story', 30], ['Foto de evolução (1x/mês)', 80], ['Amiga indicada assinou', 300]].map(([a, b]) => `<div class="row between" style="gap:8px"><span>${t(a)}</span><b style="color:var(--accent)">+${b}</b></div>`).join('')}</div>
    <p class="muted mt small">${t('Pontos de treino somam sozinhos. Nada de mandar print.')}</p></div>
  <h3>${t('Prêmios do trimestre')}</h3><div class="grid2">${[['Strap<br>IS Team', 900], ['Elástico<br>+ adesivo', 1200], ['Luva', 1800], ['Bag', 3000]].map(([n, v]) => `<div class="lib" style="aspect-ratio:1"><b>${t(n)}</b><span>${t('{n} pts', { n: num(v) })}${p.pontos >= v ? ' · ' + t('pode trocar!') : ''}</span></div>`).join('')}</div>
  <p class="muted small">${t('Pra trocar, chama o Igor no WhatsApp com o print dessa tela.')}</p>
  <div class="card"><h3>${t('Histórico')}</h3>${log.length ? log.slice(0, 15).map(l => `<div class="row between" style="padding:6px 0;font-size:13px;gap:8px"><span>${nomes[l.motivo] ? t(nomes[l.motivo]) : esc(l.motivo)}<span class="muted"> · ${fmtData(l.created_at)}</span></span><b style="color:var(--accent)">+${l.pontos}</b></div>`).join('') : `<p class="muted mt">${t('Seu primeiro treino concluído já vale 50.')}</p>`}</div></div>`, 'pontos');
};

// EVOLUÇÃO -------------------------------------------------------------------------
// Número digitado do jeito dela ("72,5 kg", "72.5") vira número; fora da faixa, avisa em vez de salvar vazio.
const numero = v => { const m = String(v ?? '').match(/\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; };
const virgula = v => dec(v); // separador decimal do idioma (64,5 / 64.5)
const ANG = [['foto_path', 'Frente'], ['foto_lado', 'Lado'], ['foto_costas', 'Costas']];
routes.evolucao = async () => {
  const p = S.perfil; if (!S.plano) S.plano = await rapido(db.planoAtual(p.id), db.LS.get('plano'));
  const [ev, sessoes, log] = await Promise.all([rapido(db.evolucao(p.id), db.LS.get('evolucao', [])), sessoesComFila(p, 200), rapido(db.meusPontos(p.id), [])]);
  if (rotaAtual !== 'evolucao') return;
  const mesAtual = new Date().toISOString().slice(0, 7), jaContou = log.some(l => l.motivo === 'evolucao' && (l.ref === mesAtual || String(l.created_at || '').slice(0, 7) === mesAtual));
  const comPeso = ev.filter(e => e.peso_kg != null), comCint = ev.filter(e => e.cintura_cm != null);
  const p1 = comPeso[0], p2 = comPeso[comPeso.length - 1], c1 = comCint[0], c2 = comCint[comCint.length - 1];
  const meses = {}; sessoes.forEach(s => { const k = s.finalizada_em.slice(0, 7); meses[k] = (meses[k] || 0) + 1; });
  const ks = Object.keys(meses).sort().slice(-4); const mx = Math.max(1, ...ks.map(k => meses[k]));
  const nomes = [...new Set((S.plano?.treinos || []).flatMap(t => t.exercicios.filter(e => !tempo(e.reps) && !semCarga(e)).map(e => e.nome)))];
  render(`<div class="view fx"><div class="topbar"><h2>${t('Minha evolução')}</h2></div>
  <div class="row" id="ang" style="gap:6px">${ANG.map(([k, l], i) => `<button class="pill big-pill ${i ? '' : 'on'}" data-a="${k}">${t(l)}</button>`).join('')}</div>
  <div id="fotos"></div>
  <button class="btn ghost sm" id="add" style="align-self:flex-start">+ ${t('Registro do mês')}${jaContou ? '' : ' (' + t('+{n} pts', { n: 80 }) + ')'}</button>
  <div class="grid2"><div class="card"><h3>${t('Peso')}</h3><div class="big" style="margin-top:4px">${p2 ? virgula(p2.peso_kg) : '–'}<small>kg</small></div><p class="muted">${p1 && p2 && p1 !== p2 ? t('{d} kg desde {data}', { d: (p2.peso_kg > p1.peso_kg ? '+' : '') + virgula((p2.peso_kg - p1.peso_kg).toFixed(1)), data: fmtData(p1.data) }) : t('registra pra acompanhar')}</p></div>
  <div class="card"><h3>${t('Cintura')}</h3><div class="big" style="margin-top:4px">${c2 ? virgula(c2.cintura_cm) : '–'}<small>cm</small></div><p class="muted">${c1 && c2 && c1 !== c2 ? t('{d} cm desde {data}', { d: (c2.cintura_cm > c1.cintura_cm ? '+' : '') + (c2.cintura_cm - c1.cintura_cm).toFixed(0), data: fmtData(c1.data) }) : ''}</p></div></div>
  <div class="card"><h3>${t('Treinos por mês')}</h3><div class="row" style="align-items:flex-end;gap:10px;height:96px;margin-top:8px">${ks.length ? ks.map(k => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end"><div style="width:100%;height:${meses[k] / mx * 70}px;background:var(--accent);border-radius:6px"></div><span class="muted small">${dataLocal(k + '-15T12:00', { month: 'short' })} ${meses[k]}</span></div>`).join('') : `<p class="muted">${t('Seu primeiro treino aparece aqui.')}</p>`}</div></div>
  ${nomes.length ? `<div class="card"><h3>${t('Minhas cargas')}</h3><p class="muted">${t('Toca no exercício pra ver como sua carga evoluiu.')}</p>${nomes.map(n => `<button class="linha" data-hist="${esc(n)}">${esc(n)}<span>›</span></button>`).join('')}</div>` : ''}</div>`, 'evolucao');
  $$('[data-hist]').forEach(b => b.onclick = () => abrirHistorico(b.dataset.hist));
  // Antes x agora, por ângulo: primeira foto que existe x a mais recente
  const fotos = async k => {
    const com = ev.filter(e => e[k]), a = com[0], z = com[com.length - 1];
    const [u1, u2] = await Promise.all([rapido(db.fotoUrl(a?.[k]), null), z !== a ? rapido(db.fotoUrl(z?.[k]), null) : null]);
    const el = $('#fotos'); if (!el) return;
    el.innerHTML = `<div class="grid2"><div class="photo" style="${u1 ? `background-image:url(${u1})` : ''}">${u1 ? '' : a ? t('Sem internet pra mostrar a foto') : t('Sua primeira foto')}</div><div class="photo" style="${u2 ? `background-image:url(${u2})` : ''}">${u2 ? '' : t('Foto de hoje')}</div></div>
      <div class="row between" style="margin-top:6px"><span class="muted small">${a ? t('Antes') + ' · ' + fmtData(a.data) : ''}</span><span class="muted small">${z && z !== a ? t('Agora') + ' · ' + fmtData(z.data) : ''}</span></div>`;
  };
  fotos('foto_path');
  $$('#ang [data-a]').forEach(b => b.onclick = () => { $$('#ang .pill').forEach(x => x.classList.toggle('on', x === b)); fotos(b.dataset.a); });
  $('#add').onclick = () => {
    const slot = (k, lab) => `<label class="photo" for="f-${k}" style="aspect-ratio:3/4;cursor:pointer;position:relative"><img src="icons/guia-${k}.jpg" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.9"><span style="position:absolute;bottom:6px;left:0;right:0;font-weight:600;color:var(--fg);font-size:14px">${lab}</span><input id="f-${k}" type="file" accept="image/*" hidden></label>`;
    overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px;margin-top:20px"><h2>${t('Registro do mês')}</h2>
      <p class="muted">${t('Três fotos, sempre do mesmo jeito: roupa de treino, mesmo lugar, luz de frente, celular na altura do umbigo. Só você e o Igor veem.')}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${slot('frente', t('Frente'))}${slot('lado', t('Lado'))}${slot('costas', t('Costas'))}</div>
      <div class="grid2"><div class="field"><label class="l" for="pk">${t('Peso (kg)')}</label><input class="input" id="pk" inputmode="decimal" placeholder="${t('ex. {v}', { v: dec(64.5) })}" value="${virgula(p2?.peso_kg)}"></div><div class="field"><label class="l" for="ci">${t('Cintura (cm)')}</label><input class="input" id="ci" inputmode="decimal" placeholder="${t('ex. {v}', { v: 72 })}" value="${virgula(c2?.cintura_cm)}"></div></div>
      <p class="err" id="e" hidden></p>
      <div class="row"><button class="btn ghost sm" id="c" style="flex:1">${t('Cancelar')}</button><button class="btn sm" id="s" style="flex:1">${t('Salvar')}</button></div></div></div>`);
    ['frente', 'lado', 'costas'].forEach(k => $(`#f-${k}`).onchange = e => { const f = e.target.files[0]; if (f) { const lb = $(`label[for="f-${k}"]`); lb.style.backgroundImage = `url(${URL.createObjectURL(f)})`; lb.querySelector('img').style.opacity = 0; } });
    $('#c').onclick = closeOverlay;
    const erro = x => { $('#e').textContent = x; $('#e').hidden = false; $('#s').disabled = false; $('#s').textContent = t('Salvar'); };
    $('#s').onclick = async () => {
      $('#s').disabled = true; $('#e').hidden = true;
      const pv = $('#pk').value.trim(), cv = $('#ci').value.trim(), peso = numero(pv), cint = numero(cv);
      if (pv && (peso == null || peso < 30 || peso > 250)) return erro(t('Confere o peso: digita só o número, ex. {v}', { v: dec(64.5) }));
      if (cv && (cint == null || cint < 40 || cint > 200)) return erro(t('Confere a cintura em centímetros, ex. 72'));
      const n = ['frente', 'lado', 'costas'].filter(k => $(`#f-${k}`).files[0]).length;
      if (n > 0 && n < 3) return erro(t('Faltam fotos: manda as 3 (frente, lado e costas) pra comparar certinho.'));
      if (!n && peso == null && cint == null) return erro(t('Coloca as fotos ou pelo menos o peso.'));
      $('#s').textContent = t('Salvando…');
      try {
        const fotos = {}; for (const k of ['frente', 'lado', 'costas']) { const f = $(`#f-${k}`).files[0]; if (f) fotos[k] = await comprimir(f); }
        await db.salvarEvolucao(p.id, { data: new Date().toISOString().slice(0, 10), peso_kg: peso, cintura_cm: cint }, fotos);
        if (peso && peso !== p.peso_kg) db.salvarPerfil({ peso_kg: peso }).then(x => { if (x) S.perfil = x; }).catch(() => {});
        let ganhou = false; if (n === 3) ganhou = await db.registrarPontos(p.id, 'evolucao', 80, mesAtual).catch(() => false);
        closeOverlay(); toast(n === 3 ? (ganhou ? t('Registrado! +80 pts') : t('Registrado! (os pontos de foto desse mês já foram contados)')) : t('Medidas registradas ✓')); go('evolucao');
      } catch (er) { erro(traduzErro(er)); }
    };
  };
};
async function comprimir(file) {
  const img = await createImageBitmap(file); const max = 1080; const r = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = img.width * r; c.height = img.height * r; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(new File([b], 'foto.jpg', { type: 'image/jpeg' })), 'image/jpeg', .8));
}

// PERFIL ----------------------------------------------------------------------------
routes.perfil = async () => {
  const p = (await rapido(db.perfil(), null)) || S.perfil; S.perfil = p; const sessoes = await rapido(db.minhasSessoes(p.id, 30), db.LS.get('sessoes', []));
  if (rotaAtual !== 'perfil') return;
  const resp = sessoes.filter(s => s.resposta_igor).sort((a, b) => String(b.respondida_em || b.finalizada_em).localeCompare(String(a.respondida_em || a.finalizada_em)));
  if (resp.length) db.LS.set('respLidas', [...new Set([...db.LS.get('respLidas', []), ...resp.map(r => r.id)])].slice(-50)); // viu aqui = lida
  render(`<div class="view fx"><div class="topbar"><h2>${t('Perfil')}</h2>${p.role === 'admin' ? `<button class="pill on" data-go="admin">${t('Painel do Igor')}</button>` : ''}</div>
  <div class="card row" style="gap:12px"><div style="width:52px;height:52px;border-radius:50%;background:var(--accent);display:grid;place-items:center;font-family:var(--display);font-size:22px;font-weight:800;color:var(--accent-ink)">${esc((p.nome || '?')[0].toUpperCase())}</div><div><b style="font-size:17px">${esc(p.nome)}</b>${p.plano === 'personalizado' ? ` <span class="pill" style="vertical-align:middle">${t('Personalizado')}</span>` : ''}<p class="muted">${t('No time desde {data}', { data: dataLocal(p.created_at, { month: 'short', year: 'numeric' }) })} · ${t('{n} pts', { n: num(p.pontos) })}</p></div></div>
  <div class="card"><div class="row between"><b style="font-size:15px">${t('Minha anamnese')}</b><button class="btn ghost sm" id="ed">${t('editar')}</button></div><p class="muted">${esc([rotuloAnam('objetivo', p.objetivo), p.dias_semana ? t('{n}x/semana', { n: p.dias_semana }) : null, p.tempo_treino_min ? t('{n} min', { n: p.tempo_treino_min }) : null, rotuloAnam('local_treino', p.local_treino), (p.foco || []).length ? t('foco: {x}', { x: p.foco.map(f => rotuloAnam('foco', f)).join(', ') }) : null, p.limitacoes ? t('atenção: {x}', { x: p.limitacoes }) : null].filter(Boolean).join(' · ') || t('preencha pro Igor montar seu treino'))}</p>${(() => { const m = tmb(p); return m ? `<p class="muted mt">${t('Gasto estimado: <b style="color:var(--fg)">{g} kcal/dia</b> (basal {b}) · estimativa, atualiza quando você registra o peso', { g: num(m.gasto), b: num(m.tmb) })}</p>` : ''; })()}</div>
  <div class="card"><div class="row between"><b style="font-size:15px">${t('Respostas do Igor')}</b>${resp.length ? `<span class="pill on">${resp.length}</span>` : ''}</div>${resp.length ? resp.slice(0, 3).map(s => `<div class="mt"><p class="muted small">${t('Seu {x}', { x: esc(s.titulo ? nomeTreino(s.titulo) : t('treino')) })} · ${fmtData(s.finalizada_em)}${s.comentario ? ': "' + esc(s.comentario) + '"' : ''}</p><p style="margin-top:2px">↳ "${esc(s.resposta_igor)}"</p></div>`).join('') : `<p class="muted">${t('Quando você mandar feedback no fim do treino, ele responde aqui.')}</p>`}</div>
  <div class="card"><div class="row between"><b style="font-size:15px">${t('Indique uma amiga')}</b><b style="color:var(--accent)">${t('+{n} pts', { n: 300 })}</b></div><p class="muted">${t('Seu código:')} <b style="color:var(--fg)">${esc(p.cod_indicacao || '')}</b>. ${t('Ela coloca no cadastro e vocês duas ganham.')}</p></div>
  <div class="card"><div class="row between"><b style="font-size:15px">🌐 ${t('Idioma')}</b><button class="btn ghost sm" id="idi">${infoIdioma().flag} ${infoIdioma().nome}</button></div><p class="muted">${t('O app aparece nesse idioma. Treinos, dicas e recados do Igor continuam em português.')}</p></div>
  <div class="card"><div class="row between"><b style="font-size:15px">${t('Lembretes')}</b><button class="btn ghost sm" id="notif">${t('ativar')}</button></div><p class="muted">${t('Aviso leve se ficar 3 dias sem treinar. No iPhone, adiciona o app à tela inicial primeiro.')}</p></div>
  <div class="card"><div class="row between"><b style="font-size:15px">${t('Senha')}</b><button class="btn ghost sm" id="pw">${t('trocar')}</button></div><p class="muted">${t('Se ainda é o seu número de WhatsApp, troca aqui.')}</p></div>
  <div class="row"><a class="btn ghost sm" style="flex:1" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}" target="_blank" rel="noopener">${t('Chamar o Igor')}</a><button class="btn ghost sm" style="flex:1" id="out">${t('Sair')}</button></div></div>`, 'perfil');
  $('#idi').onclick = escolherIdioma;
  $('#out').onclick = async () => { await db.logout(); S.perfil = null; go('entrada'); };
  $('#notif').onclick = async () => { if (!('Notification' in window)) return toast(t('Seu navegador não suporta. No iPhone: Compartilhar → Adicionar à Tela de Início.'), true); const r = await Notification.requestPermission(); toast(r === 'granted' ? t('Lembretes ligados ✓') : t('Sem permissão. Dá pra ligar nos ajustes do celular.')); };
  $('#pw').onclick = () => {
    overlay(`<div class="modal" id="m"><form class="box" id="fs" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>${t('Nova senha')}</h2>
      <div class="field"><label class="l" for="n1">${t('Nova senha')}</label>${campoSenha('n1', t('mínimo 6 caracteres'))}</div><div class="field"><label class="l" for="n2">${t('Repete a senha')}</label>${campoSenha('n2')}</div>
      <p class="err" id="e" hidden></p><div class="row"><button type="button" class="btn ghost sm" id="c" style="flex:1">${t('Cancelar')}</button><button class="btn sm" id="s" style="flex:1">${t('Salvar')}</button></div></form></div>`);
    $('#c').onclick = closeOverlay;
    $('#fs').onsubmit = async ev => { ev.preventDefault(); const er = erroSenha($('#n1').value, $('#n2').value); if (er) { $('#e').textContent = er; $('#e').hidden = false; return; }
      $('#s').disabled = true; try { await db.trocarSenha($('#n1').value); await db.salvarPerfil({ senha_trocada: true }).catch(() => {}); closeOverlay(); toast(t('Senha trocada ✓ Na próxima vez, entra com ela.')); } catch (e) { $('#e').textContent = traduzErro(e); $('#e').hidden = false; $('#s').disabled = false; } };
  };
  $('#ed').onclick = () => anamneseForm(p, () => go('perfil'));
};
// Mesmas regras de senha no 1º acesso, no Perfil e no "esqueci a senha"
function erroSenha(a, b) {
  const w = String(S.perfil?.whatsapp || '').replace(/\D/g, '');
  return a.length < 6 ? t('A senha precisa ter pelo menos 6 caracteres.') : a !== b ? t('As duas senhas não estão iguais.') : w.length >= 8 && a.replace(/\D/g, '').endsWith(w.slice(-8)) && a.replace(/\D/g, '').length >= 8 ? t('Escolhe uma diferente do seu WhatsApp.') : '';
}
// Taxa metabólica basal (Mifflin-St Jeor) e gasto diário estimado
export function tmb(p) {
  if (!p.peso_kg || !p.altura_m || !p.nascimento || p.altura_m < 1.2 || p.altura_m > 2.2 || p.peso_kg < 30 || p.peso_kg > 250) return null;
  const idade = Math.floor((Date.now() - new Date(p.nascimento)) / 31557600000);
  const base = 10 * p.peso_kg + 6.25 * (p.altura_m * 100) - 5 * idade + (p.sexo === 'M' ? 5 : -161);
  const fator = { sedentaria: 1.2, leve: 1.375, moderada: 1.55, alta: 1.725 }[p.atividade || 'leve'];
  return { tmb: Math.round(base), gasto: Math.round(base * fator), idade };
}
// ANAMNESE: uma pergunta por tela ------------------------------------------------
const PARTES = ['Glúteo', 'Pernas', 'Abdômen', 'Costas', 'Braços', 'Peito', 'Ombro'];
const Q = [
  { k: 'objetivo', t: 'Qual seu objetivo principal?', tipo: 'um', op: ['Emagrecer', 'Ganhar massa', 'Os dois', 'Correr melhor', 'Saúde e disposição'], req: true },
  { k: 'dias_semana', t: 'Quantos dias por semana você consegue treinar de verdade?', tipo: 'um', op: [2, 3, 4, 5, 6], req: true, num: true },
  { k: 'tempo_treino_min', t: 'Quanto tempo você tem por treino?', tipo: 'um', op: [['até 30 min', 30], ['40 min', 40], ['50 a 60 min', 60]], req: true, num: true },
  { k: 'local_treino', t: 'Onde vai treinar?', tipo: 'um', op: [['Academia', 'academia'], ['Casa', 'casa'], ['Os dois', 'ambos']], req: true },
  { k: 'experiencia', t: 'Há quanto tempo treina musculação?', tipo: 'um', op: ['Nunca treinei', 'Menos de 6 meses', '6 meses a 2 anos', 'Mais de 2 anos'], req: true },
  { k: 'foco', t: 'Que partes do corpo você quer focar mais?', sub: 'Pode marcar mais de uma.', tipo: 'multi', op: PARTES, req: true },
  { k: 'incomoda', t: 'Qual parte mais te incomoda hoje?', tipo: 'um', op: [...PARTES, 'Nenhuma'] },
  { k: 'limitacoes', t: 'Sente dor, tem lesão ou alguma limitação?', sub: 'Se não tiver, pode pular.', tipo: 'texto', ph: 'ex. lombar, joelho direito, ombro...' },
  { k: 'saude', t: 'Alguma dessas se aplica a você?', sub: 'Isso muda como o Igor monta seu treino.', tipo: 'multi', op: ['Pressão alta', 'Diabetes', 'Problema cardíaco', 'Asma', 'Cirurgia nos últimos 12 meses', 'Tomo medicação contínua', 'Nenhuma'], req: true, excl: 'Nenhuma' },
  { k: 'gestacao', t: 'Está grávida ou teve filho nos últimos 12 meses?', tipo: 'um', op: [['Não', 'nao'], ['Grávida', 'gravida'], ['Pós-parto', 'pos_parto']], req: true },
  { k: 'sono_estresse', t: 'Como anda seu sono e seu estresse?', sub: '1 = péssimo · 5 = ótimo', tipo: 'um', op: [['😩 1', 1], ['😕 2', 2], ['😐 3', 3], ['🙂 4', 4], ['😄 5', 5]], num: true },
  { k: 'atividade', t: 'Fora do treino, como é seu dia a dia?', sub: 'Pra calcular quanto você gasta por dia.', tipo: 'um', op: [['Sentada a maior parte (escritório, estudo)', 'sedentaria'], ['Anda bastante, fica em pé', 'leve'], ['Trabalho ativo, carrego peso', 'moderada'], ['Muito ativo o dia inteiro', 'alta']], req: true },
  { k: 'nascimento', t: 'Sua data de nascimento', sub: 'A idade entra na conta da sua taxa metabólica.', tipo: 'data', req: true },
  { k: 'nutri', t: 'Faz acompanhamento com nutricionista?', tipo: 'um', op: ['Sim', 'Não', 'Quero fazer'] },
  { k: 'medidas', t: 'Seu peso e altura', tipo: 'medidas', req: true },
  { k: 'desistiu', t: 'O que já te fez desistir de treinar antes?', sub: 'Pra o Igor te ajudar a não repetir.', tipo: 'um', op: ['Falta de tempo', 'Falta de resultado', 'Dor ou lesão', 'Sem companhia ou motivação', 'Nunca desisti'] }
];
// Rótulo de uma resposta salva (o valor no banco fica em português; aqui só o que aparece na tela)
function rotuloAnam(k, v) {
  if (v == null || v === '') return null;
  const q = Q.find(x => x.k === k), o = (q?.op || []).find(o => String(Array.isArray(o) ? o[1] : o) === String(v));
  return o ? t(Array.isArray(o) ? o[0] : o) : v;
}
// Rascunho fica no celular a cada resposta; voltar do celular = pergunta anterior; sem pular sozinho;
// no fim, uma tela pra conferir tudo antes de enviar.
function anamneseForm(p, done, titulo = 'Me conta de você') {
  const rasc = db.LS.get('anamnese');
  const r = rasc?.r || { atividade: p.atividade, nascimento: p.nascimento, objetivo: p.objetivo, dias_semana: p.dias_semana, tempo_treino_min: p.tempo_treino_min, local_treino: p.local_treino, experiencia: p.experiencia, foco: p.foco || [], incomoda: p.incomoda, limitacoes: p.limitacoes, saude: p.saude || [], gestacao: p.gestacao || 'nao', sono_estresse: p.sono_estresse, nutri: p.nutri, peso_kg: p.peso_kg, altura_m: p.altura_m, desistiu: p.desistiu };
  let i = rasc ? rasc.i : (p.objetivo ? 0 : -1), revisando = false; // -1 = boas-vindas (1ª vez)
  const val = o => Array.isArray(o) ? o[1] : o, lab = o => t(Array.isArray(o) ? o[0] : o);
  const guarda = () => db.LS.set('anamnese', { r, i: Math.max(0, i) });
  const fechar = () => { voltarOverlay = null; closeOverlay(); };
  voltarOverlay = () => { if (revisando || i === Q.length) { i = Q.length; return revisao(); } if (i > 0) { i--; guarda(); tela(); } else fechar(); };
  const caixa = (miolo, rodape) => overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:14px;margin-top:20px;min-height:70vh">${miolo}<div class="row">${rodape}</div></div></div>`);
  const resposta = q => {
    if (q.tipo === 'medidas') return [r.peso_kg ? virgula(r.peso_kg) + ' kg' : '', r.altura_m ? virgula(r.altura_m) + ' m' : ''].filter(Boolean).join(' · ');
    const v = r[q.k]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
    if (q.tipo === 'data') return dataLocal(v + 'T12:00', { day: '2-digit', month: 'short', year: 'numeric' });
    const nome = x => { const o = (q.op || []).find(o => String(val(o)) === String(x)); return o ? lab(o) : x; }; // texto livre fica como ela escreveu
    return Array.isArray(v) ? v.map(nome).join(', ') : nome(v);
  };
  function boasVindas() {
    caixa(`<h3>${esc(t(titulo))}</h3><div style="flex:1;display:flex;flex-direction:column;gap:12px;justify-content:center"><h2 style="font-size:28px">${t('Antes do primeiro treino')}</h2><p style="font-size:17px;line-height:1.45">${t('São {n} perguntas rápidas (uns 3 minutos). Com elas o Igor monta o <b>seu</b> treino.', { n: Q.length })}</p><p class="muted">${t('Dá pra parar e continuar depois: o que você responder fica salvo.')}</p></div>`,
      `<button class="btn ghost sm" id="cancel" style="flex:1">${t('Depois')}</button><button class="btn sm" id="next" style="flex:2">${t('Começar')}</button>`);
    $('#cancel').onclick = fechar; $('#next').onclick = () => { i = 0; guarda(); tela(); };
  }
  function revisao() {
    revisando = true;
    caixa(`<div class="row between"><h3>${esc(t(titulo))}</h3><span class="muted small">${t('Confere')}</span></div><h2 style="font-size:24px">${t('Tá tudo certo?')}</h2><p class="muted">${t('Toca numa resposta pra mudar.')}</p>
      <div style="flex:1">${Q.map((q, j) => `<button class="linha" data-j="${j}" style="flex-direction:column;align-items:flex-start;gap:2px"><span class="muted small" style="text-align:left">${esc(t(q.t))}</span><b style="text-align:left;font-weight:600">${esc(resposta(q) || '—')}</b></button>`).join('')}</div>
      <p class="err" id="e" hidden></p>`,
      `<button class="btn sm" id="next" style="flex:1">${t('Enviar pro Igor')}</button>`);
    $$('[data-j]').forEach(b => b.onclick = () => { i = +b.dataset.j; tela(); });
    $('#next').onclick = salvar;
  }
  function tela() {
    if (i < 0) return boasVindas();
    if (i >= Q.length) return revisao();
    const q = Q[i]; const sel = r[q.k];
    let corpo = '';
    const marcado = o => q.tipo === 'multi' ? (sel || []).includes(val(o)) : String(sel) === String(val(o));
    if (q.tipo === 'um' || q.tipo === 'multi') corpo = `<div id="ops" class="opcoes">${q.op.map(o => `<button type="button" class="opc ${marcado(o) ? 'on' : ''}" data-v="${esc(val(o))}">${esc(lab(o))}</button>`).join('')}</div>`;
    if (q.tipo === 'texto') corpo = `<input class="input" id="tx" value="${esc(sel || '')}" placeholder="${esc(t(q.ph || ''))}">`;
    if (q.tipo === 'data') corpo = `<input class="input" id="tx" type="date" value="${esc(sel || '')}" max="${new Date().toISOString().slice(0, 10)}">`;
    if (q.tipo === 'medidas') corpo = `<div class="grid2"><div class="field"><label class="l" for="pk">${t('Peso (kg)')}</label><input class="input" id="pk" inputmode="decimal" value="${virgula(r.peso_kg)}" placeholder="${t('ex. {v}', { v: 64 })}"></div><div class="field"><label class="l" for="al">${t('Altura (m)')}</label><input class="input" id="al" inputmode="decimal" value="${virgula(r.altura_m)}" placeholder="${t('ex. {v}', { v: dec(1.65) })}"></div></div>`;
    caixa(`<div class="row between"><h3>${esc(t(titulo))}</h3><span class="muted small">${t('{a} de {b}', { a: i + 1, b: Q.length })}</span></div><div class="bar"><i style="width:${(i) / Q.length * 100}%"></i></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:10px"><h2 style="font-size:24px">${esc(t(q.t))}</h2>${q.sub ? `<p class="muted">${esc(t(q.sub))}</p>` : ''}${corpo}<p class="err" id="e" hidden>${t('Essa é importante pro Igor montar seu treino.')}</p></div>`,
      `${i > 0 ? `<button class="btn ghost sm" id="prev" style="flex:1">${t('Voltar')}</button>` : `<button class="btn ghost sm" id="cancel" style="flex:1">${t('Depois')}</button>`}<button class="btn sm" id="next" style="flex:2">${revisando ? t('Pronto') : i === Q.length - 1 ? t('Conferir') : t('Próxima')}</button>`);
    if ($('#ops')) $('#ops').onclick = e => { const b = e.target.closest('button'); if (!b) return; const v = q.num ? +b.dataset.v : b.dataset.v;
      if (q.tipo === 'multi') { let arr = r[q.k] || []; if (q.excl && v === q.excl) arr = [v]; else { arr = arr.filter(x => x !== q.excl); arr = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]; } r[q.k] = arr; $$('#ops button').forEach(x => x.classList.toggle('on', arr.includes(q.num ? +x.dataset.v : x.dataset.v))); }
      else { r[q.k] = v; $$('#ops button').forEach(x => x.classList.toggle('on', x === b)); }
      $('#e').hidden = true; guarda(); };
    if ($('#prev')) $('#prev').onclick = () => { i--; guarda(); tela(); };
    if ($('#cancel')) $('#cancel').onclick = fechar;
    $('#next').onclick = avancar;
    function avancar() {
      if (q.tipo === 'texto' || q.tipo === 'data') r[q.k] = $('#tx').value.trim() || null;
      if (q.tipo === 'medidas') {
        let pk = numero($('#pk').value), al = numero($('#al').value);
        if (al && al > 3) al = +(al / 100).toFixed(2); // digitou 165 (cm) → 1,65 m
        if (pk != null && (pk < 30 || pk > 250)) { $('#e').textContent = t('Confere o peso: ex. 64 ou {v}', { v: dec(64.5) }); $('#e').hidden = false; return; }
        if (al != null && (al < 1.2 || al > 2.2)) { $('#e').textContent = t('Confere a altura: ex. {v}', { v: dec(1.65) }); $('#e').hidden = false; return; }
        r.peso_kg = pk; r.altura_m = al;
      }
      const ok = q.tipo === 'medidas' ? (r.peso_kg && r.altura_m) : q.tipo === 'multi' ? (r[q.k] || []).length : r[q.k] != null && r[q.k] !== '';
      if (q.req && !ok) { $('#e').textContent = t('Essa é importante pro Igor montar seu treino.'); $('#e').hidden = false; return; }
      i = revisando ? Q.length : i + 1; guarda(); tela();
    }
  }
  async function salvar() {
    const falta = Q.findIndex(q => q.req && !(q.tipo === 'medidas' ? (r.peso_kg && r.altura_m) : q.tipo === 'multi' ? (r[q.k] || []).length : r[q.k] != null && r[q.k] !== ''));
    if (falta >= 0) { i = falta; return tela(); }
    $('#next').disabled = true; $('#next').textContent = t('Enviando…');
    try { await db.salvarPerfil({ ...r, anamnese_em: new Date().toISOString() }); db.LS.del('anamnese'); fechar(); toast(t('Enviado! O Igor monta seu treino a partir disso ✓')); done(); }
    catch (e) { $('#e').textContent = traduzErro(e) + ' ' + t('Suas respostas ficaram salvas no celular.'); $('#e').hidden = false; $('#next').disabled = false; $('#next').textContent = t('Enviar pro Igor'); }
  }
  tela();
}

routes.admin = () => adminView(S, { render, go, anamneseForm, db });

// BOOT ------------------------------------------------------------------------
async function boot() {
  if (!(C0.DEMO || new URLSearchParams(location.search).has('demo')) && (!C.SUPABASE_URL || C.SUPABASE_URL.includes('SEU-PROJETO'))) return render(`<div class="view noTabs"><div class="logo big" style="margin-top:40px">IGOR<br>SOUSA <b>TEAM</b></div><div class="card"><b>Falta ligar o banco.</b><p class="muted">Preencha js/config.js com a URL e a anon key do projeto Supabase. O passo a passo está no README.</p></div></div>`);
  S.user = await db.sessionUser();
  if (!S.user) return go('entrada');
  S.perfil = await db.perfil();
  if (!S.perfil) { render(`<div class="view noTabs"><h2>${t('Conta sem perfil')}</h2><p class="muted">${t('Chama o Igor no WhatsApp pra liberar seu acesso.')}</p><button class="btn ghost" id="o">${t('Sair')}</button></div>`); $('#o').onclick = async () => { await db.logout(); go('entrada'); }; return; }
  if (!S.perfil.ativa && S.perfil.role !== 'admin') { render(`<div class="view noTabs"><h2>${t('Acesso pausado')}</h2><p class="muted">${t('Sua assinatura tá pausada. Renovou? É só me chamar que libero na hora.')}</p><a class="btn" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}">${t('Falar com o Igor')}</a><button class="btn ghost" id="o">${t('Sair')}</button></div>`); $('#o').onclick = async () => { await db.logout(); go('entrada'); }; return; }
  sincronizarFila();
  if (S.perfil.role === 'admin') return go('admin');
  if (S.perfil.senha_trocada === false) return criarSenha();
  S.sessao = db.LS.get('sessao');
  const h = location.hash.slice(1);
  // Treino esquecido há mais de 12h: não apaga, pergunta se ela quer registrar o que fez
  const s = S.sessao, velho = s && Date.now() - (s.pausadoEm || s.ult || s.inicio) > 12 * 3600000;
  if (velho && !seriesFeitas(s)) { S.sessao = null; db.LS.del('sessao'); }
  else if (velho) {
    go('home');
    const quando = dataLocal(s.pausadoEm || s.ult || s.inicio, { weekday: 'long' });
    if (await perguntar(t('Treino pela metade'), t('Seu {x} de {dia} ficou com {n} séries marcadas. Quer registrar o que você fez?', { x: nomeTreino(s.titulo), dia: quando, n: seriesFeitas(s) }), t('Registrar o que fiz'), t('Descartar'))) {
      s.fimEm = s.pausadoEm || s.ult || Date.now(); s.pausadoEm = null; salvaSessao(); go('fim');
    } else { S.sessao = null; db.LS.del('sessao'); toast(t('Treino descartado')); routes.home(); }
    return;
  }
  if (S.sessao && ['sessao', 'fim'].includes(h)) return go(h);
  go(['treino', 'videos', 'pontos', 'evolucao', 'perfil', 'lib'].includes(h) ? h : 'home');
  if (!S.perfil.objetivo) anamneseForm(S.perfil, () => go('home'), 'Me conta de você');
}
// 1º acesso: a senha inicial é o WhatsApp; ela cria uma só dela antes de entrar.
function criarSenha() {
  render(`<div class="view noTabs fx" style="padding-top:28px"><div class="logo big" style="font-size:30px">IGOR<br>SOUSA <b>TEAM</b></div>
  <div><h1>${t('Bem-vinda, {nome}!', { nome: esc(primeiroNome(S.perfil.nome)) })}</h1><p class="mt" style="font-size:16px;line-height:1.45">${t('Sua senha de agora é o seu WhatsApp. Cria uma senha só sua (pelo menos 6 letras ou números) pra ninguém entrar no seu app.')}</p></div>
  <form id="fs" style="display:flex;flex-direction:column;gap:14px"><div class="field"><label class="l" for="n1">${t('Nova senha')}</label>${campoSenha('n1', t('mínimo 6 caracteres'))}</div>
  <div class="field"><label class="l" for="n2">${t('Repete a senha')}</label>${campoSenha('n2')}</div>
  <p class="err" id="e" hidden></p><button class="btn" id="s">${t('Salvar e entrar')}</button></form></div>`);
  $('#fs').onsubmit = async ev => {
    ev.preventDefault();
    const a = $('#n1').value, erro = erroSenha(a, $('#n2').value);
    if (erro) { $('#e').textContent = erro; $('#e').hidden = false; return; }
    $('#s').disabled = true;
    try { await db.trocarSenha(a); S.perfil = await db.salvarPerfil({ senha_trocada: true }); toast(t('Senha criada ✓ Guarda ela!')); boot(); }
    catch (er) { $('#e').textContent = traduzErro(er); $('#e').hidden = false; $('#s').disabled = false; }
  };
}
window.addEventListener('online', sincronizarFila);
db.sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') { overlay(`<div class="modal" id="m"><form class="box" id="fs" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>${t('Cria sua nova senha')}</h2><div class="field"><label class="l" for="n1">${t('Nova senha')}</label>${campoSenha('n1', t('mínimo 6 caracteres'))}</div><div class="field"><label class="l" for="n2">${t('Repete a senha')}</label>${campoSenha('n2')}</div><p class="err" id="e" hidden></p><button class="btn sm" id="s">${t('Salvar')}</button></form></div>`); $('#fs').onsubmit = async ev => { ev.preventDefault(); const er = erroSenha($('#n1').value, $('#n2').value); if (er) { $('#e').textContent = er; $('#e').hidden = false; return; } try { await db.trocarSenha($('#n1').value); closeOverlay(); toast(t('Senha criada ✓')); boot(); } catch (e) { $('#e').textContent = traduzErro(e); $('#e').hidden = false; } }; } });
boot();
