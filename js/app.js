const C0 = window.ISTEAM_CONFIG;
const db = C0.DEMO || new URLSearchParams(location.search).has('demo') ? await import('./db-mock.js') : await import('./db.js');
import { $, $$, esc, toast, overlay, closeOverlay, fmtMin, hoje, primeiroNome, fmtData, videoModal, restTimer, tabs, cardImagem } from './ui.js';
import { adminView } from './admin.js';

const C = window.ISTEAM_CONFIG;
const app = $('#app');
const S = { user: null, perfil: null, plano: null, programas: null, sessao: null };

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

// ROTEADOR ----------------------------------------------------------------
const routes = {};
function go(name, arg) { routes[name] ? routes[name](arg) : routes.home(); window.scrollTo(0, 0); }
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
function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-${Math.ceil((((t - y) / 86400000) + 1) / 7)}`; }

// ENTRADA / LOGIN ---------------------------------------------------------
routes.entrada = () => render(`<div class="view noTabs"><div class="hero-entrada"><img src="icons/igor_s.jpg" alt="Igor Sousa">
  <div class="c"><div class="logo big">IGOR<br>SOUSA <b>TEAM</b></div><p class="muted">Treino, comunidade e evolução. Tudo no seu celular.</p>
  <button class="btn" data-go="login">Entrar</button><a class="btn ghost" href="${esc(C.KIWIFY_CHECKOUT)}" target="_blank" rel="noopener">Sou nova, quero começar</a></div></div></div>`);

routes.login = () => {
  render(`<div class="view noTabs"><div class="topbar"><button class="back" data-go="entrada">‹ Voltar</button></div>
  <div class="logo big" style="font-size:34px;margin-top:24px">IGOR<br>SOUSA <b>TEAM</b></div>
  <form id="f" style="display:flex;flex-direction:column;gap:14px">
    <div class="field"><label class="l" for="em">E-mail</label><input class="input" id="em" type="email" autocomplete="username" inputmode="email" required></div>
    <div class="field"><label class="l" for="pw">Senha</label><input class="input" id="pw" type="password" autocomplete="current-password" required></div>
    <p class="err" id="err" hidden></p>
    <button class="btn" id="bt">Entrar</button>
    <p class="muted center"><a href="#" id="esq">Esqueceu a senha?</a> · <a href="${esc(C.KIWIFY_CHECKOUT)}" target="_blank" rel="noopener">Assinar</a></p>
    <p class="muted center small">Pagamento pela Kiwify. Confirmou, recebe o acesso no WhatsApp.</p></form></div>`);
  $('#f').onsubmit = async e => {
    e.preventDefault(); $('#bt').disabled = true; $('#err').hidden = true;
    try { await db.login($('#em').value, $('#pw').value); await boot(); }
    catch (er) { $('#err').textContent = 'E-mail ou senha não conferem. Se for sua primeira vez, a senha é seu WhatsApp (só números, com DDD).'; $('#err').hidden = false; $('#bt').disabled = false; }
  };
  $('#esq').onclick = async e => { e.preventDefault(); const em = $('#em').value; if (!em) return toast('Digita seu e-mail primeiro', true); try { await db.esqueciSenha(em); toast('Te mandei um link por e-mail pra criar outra senha.'); } catch { toast('Não consegui. Chama o Igor no WhatsApp.', true); } };
};

// HOME -----------------------------------------------------------------------
routes.home = async () => {
  const p = S.perfil;
  const [plano, sessoes, recado, desafio, programas] = await Promise.all([db.planoAtual(p.id), db.minhasSessoes(p.id), db.recadoAtual(), db.desafioAtual(), db.programas()]);
  S.plano = plano; S.programas = programas;
  const st = streakDias(sessoes);
  const mesCount = sessoes.filter(s => s.finalizada_em >= new Date(new Date().setDate(1)).toISOString().slice(0, 10)).length;
  const wk = isoWeek(new Date()); const semCount = sessoes.filter(s => isoWeek(new Date(s.finalizada_em)) === wk).length;
  const meta = p.dias_semana || 4; const dmeta = desafio?.meta_treinos || 16;
  const prox = proximoTreino(plano, sessoes);
  render(`<div class="view fx"><div class="topbar"><div class="logo sm">IGOR SOUSA <b>TEAM</b></div><span class="pill on">🔥 ${st.dias} dias</span></div>
  <div><p class="muted" style="text-transform:capitalize">${hoje()}</p><h1>Bora, ${esc(primeiroNome(p.nome))}?</h1></div>
  ${prox ? `<div class="card hero"><div class="row between"><span class="pill" style="background:rgba(0,0,0,.18);color:#1a0d00">Treino de hoje</span><span class="small" style="font-weight:600">~${prox.duracao_min || 40} min</span></div>
    <div class="logo" style="font-size:30px;margin:8px 0 4px;color:#1a0d00">Treino ${esc(prox.letra)}<br><span style="font-weight:600;font-size:16px;font-family:var(--body);text-transform:none">${esc(prox.nome)}</span></div>
    <button class="btn dark" style="margin-top:8px" data-go="treino" data-arg="${esc(prox.letra)}">Abrir treino</button></div>`
    : `<div class="card"><b>Seu treino do mês tá chegando.</b><p class="muted">O Igor tá montando com base na sua anamnese. Enquanto isso, os programas extras já estão liberados.</p></div>`}
  ${recado ? `<div class="card row" style="gap:12px"><div style="width:44px;height:44px;border-radius:50%;background:#2a2a2e;display:grid;place-items:center;flex-shrink:0;color:var(--accent)">▶</div><div style="flex:1;min-width:0"><b style="font-size:14px">Recado do Igor</b><p class="muted">${esc(recado.texto || '')}${recado.midia_url ? ` · <a href="${esc(recado.midia_url)}" target="_blank" rel="noopener">ouvir</a>` : ''}</p></div></div>` : ''}
  <div class="grid2">
    <button class="card" data-go="pontos" style="text-align:left;border:0;color:var(--fg)"><h3>${esc(desafio?.titulo || 'Desafio do mês')}</h3><div class="big" style="margin:6px 0 4px">${mesCount}<small>/${dmeta} treinos</small></div><div class="bar"><i style="width:${Math.min(100, mesCount / dmeta * 100)}%"></i></div><p class="muted mt">${mesCount >= dmeta ? 'Batido! +' + (desafio?.pontos_bonus || 200) + ' pts' : `Faltam ${dmeta - mesCount} pra +${desafio?.pontos_bonus || 200} pts`}</p></button>
    <div class="card"><h3>Meta da semana</h3><div class="big" style="margin:6px 0 4px">${semCount}<small>/${meta} treinos</small></div><div class="row" style="gap:4px">${Array.from({ length: meta }, (_, i) => `<i class="dot ${i < semCount ? 'on' : ''}"></i>`).join('')}</div><p class="muted mt">${semCount >= meta ? 'Semana fechada 💪' : `Falta${meta - semCount > 1 ? 'm' : ''} ${meta - semCount} · você consegue`}</p></div>
  </div>
  <div class="row between"><h3>Programas extras</h3><a class="small" data-go="lib" href="#">ver todos</a></div>
  <div class="hscroll">${programas.map(pr => `<button class="lib mini" data-go="programa" data-arg="${pr.slug}" style="background-image:url(${esc(pr.capa_url)})"><b>${esc(pr.titulo)}</b><span>${esc(pr.subtitulo || '')}</span></button>`).join('')}</div></div>`, 'home');
};
function proximoTreino(plano, sessoes) {
  if (!plano?.treinos?.length) return null;
  const ultimo = sessoes.find(s => s.titulo?.startsWith('Treino '));
  if (!ultimo) return plano.treinos[0];
  const i = plano.treinos.findIndex(t => ultimo.titulo === `Treino ${t.letra}`);
  return plano.treinos[(i + 1) % plano.treinos.length];
}

// TREINO MENSAL ---------------------------------------------------------------
routes.treino = async (letra) => {
  const plano = S.plano || await db.planoAtual(S.perfil.id); S.plano = plano;
  if (!plano?.treinos?.length) return render(`<div class="view"><div class="topbar"><h2>Treino mensal</h2></div><div class="card"><b>Ainda não tem treino montado.</b><p class="muted">Assim que o Igor liberar, aparece aqui e você recebe um aviso.</p></div></div>`, 'treino');
  const t = plano.treinos.find(x => x.letra === letra) || plano.treinos[0];
  const mes = new Date(plano.mes + 'T12:00').toLocaleDateString('pt-BR', { month: 'long' });
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="home">‹ Início</button><span class="pill" style="text-transform:capitalize">${esc(mes)}</span></div>
  <div class="row wrap" style="gap:6px">${plano.treinos.map(x => `<button class="pill ${x.letra === t.letra ? 'on' : ''}" data-go="treino" data-arg="${esc(x.letra)}">Treino ${esc(x.letra)}</button>`).join('')}</div>
  <div><h1>Treino ${esc(t.letra)}</h1><p class="muted">${esc(t.nome)} · ${t.exercicios.length} exercícios · ~${t.duracao_min || 40} min</p></div>
  ${plano.obs ? `<div class="card" style="padding:10px 14px"><p class="muted"><b style="color:var(--fg)">Do Igor:</b> ${esc(plano.obs)}</p></div>` : ''}
  <div>${t.exercicios.map(e => `<div class="ex"><div class="n">${e.ordem}</div><div class="t"><b>${esc(e.nome)}</b><span>${e.series} × ${esc(e.reps)} · descanso ${e.descanso_s}s${e.biset_com ? ' · bi-set com o ' + e.biset_com : ''}</span></div><button class="play" data-vid="${esc(e.nome)}" data-url="${esc(e.video_url || '')}" data-dica="${esc(e.dica || '')}" aria-label="Ver vídeo"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></button></div>`).join('')}</div>
  <button class="btn" id="ini">▶ Iniciar treino</button><p class="muted center small">Treino salvo no celular. Só o vídeo usa internet.</p></div>`, 'treino');
  $('#ini').onclick = () => iniciarSessao({ titulo: `Treino ${t.letra}`, treino_id: t.id, exercicios: t.exercicios, duracao_min: t.duracao_min });
};

// PROGRAMAS EXTRAS -------------------------------------------------------------
routes.lib = async () => {
  const programas = S.programas || await db.programas();
  render(`<div class="view fx"><div class="topbar"><h2>Programas extras</h2></div><p class="muted">Liberado pra todas as alunas, além do seu treino.</p>
  <div class="grid2">${programas.map(pr => `<button class="lib" data-go="programa" data-arg="${pr.slug}" style="background-image:url(${esc(pr.capa_url)})"><b>${esc(pr.titulo)}</b><span>${esc(pr.subtitulo || '')}</span></button>`).join('')}</div></div>`, 'home');
};
routes.programa = async (slug) => {
  const programas = S.programas || await db.programas(); const pr = programas.find(p => p.slug === slug); if (!pr) return go('lib');
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="lib">‹ Programas</button></div>
  <div class="lib" style="aspect-ratio:16/9;background-image:url(${esc(pr.capa_url)})"><b style="font-size:26px">${esc(pr.titulo)}</b><span>${esc(pr.subtitulo || '')}</span></div>
  ${pr.programa_treinos?.length ? pr.programa_treinos.map(t => `<div class="card row between"><div><b>${esc(t.nome)}</b><p class="muted">${(t.exercicios || []).length} exercícios · ${t.duracao_min || 20} min</p></div><button class="btn sm" data-pt="${t.id}">Iniciar</button></div>`).join('') : `<div class="card"><p class="muted">O Igor ainda tá gravando os vídeos desse programa. Em breve!</p></div>`}</div>`, 'home');
  $$('[data-pt]').forEach(b => b.onclick = () => { const t = pr.programa_treinos.find(x => x.id === b.dataset.pt); iniciarSessao({ titulo: `${pr.titulo} · ${t.nome}`, programa_treino_id: t.id, exercicios: (t.exercicios || []).map((e, i) => ({ ordem: i + 1, series: 3, reps: '12', descanso_s: 45, ...e })), duracao_min: t.duracao_min }); });
};

// SESSÃO -------------------------------------------------------------------------
async function iniciarSessao({ titulo, treino_id = null, programa_treino_id = null, exercicios, duracao_min }) {
  let sess;
  try { sess = await db.iniciarSessao(S.perfil.id, { treino_id, programa_treino_id, titulo, total: exercicios.length }); }
  catch { toast('Sem internet agora. Vou registrar quando voltar.', true); sess = { id: 'local-' + Date.now(), local: true }; }
  S.sessao = { id: sess.id, local: !!sess.local, titulo, exercicios, i: 0, feitos: 0, inicio: Date.now(), series: [], sets: {} };
  // carga anterior
  for (const e of exercicios) { try { const u = sess.local ? null : await db.ultimaCarga(S.perfil.id, e.nome); if (u) e.ultima = u; } catch {} }
  renderSessao();
}
let clockIv;
function renderSessao() {
  const s = S.sessao, e = s.exercicios[s.i]; if (!e) return finalizar();
  const sets = s.sets[s.i] || (s.sets[s.i] = Array.from({ length: e.series }, () => ({ kg: e.ultima?.kg ?? '', reps: parseInt(e.reps) || '' })));
  render(`<div class="view fx"><div class="topbar"><button class="back" id="sair">‹ Sair</button><span class="pill" id="clock">${fmtMin(Math.floor((Date.now() - s.inicio) / 1000))}</span></div>
  <div class="row between"><span class="muted">Exercício ${s.i + 1} de ${s.exercicios.length}</span><span class="muted">${s.feitos} concluído${s.feitos === 1 ? '' : 's'}</span></div>
  <div class="bar"><i style="width:${(s.i) / s.exercicios.length * 100}%"></i></div>
  <div id="exc"><h1>${esc(e.nome)}</h1><p class="muted">${e.series} × ${esc(e.reps)} · descanso ${e.descanso_s}s${e.dica ? ' · ' + esc(e.dica) : ''}</p>
  <div class="row" style="margin:10px 0"><button class="btn ghost sm" data-vid="${esc(e.nome)}" data-url="${esc(e.video_url || '')}" data-dica="${esc(e.dica || '')}">▶ Ver execução</button>${e.alternativa ? `<button class="btn ghost sm" id="swap">⇄ Trocar</button>` : ''}</div>
  <div class="set"><span class="h">Sér</span><span class="h">kg</span><span class="h">reps</span><span></span></div>
  ${sets.map((st, k) => `<div class="set" data-k="${k}"><span>${k + 1}</span><input inputmode="decimal" value="${st.kg}" data-f="kg" placeholder="kg"><input inputmode="numeric" value="${st.reps}" data-f="reps" placeholder="reps"><button class="rest" data-k="${k}">${e.descanso_s}s</button></div>`).join('')}
  ${e.ultima ? `<p class="muted small mt">Da última vez você fez ${e.ultima.kg} kg × ${e.ultima.reps}. Bora subir?</p>` : ''}
  <div class="card row between" style="margin-top:12px"><div><b style="font-size:14px">Concluído?</b><p class="muted">Marca que eu já puxo o próximo.</p></div><button class="sw" id="sw" aria-label="Concluir exercício"></button></div></div>
  ${s.i > 0 ? `<button class="btn ghost sm" id="prev" style="align-self:flex-start">‹ Exercício anterior</button>` : ''}
  <button class="btn ghost" id="fim">Finalizar treino</button></div>`);
  clearInterval(clockIv); clockIv = setInterval(() => { const c = $('#clock'); if (c) c.textContent = fmtMin(Math.floor((Date.now() - s.inicio) / 1000)); }, 1000);
  $$('.set input').forEach(inp => inp.oninput = () => { const k = +inp.closest('.set').dataset.k; sets[k][inp.dataset.f] = inp.value; });
  $$('.set .rest').forEach(b => b.onclick = async () => { b.closest('.set').classList.add('done'); const k = +b.dataset.k; const prox = k + 1 < sets.length ? `Próxima: série ${k + 2} · ${e.nome}` : (s.exercicios[s.i + 1] ? `Próximo: ${s.exercicios[s.i + 1].nome}` : 'Última série!'); await restTimer(e.descanso_s, prox); });
  if ($('#swap')) $('#swap').onclick = () => { toast(`Opção: ${e.alternativa}`); e.nome = e.alternativa; e.alternativa = null; renderSessao(); };
  $('#sw').onclick = function () { this.classList.add('on'); setTimeout(() => concluir(), 320); };
  if ($('#prev')) $('#prev').onclick = () => { s.i--; renderSessao(); };
  $('#fim').onclick = finalizar;
  $('#sair').onclick = () => { if ($('#sair').dataset.c) { clearInterval(clockIv); go('home'); } else { $('#sair').dataset.c = 1; $('#sair').textContent = 'Toca de novo pra sair sem salvar'; setTimeout(() => { if ($('#sair')) { delete $('#sair').dataset.c; $('#sair').textContent = '‹ Sair'; } }, 2500); } };
}
function concluir() {
  const s = S.sessao, e = s.exercicios[s.i], sets = s.sets[s.i] || [];
  sets.forEach((st, k) => s.series.push({ exercicio_id: e.id || null, exercicio_nome: e.nome, n: k + 1, kg: st.kg === '' ? null : +String(st.kg).replace(',', '.'), reps: st.reps === '' ? null : +st.reps, feita: true }));
  s.feitos++; s.i++;
  if (s.i >= s.exercicios.length) return finalizar();
  toast(`${e.nome} ✓ · próximo na tela`); renderSessao();
}
async function finalizar() {
  clearInterval(clockIv); const s = S.sessao; const dur = Math.floor((Date.now() - s.inicio) / 1000);
  render(`<div class="view noTabs fx" style="padding-top:28px"><div><p class="muted">${esc(s.titulo)} · ${fmtMin(dur)} · ${s.feitos} de ${s.exercicios.length}</p><h1>${s.feitos === s.exercicios.length ? 'Mandou bem!' : 'Boa, registrado!'}</h1></div>
  <div><label class="l">Esforço (0 leve · 10 muito pesado)</label><div class="scale" id="esf">${Array.from({ length: 11 }, (_, i) => `<button class="${i === 7 ? 'on' : ''}">${i}</button>`).join('')}</div></div>
  <div><label class="l">Como foi o treino? (0 a 10)</label><div class="scale" id="nota">${Array.from({ length: 11 }, (_, i) => `<button class="${i === 9 ? 'on' : ''}">${i}</button>`).join('')}</div></div>
  <div class="field"><label class="l" for="fb">Quer falar algo pro Igor?</label><textarea class="input" id="fb" placeholder="Senti a lombar no búlgaro... / Tá leve, pode subir carga..."></textarea></div>
  <button class="btn" id="env">Enviar e gerar meu card</button><p class="muted center small">O Igor vê isso no painel dele e te responde aqui no app.</p></div>`);
  $$('.scale').forEach(sc => sc.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; $$('button', sc).forEach(x => x.classList.remove('on')); b.classList.add('on'); });
  $('#env').onclick = async () => {
    $('#env').disabled = true;
    const patch = { duracao_s: dur, exercicios_feitos: s.feitos, esforco: +$('#esf .on').textContent, nota: +$('#nota .on').textContent, comentario: $('#fb').value.trim() || null };
    try {
      if (s.local) { const fila = db.LS.get('fila', []); fila.push({ s, patch }); db.LS.set('fila', fila); toast('Salvei no celular. Envio quando a internet voltar.'); }
      else { await db.salvarSeries(s.id, s.series); await db.finalizarSessao(s.id, patch); }
    } catch (er) { toast('Não consegui enviar agora, mas guardei.', true); const fila = db.LS.get('fila', []); fila.push({ s, patch }); db.LS.set('fila', fila); }
    go('card', JSON.stringify({ titulo: s.titulo, min: Math.round(dur / 60), ex: s.feitos }));
  };
}
async function sincronizarFila() {
  const fila = db.LS.get('fila', []); if (!fila.length) return; const rest = [];
  for (const it of fila) { try { const sess = await db.iniciarSessao(S.perfil.id, { treino_id: null, titulo: it.s.titulo, total: it.s.exercicios.length }); await db.salvarSeries(sess.id, it.s.series); await db.finalizarSessao(sess.id, it.patch); } catch { rest.push(it); } }
  db.LS.set('fila', rest); if (rest.length < fila.length) toast('Treino offline enviado ✓');
}

// CARD -------------------------------------------------------------------------
routes.card = async (arg) => {
  const d = JSON.parse(arg || '{}'); const sessoes = await db.minhasSessoes(S.perfil.id); const st = streakDias(sessoes);
  const data = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  render(`<div class="view fx"><div class="topbar"><button class="back" data-go="home">‹ Início</button><span class="pill on">+50 pts</span></div>
  <div class="share"><div class="row between"><div class="logo sm">IGOR SOUSA <b>TEAM</b></div><span class="pill">${data}</span></div>
    <div><div class="logo" style="font-size:40px">Treino<br>feito <b>✓</b></div><div class="row" style="gap:18px;margin-top:14px"><div class="big" style="font-size:30px">${d.min}<small>min</small></div><div class="big" style="font-size:30px">${d.ex}<small>exerc.</small></div><div class="big" style="font-size:30px;color:var(--accent)">🔥${st.dias}<small>dias</small></div></div>
    <p class="muted mt small">${esc(primeiroNome(S.perfil.nome))} · ${esc(d.titulo)} · ${esc(C.INSTAGRAM)}</p></div></div>
  <div class="row"><button class="btn sm" style="flex:1" id="share">Postar no story</button><button class="btn ghost sm" style="flex:1" data-go="evolucao">Minha evolução</button></div>
  <p class="muted center small">Cada story é um convite pra sua amiga entrar no time.</p></div>`, 'home');
  $('#share').onclick = async () => { const r = await cardImagem({ nome: primeiroNome(S.perfil.nome), titulo: d.titulo, minutos: d.min, exercicios: d.ex, streak: st.dias, data, insta: C.INSTAGRAM }); if (r !== 'cancel') { const ok = await db.registrarPontos(S.perfil.id, 'story', 30, new Date().toISOString().slice(0, 10)).catch(() => false); toast(ok ? 'Card pronto! +30 pts' : 'Card pronto! (pontos do story já contados hoje)'); } };
};

// PONTOS --------------------------------------------------------------------------
routes.pontos = async () => {
  const p = await db.perfil(); S.perfil = p; const log = await db.meusPontos(p.id);
  const nomes = { treino: 'Treino concluído', semana: 'Semana completa', desafio: 'Desafio do mês', story: 'Card no story', checkin: 'Check-in com foto', evolucao: 'Foto de evolução', indicacao: 'Amiga indicada', renovacao: 'Mês renovado' };
  render(`<div class="view fx"><div class="topbar"><h2>Meus pontos</h2><span class="pill on">${p.pontos} pts</span></div>
  <div class="card"><h3>Como ganhar</h3><div style="display:grid;gap:8px;margin-top:8px;font-size:14px">
    ${[['Treino concluído', 50], ['Semana completa', 100], ['Desafio do mês', 200], ['Card no story', 30], ['Foto de evolução (1x/mês)', 80], ['Amiga indicada assinou', 300]].map(([a, b]) => `<div class="row between"><span>${a}</span><b style="color:var(--accent)">+${b}</b></div>`).join('')}</div>
    <p class="muted mt small">Pontos de treino somam sozinhos. Nada de mandar print.</p></div>
  <h3>Prêmios do trimestre</h3><div class="grid2">${[['Strap<br>IS Team', 900], ['Elástico<br>+ adesivo', 1200], ['Luva', 1800], ['Bag', 3000]].map(([n, v]) => `<div class="lib" style="aspect-ratio:1"><b>${n}</b><span>${v.toLocaleString('pt-BR')} pts${p.pontos >= v ? ' · pode trocar!' : ''}</span></div>`).join('')}</div>
  <p class="muted small">Pra trocar, chama o Igor no WhatsApp com o print dessa tela.</p>
  <div class="card"><h3>Histórico</h3>${log.length ? log.slice(0, 15).map(l => `<div class="row between" style="padding:6px 0;font-size:13px"><span>${nomes[l.motivo] || l.motivo}<span class="muted"> · ${fmtData(l.created_at)}</span></span><b style="color:var(--accent)">+${l.pontos}</b></div>`).join('') : '<p class="muted mt">Seu primeiro treino concluído já vale 50.</p>'}</div></div>`, 'pontos');
};

// EVOLUÇÃO -------------------------------------------------------------------------
routes.evolucao = async () => {
  const p = S.perfil; const [ev, sessoes] = await Promise.all([db.evolucao(p.id), db.minhasSessoes(p.id, 200)]);
  const first = ev[0], last = ev[ev.length - 1];
  const [u1, u2] = await Promise.all([db.fotoUrl(first?.foto_path), db.fotoUrl(last?.foto_path)]);
  const meses = {}; sessoes.forEach(s => { const k = s.finalizada_em.slice(0, 7); meses[k] = (meses[k] || 0) + 1; });
  const ks = Object.keys(meses).sort().slice(-4); const mx = Math.max(1, ...ks.map(k => meses[k]));
  render(`<div class="view fx"><div class="topbar"><h2>Minha evolução</h2></div>
  <div class="grid2"><div class="photo" style="${u1 ? `background-image:url(${u1})` : ''}">${u1 ? '' : 'Sua primeira foto'}</div><div class="photo" style="${u2 && last !== first ? `background-image:url(${u2})` : ''}">${u2 && last !== first ? '' : 'Foto de hoje'}</div></div>
  <div class="row between"><span class="muted small">${first ? fmtData(first.data) : ''}</span><span class="muted small">${last && last !== first ? fmtData(last.data) : ''}</span></div>
  <button class="btn ghost sm" id="add" style="align-self:flex-start">+ Registro do mês (+80 pts)</button>
  <div class="grid2"><div class="card"><h3>Peso</h3><div class="big" style="margin-top:4px">${last?.peso_kg ?? '–'}<small>kg</small></div><p class="muted">${first?.peso_kg && last?.peso_kg && first !== last ? `${(last.peso_kg - first.peso_kg).toFixed(1)} kg desde ${fmtData(first.data)}` : 'registra pra acompanhar'}</p></div>
  <div class="card"><h3>Cintura</h3><div class="big" style="margin-top:4px">${last?.cintura_cm ?? '–'}<small>cm</small></div><p class="muted">${first?.cintura_cm && last?.cintura_cm && first !== last ? `${(last.cintura_cm - first.cintura_cm).toFixed(0)} cm desde ${fmtData(first.data)}` : ''}</p></div></div>
  <div class="card"><h3>Treinos por mês</h3><div class="row" style="align-items:flex-end;gap:10px;height:90px;margin-top:8px">${ks.length ? ks.map(k => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end"><div style="width:100%;height:${meses[k] / mx * 70}px;background:var(--accent);border-radius:6px"></div><span class="muted small">${new Date(k + '-15').toLocaleDateString('pt-BR', { month: 'short' })} ${meses[k]}</span></div>`).join('') : '<p class="muted">Seu primeiro treino aparece aqui.</p>'}</div></div></div>`, 'evolucao');
  $('#add').onclick = () => {
    overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>Registro do mês</h2>
      <div class="grid2"><div class="field"><label class="l" for="pk">Peso (kg)</label><input class="input" id="pk" inputmode="decimal" value="${last?.peso_kg ?? ''}"></div><div class="field"><label class="l" for="ci">Cintura (cm)</label><input class="input" id="ci" inputmode="decimal" value="${last?.cintura_cm ?? ''}"></div></div>
      <div class="field"><label class="l" for="ft">Foto (só você e o Igor veem)</label><input class="input" id="ft" type="file" accept="image/*" capture="environment"></div>
      <div class="row"><button class="btn ghost sm" id="c" style="flex:1">Cancelar</button><button class="btn sm" id="s" style="flex:1">Salvar</button></div></div></div>`);
    $('#c').onclick = closeOverlay;
    $('#s').onclick = async () => { $('#s').disabled = true; try { const f = $('#ft').files[0]; const file = f ? await comprimir(f) : null; await db.salvarEvolucao(p.id, { data: new Date().toISOString().slice(0, 10), peso_kg: +$('#pk').value.replace(',', '.') || null, cintura_cm: +$('#ci').value.replace(',', '.') || null }, file); if (file) await db.registrarPontos(p.id, 'evolucao', 80, new Date().toISOString().slice(0, 7)).catch(() => {}); closeOverlay(); toast('Registrado!'); go('evolucao'); } catch (er) { toast('Não deu: ' + er.message, true); $('#s').disabled = false; } };
  };
};
async function comprimir(file) {
  const img = await createImageBitmap(file); const max = 1080; const r = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = img.width * r; c.height = img.height * r; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(new File([b], 'foto.jpg', { type: 'image/jpeg' })), 'image/jpeg', .8));
}

// PERFIL ----------------------------------------------------------------------------
routes.perfil = async () => {
  const p = await db.perfil(); S.perfil = p; const sessoes = await db.minhasSessoes(p.id, 10);
  const resp = sessoes.filter(s => s.resposta_igor);
  render(`<div class="view fx"><div class="topbar"><h2>Perfil</h2>${p.role === 'admin' ? '<button class="pill on" data-go="admin">Painel do Igor</button>' : ''}</div>
  <div class="card row" style="gap:12px"><div style="width:52px;height:52px;border-radius:50%;background:var(--accent);display:grid;place-items:center;font-family:var(--display);font-size:22px;font-weight:800;color:var(--accent-ink)">${esc((p.nome || '?')[0].toUpperCase())}</div><div><b style="font-size:16px">${esc(p.nome)}</b><p class="muted">No time desde ${new Date(p.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })} · ${p.pontos} pts</p></div></div>
  <div class="card"><div class="row between"><b style="font-size:14px">Minha anamnese</b><button class="back" style="color:var(--accent)" id="ed">editar</button></div><p class="muted">${esc([p.objetivo, p.dias_semana ? p.dias_semana + 'x/semana' : null, p.local_treino, p.limitacoes ? 'atenção: ' + p.limitacoes : null].filter(Boolean).join(' · ') || 'preencha pro Igor montar seu treino')}</p></div>
  <div class="card"><div class="row between"><b style="font-size:14px">Respostas do Igor</b>${resp.length ? `<span class="pill on">${resp.length}</span>` : ''}</div>${resp.length ? resp.slice(0, 3).map(s => `<p class="muted mt">"${esc(s.resposta_igor)}" · ${fmtData(s.finalizada_em)}</p>`).join('') : '<p class="muted">Quando você mandar feedback no fim do treino, ele responde aqui.</p>'}</div>
  <div class="card"><div class="row between"><b style="font-size:14px">Indique uma amiga</b><b style="color:var(--accent)">+300 pts</b></div><p class="muted">Seu código: <b style="color:var(--fg)">${esc(p.cod_indicacao || '')}</b>. Ela coloca no cadastro e vocês duas ganham.</p></div>
  <div class="card"><div class="row between"><b style="font-size:14px">Lembretes</b><button class="pill" id="notif">ativar</button></div><p class="muted">Aviso leve se ficar 3 dias sem treinar. No iPhone, adiciona o app à tela inicial primeiro.</p></div>
  <div class="card"><div class="row between"><b style="font-size:14px">Senha</b><button class="back" style="color:var(--accent)" id="pw">trocar</button></div><p class="muted">Se ainda é o seu número de WhatsApp, troca aqui.</p></div>
  <div class="row"><a class="btn ghost sm" style="flex:1" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}" target="_blank" rel="noopener">Falar com o Igor</a><button class="btn ghost sm" style="flex:1" id="out">Sair</button></div></div>`, 'perfil');
  $('#out').onclick = async () => { await db.logout(); S.perfil = null; go('entrada'); };
  $('#notif').onclick = async () => { if (!('Notification' in window)) return toast('Seu navegador não suporta. No iPhone: Compartilhar → Adicionar à Tela de Início.', true); const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Lembretes ligados ✓' : 'Sem permissão. Dá pra ligar nos ajustes do celular.'); };
  $('#pw').onclick = () => { overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>Nova senha</h2><input class="input" id="n1" type="password" placeholder="mínimo 6 caracteres" autocomplete="new-password"><div class="row"><button class="btn ghost sm" id="c" style="flex:1">Cancelar</button><button class="btn sm" id="s" style="flex:1">Salvar</button></div></div></div>`); $('#c').onclick = closeOverlay; $('#s').onclick = async () => { try { await db.trocarSenha($('#n1').value); closeOverlay(); toast('Senha trocada ✓'); } catch (e) { toast(e.message, true); } }; };
  $('#ed').onclick = () => anamneseForm(p, () => go('perfil'));
};
function anamneseForm(p, done, titulo = 'Minha anamnese') {
  const opt = (arr, v) => arr.map(a => `<button type="button" class="pill ${a === v ? 'on' : ''}" data-v="${a}">${a}</button>`).join('');
  overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px;margin-top:20px"><h2>${titulo}</h2>
    <div><label class="l">Objetivo</label><div class="row wrap" id="ob" style="gap:6px">${opt(['Emagrecer', 'Ganhar massa', 'Os dois', 'Correr melhor'], p.objetivo)}</div></div>
    <div><label class="l">Dias por semana</label><div class="row" id="ds" style="gap:6px">${opt(['3', '4', '5', '6'], String(p.dias_semana || 4))}</div></div>
    <div><label class="l">Onde treina</label><div class="row" id="lc" style="gap:6px">${opt(['academia', 'casa'], p.local_treino || 'academia')}</div></div>
    <div class="field"><label class="l" for="lm">Dor, lesão ou limitação?</label><input class="input" id="lm" value="${esc(p.limitacoes || '')}" placeholder="ex. lombar, joelho direito..."></div>
    <div class="grid2"><div class="field"><label class="l" for="pk">Peso (kg)</label><input class="input" id="pk" inputmode="decimal" value="${p.peso_kg ?? ''}"></div><div class="field"><label class="l" for="al">Altura (m)</label><input class="input" id="al" inputmode="decimal" value="${p.altura_m ?? ''}"></div></div>
    <div class="field"><label class="l" for="wa">WhatsApp</label><input class="input" id="wa" inputmode="tel" value="${esc(p.whatsapp || '')}"></div>
    <div class="row"><button class="btn ghost sm" id="c" style="flex:1">Cancelar</button><button class="btn sm" id="s" style="flex:1">Salvar</button></div></div></div>`);
  $$('#ob,#ds,#lc').forEach(g => g.onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('button', g).forEach(x => x.classList.remove('on')); b.classList.add('on'); });
  $('#c').onclick = closeOverlay;
  $('#s').onclick = async () => { try { await db.salvarPerfil({ objetivo: $('#ob .on')?.dataset.v, dias_semana: +$('#ds .on')?.dataset.v || 4, local_treino: $('#lc .on')?.dataset.v, limitacoes: $('#lm').value || null, peso_kg: +$('#pk').value.replace(',', '.') || null, altura_m: +$('#al').value.replace(',', '.') || null, whatsapp: $('#wa').value || null }); closeOverlay(); toast('Salvo ✓'); done(); } catch (e) { toast(e.message, true); } };
}

routes.admin = () => adminView(S, { render, go, anamneseForm, db });

// BOOT ------------------------------------------------------------------------
async function boot() {
  if (!(C0.DEMO || new URLSearchParams(location.search).has('demo')) && (!C.SUPABASE_URL || C.SUPABASE_URL.includes('SEU-PROJETO'))) return render(`<div class="view noTabs"><div class="logo big" style="margin-top:40px">IGOR<br>SOUSA <b>TEAM</b></div><div class="card"><b>Falta ligar o banco.</b><p class="muted">Preencha js/config.js com a URL e a anon key do projeto Supabase. O passo a passo está no README.</p></div></div>`);
  S.user = await db.sessionUser();
  if (!S.user) return go('entrada');
  S.perfil = await db.perfil();
  if (!S.perfil) { render(`<div class="view noTabs"><h2>Conta sem perfil</h2><p class="muted">Chama o Igor no WhatsApp pra liberar seu acesso.</p><button class="btn ghost" id="o">Sair</button></div>`); $('#o').onclick = async () => { await db.logout(); go('entrada'); }; return; }
  if (!S.perfil.ativa && S.perfil.role !== 'admin') { render(`<div class="view noTabs"><h2>Acesso pausado</h2><p class="muted">Sua assinatura tá pausada. Renovou? É só me chamar que libero na hora.</p><a class="btn" href="https://wa.me/${esc(C.WHATSAPP_IGOR)}">Falar com o Igor</a><button class="btn ghost" id="o">Sair</button></div>`); $('#o').onclick = async () => { await db.logout(); go('entrada'); }; return; }
  sincronizarFila();
  if (S.perfil.role === 'admin') return go('admin');
  if (!S.perfil.objetivo) { anamneseForm(S.perfil, () => go('home'), 'Me conta de você'); }
  go('home');
}
window.addEventListener('online', sincronizarFila);
db.sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') { overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>Cria sua nova senha</h2><input class="input" id="n1" type="password" placeholder="mínimo 6 caracteres"><button class="btn sm" id="s">Salvar</button></div></div>`); $('#s').onclick = async () => { try { await db.trocarSenha($('#n1').value); closeOverlay(); toast('Senha criada ✓'); boot(); } catch (e) { toast(e.message, true); } }; } });
boot();
