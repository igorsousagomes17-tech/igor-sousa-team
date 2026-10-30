// Helpers de interface
import { t, tp, dataLocal, idioma , tc } from './i18n.js';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let tt, ttEm = 0;
// Aviso embaixo (não cobre o título), fica mais tempo e fecha com um toque.
// fixo: fica até ela tocar (ex.: "descanso acabou há 2 min" quando ela volta pro app).
export function toast(msg, err = false, { fixo = false, curto = false } = {}) {
  const t = $('#toast'); t.textContent = msg; ttEm = Date.now(); t.className = 'toast on' + ($('#overlay')?.innerHTML && fixo ? ' atras' : '') + (err ? ' err' : '') + (fixo ? ' fixo' : '') + (location.hash === '#fim' || location.hash === '#sessao' || $('#overlay')?.innerHTML ? ' topo' : '') + (location.hash === '#sessao' && !$('#overlay')?.innerHTML ? ' sess' : ''); // na sessão: abaixo do "‹ Pausar" e do relógio // no feedback do fim e com pop-up aberto fica em cima (não cobre o "Enviar" nem o "Fechar")
  t.onclick = () => t.classList.remove('on');
  clearTimeout(tt); if (!fixo) tt = setTimeout(() => t.classList.remove('on'), err ? 6500 : curto ? 2500 : 4500);
}
// Troca de tela ou descanso abrindo: o aviso antigo some (não fica cobrindo a tela nova)
// (aviso de menos de 0,7 s fica: "Treino pausado" logo antes de trocar de tela precisa aparecer)
export function fecharToast(todos = false) { const t = $('#toast'); if (t && (todos || (!t.classList.contains('fixo') && Date.now() - ttEm > 700) || (t.classList.contains('fixo') && Date.now() - ttEm > 4000))) t.classList.remove('on'); } // fixo antigo ("olha no spam") também some na troca de tela
// Texto do aviso que acabou de aparecer (pra juntar dois avisos em vez de um apagar o outro)
// Aviso que ainda está na tela (fixo, ou curto que acabou de aparecer): quem vem depois junta em vez de apagar
export const avisoAtual = () => { const t = $('#toast'); if (!t || !t.classList.contains('on')) return null; const fixo = t.classList.contains('fixo'); return fixo || Date.now() - ttEm < 4000 ? { txt: t.textContent, fixo } : null; };
const avisoRecente = () => { const t = $('#toast'); return t && t.classList.contains('on') && Date.now() - ttEm < 1500 ? t.textContent : ''; };
// Exercício sem peso (peso do corpo, elástico, mobilidade): esconde a coluna de kg (vale no app e no PDF).
// Ela também pode marcar "sem peso" num exercício (treino em casa sem halter): fica guardado no celular.
const semPesoDela = () => { try { return JSON.parse(localStorage.getItem('semPeso') || '[]'); } catch { return []; } };
export const semCarga = e => e.carga === false || semPesoDela().includes(e.nome) || /prancha|dead ?bug|gato|abdominal|abs |mini ?band|alongamento|mobilidade|cossaco|polichinelo|burpee|90\/90|ponte|hiit|cardio/i.test(e.nome || '');
export function marcarSemPeso(nome, sem) { const l = semPesoDela().filter(x => x !== nome); if (sem) l.push(nome); try { localStorage.setItem('semPeso', JSON.stringify(l.slice(-80))); } catch {} }
export const semPesoMarcado = nome => semPesoDela().includes(nome);

export function overlay(html) { const o = $('#overlay'), t = $('#toast'); o.innerHTML = html; if (t?.classList.contains('fixo') && t.classList.contains('on')) t.classList.add('atras'); else t?.classList.add('topo'); return o; } // aviso fixo fica atrás do pop-up (não cobre o título) e volta quando ele fecha // aviso aberto sobe pro topo: não fica em cima dos botões do pop-up
export function closeOverlay() { $('#overlay').innerHTML = ''; $('#toast')?.classList.remove('atras'); }
// Mostrar/ocultar senha: qualquer botão .olho ao lado de um input de senha
document.addEventListener('click', e => { const b = e.target.closest('.olho'); if (!b) return; e.preventDefault(); const i = b.parentElement.querySelector('input'); const ver = i.type === 'password'; i.type = ver ? 'text' : 'password'; b.textContent = ver ? t('ocultar') : t('mostrar'); });
export const campoSenha = (id, ph = '', ac = 'new-password') => `<div class="senha"><input class="input" id="${id}" type="password" autocomplete="${ac}" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="${ph}"><button type="button" class="olho">${t('mostrar')}</button></div>`;
// Erros do servidor em português
export function traduzErro(e) {
  const m = String(e?.message || e || '');
  if (/at least 6|should be at least/i.test(m)) return t('A senha precisa ter pelo menos 6 caracteres.');
  if (/different from the old|same as/i.test(m)) return t('A senha nova precisa ser diferente da atual.');
  if (/fetch|network|Failed|timeout|offline/i.test(m)) return t('Sem internet agora. Tenta de novo quando o sinal voltar.');
  if (/invalid login|credentials/i.test(m)) return t('E-mail ou senha não conferem.');
  if (/expired|jwt/i.test(m)) return t('Sua sessão expirou. Sai e entra de novo.');
  const geral = t('Não deu certo agora. Tenta de novo ou chama o Igor no WhatsApp.');
  if (!m || !/[ãçéíóú]/i.test(m)) return geral;
  return idioma() === 'pt' ? m : (t(m) !== m ? t(m) : geral); // mensagem em português do servidor: traduz se conhecida
}

export const fmtMin = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
// Só a 1ª letra maiúscula ("Sábado, 24 de out.", sem "De")
export const hoje = () => { const d = dataLocal(Date.now(), { weekday: 'long', day: 'numeric', month: 'short' }); return d.charAt(0).toUpperCase() + d.slice(1); };
export const primeiroNome = n => (n || '').trim().split(' ')[0];
// Data só (AAAA-MM-DD) é lida como meio-dia local, pra não voltar um dia no fuso do Brasil.
export const fmtData = d => d ? dataLocal(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00' : d, { day: 'numeric', month: 'short' }) : '';

const redeFraca = () => { const c = navigator.connection; return !!(c && (c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || ''))); };
export function youtubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  if (!m) return null;
  return redeFraca() ? `https://www.youtube-nocookie.com/embed/${m[1]}?playsinline=1&modestbranding=1&rel=0` // economia de dados: só toca quando ela der play, sem repetir
    : `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&playsinline=1${navigator.connection ? `&loop=1&playlist=${m[1]}` : ''}&controls=1&modestbranding=1&rel=0`; // com controle pra pausar; sem saber a rede (iPhone), não fica repetindo e gastando dados
}

export function videoModal(nome, url, dica) {
  const yt = youtubeEmbed(url);
  if (url && navigator.onLine === false) { // sem sinal: explica e mostra a dica, em vez da tela cinza do navegador
    overlay(`<div class="modal" id="vm"><div class="box" style="padding:20px;display:flex;flex-direction:column;gap:12px"><span class="pill" style="align-self:flex-start">📶 ${t('sem internet')}</span><h2>${esc(tc(nome))}</h2><p>${t('O vídeo precisa de sinal. Assim que a internet voltar, toca de novo.')}</p>
      ${dica ? `<div class="card" style="background:#101012"><b style="font-size:0.875rem;color:var(--accent)">${t('DICA DO IGOR')}</b><p style="margin-top:4px;font-size:1rem;line-height:1.4">${esc(tc(dica))}</p></div>` : ''}<button class="btn sm" id="vm-close">${t('Entendi')}</button></div></div>`);
    $('#vm-close').onclick = closeOverlay; $('#vm').addEventListener('click', e => { if (e.target.id === 'vm') closeOverlay(); });
    return;
  }
  const inner = yt ? `<iframe src="${yt}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
    : url ? `<video src="${esc(url)}" ${redeFraca() ? 'preload="none"' : navigator.connection ? 'autoplay loop' : 'autoplay'} muted playsinline controls></video>`
    : null;
  const o = overlay(inner ? `<div class="modal" id="vm"><div class="box"><div class="area">${inner}</div>
    <div class="row between" style="padding:10px 14px"><span class="muted small">${esc(dica || nome)}</span><button class="back" style="color:var(--accent)" id="vm-close">${t('Fechar')}</button></div></div></div>`
    : `<div class="modal" id="vm"><div class="box" style="padding:20px;display:flex;flex-direction:column;gap:12px"><span class="pill" style="align-self:flex-start">🎬 ${t('vídeo em gravação')}</span><h2>${esc(tc(nome))}</h2>
      ${dica ? `<div class="card" style="background:#101012"><b style="font-size:0.875rem;color:var(--accent)">${t('DICA DO IGOR')}</b><p style="margin-top:4px;font-size:1rem;line-height:1.4">${esc(tc(dica))}</p></div>` : ''}
      <p class="muted small">${t('O Igor tá gravando os vídeos de todos os exercícios. Ficou com dúvida na execução?')}</p><button class="btn sm" data-duvida="${esc(nome)}">? ${t('Tirar dúvida da execução com a IA')}</button><a class="btn ghost sm" href="https://wa.me/${esc(window.ISTEAM_CONFIG?.WHATSAPP_IGOR || '')}" target="_blank" rel="noopener">${t('Chamar o Igor no WhatsApp')}</a><button class="link-fim" id="vm-close" style="margin-top:0">${t('Fechar')}</button></div></div>`);
  $('#vm-close').onclick = closeOverlay;
  $('#vm').addEventListener('click', e => { if (e.target.id === 'vm') closeOverlay(); });
}

// Apito: um só AudioContext (celular fraco não fica sem som depois de 40 apitos).
// 'fim' = dois tons (descanso/série acabou) · 'forte' = três agudos curtos · 'leve' = um grave longo
let ac = null;
// Fim do descanso: 2 rajadas de 3 bipes bem audíveis + vibração longa. "tic" = contagem 3-2-1.
const SONS = { fim: [[880, 0, .14], [880, .2, .14], [1320, .4, .32], [880, .95, .14], [880, 1.15, .14], [1320, 1.35, .4]], forte: [[1200, 0, .1], [1200, .15, .1], [1200, .3, .1]], leve: [[440, 0, .6]], tic: [[990, 0, .09]] };
const VIBRA = { fim: [350, 120, 350, 120, 600], forte: [80, 60, 80, 60, 80], leve: [400], tic: [60] };
const VOLUME = { fim: .5, forte: .35, leve: .3, tic: .28 };
// O navegador só libera som depois de um toque na tela: o som é "destravado" no primeiro toque,
// senão o alarme do descanso (que toca sem ninguém tocar) saía mudo no celular.
function destravarSom() {
  try {
    try { if (navigator.audioSession) navigator.audioSession.type = 'transient'; } catch {} // iPhone: abaixa a música um instante e toca o alarme
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
    if (ac.state === 'running') ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.removeEventListener(ev, destravarSom, true));
  } catch {}
}
['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, destravarSom, true));
export function beep(tipo = 'fim') {
  try { if (navigator.vibrate) navigator.vibrate(VIBRA[tipo] || VIBRA.fim); } catch {}
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
    const g = ac.createGain(); g.gain.value = VOLUME[tipo] ?? .4; g.connect(ac.destination);
    (SONS[tipo] || SONS.fim).forEach(([f, t, d]) => { const o = ac.createOscillator(); o.type = 'square'; const e = ac.createGain(); e.gain.setValueAtTime(0, ac.currentTime + t); e.gain.linearRampToValueAtTime(.6, ac.currentTime + t + .01); e.gain.setValueAtTime(.6, ac.currentTime + t + d - .02); e.gain.linearRampToValueAtTime(0, ac.currentTime + t + d); o.frequency.value = f; o.connect(e); e.connect(g); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + d + .02); });
  } catch {}
}

// Pede permissão de notificação uma vez, no 1º descanso (o toque dela no ⏱ conta como gesto).
// Alarme pelo servidor (o app liga em app.js): { agendar({id,em,titulo,corpo}) -> Promise<bool>, cancelar(id), inscrever() }
let remoto = null; export const ligarAvisoRemoto = r => { remoto = r; };
function pedirAviso() {
  try {
    if (!('Notification' in window) || Notification.permission !== 'default' || localStorage.getItem('avisoPedido')) return;
    localStorage.setItem('avisoPedido', '1');
    Notification.requestPermission().then(r => { if (r === 'granted') { remoto?.inscrever?.(); } if (r === 'granted') toast(t('Pronto: te aviso quando o descanso acabar, mesmo com a tela apagada.')); });
  } catch {}
}
// Timer em tela cheia (descanso ou exercício de tempo). Conta pelo horário de término, então não atrasa
// se o celular segurar a tela. "Anotar" encolhe pra uma barra no rodapé pra registrar carga sem parar o tempo.
// Só existe UM timer por vez (abrir outro encerra o anterior) e ele mora numa camada própria, então
// pop-ups (histórico, vídeo) não matam o descanso. Resolve true (acabou), false (pulou/cancelado) ou null
// (fechou sem fazer, só no tempo de exercício). meio:true = "cada lado": apita na metade pra trocar de lado.
let restAtivo = null;
// Toque duplo no celular lento: o 2º toque não pode cair no "+15s" (logo que o cronômetro abre) nem no campo de kg
// (logo que ele fecha). Conta pelo horário do próprio toque (não pelo relógio da página).
let ultimoClique = -1e9, fechouEm = -1e9;
const segura = e => { if (e.timeStamp - fechouEm < 250 && !e.target.closest?.('#rest-layer')) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); return true; } return false; };
document.addEventListener('click', e => { if (!segura(e)) ultimoClique = e.timeStamp; }, true);
['mousedown', 'touchstart'].forEach(ev => document.addEventListener(ev, segura, { capture: true, passive: false }));
// Descanso que acabou com o app escondido: quando ela volta, um aviso fixo diz há quanto tempo acabou.
function avisoNaVolta(fim, trabalho = false) {
  const mostra = () => { if (document.hidden) return; document.removeEventListener('visibilitychange', mostra); const m = Math.round((Date.now() - fim) / 60000); const x = trabalho ? (m >= 1 ? t('O cronômetro acabou há {n} min · série marcada ✓', { n: m }) : t('Tempo! Série feita ✓')) : m >= 1 ? t('Descanso acabou há {n} min · bora a próxima série', { n: m }) : t('Descanso acabou. Bora a próxima!'), a = avisoRecente(); toast(a && a !== x ? a + ' · ' + x : x, false, { fixo: true }); };
  if (document.hidden) document.addEventListener('visibilitychange', mostra); else mostra();
}
const trouxe = x => t(x === "Bora!" ? "Tempo" : x);
export const descansoAtivo = () => !!restAtivo;
// Horário em que acaba o exercício de tempo rodando (cardio, prancha), pra não descontar esse tempo como "fora do app"
export const trabalhoFim = () => restAtivo?.trabalho ? restAtivo.fim() : null;
// Pausou o treino com o cronômetro de exercício rodando: congela (não registra a série); no Continuar ele volta pausado
export function congelarTrabalho() { if (!restAtivo?.trabalho) return null; const f = restAtivo.feito(); restAtivo.end('congelado'); return f; }
// Abre o cronômetro minimizado (tocou de novo no ▶ do cardio que já está rodando: não recomeça)
export function abrirTimer() { if (restAtivo?.mini) restAtivo.abrir(); }
// Saiu do treino com o cardio rodando: registra os minutos feitos (não joga fora)
export function encerrarTrabalho() { if (restAtivo?.trabalho) { restAtivo.parcial(true); return true; } return false; }
export function pararDescanso() { if (restAtivo) restAtivo.end(false); }
export function minimizarDescanso() { if (restAtivo && !restAtivo.mini) { restAtivo.minimizar(); return true; } return false; }
function camada() { let l = document.getElementById('rest-layer'); if (!l) { l = document.createElement('div'); l.id = 'rest-layer'; document.body.appendChild(l); } return l; }
// intervalos [forte, leve] (ex.: HIIT 30s forte / 30s leve): troca o rótulo e apita a cada troca.
// No exercício de tempo, "Já fiz" antes do fim resolve { parcial: segundos feitos }.
// jaFeito: segundos que já tinham passado (recarregou o app no meio do cardio: continua de onde estava)

// Cronômetro do descanso fora do app (tipo o Spotify): o Android mostra uma "mídia" com a barra andando quando o app vai pro segundo plano.
// Um áudio mudo em loop segura a sessão de mídia; título e barra são atualizados a cada tick.
export const chipDescanso = (() => {
  let au = null, ativo = false, ult = '', sil = null;
  const wav = () => { const n = 8000, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, x) => [...x].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0))); w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true); return URL.createObjectURL(new Blob([b], { type: 'audio/wav' })); };
  return {
    suportado: () => 'mediaSession' in navigator && typeof Audio !== 'undefined',
    atualiza(resta, total, rotulo, sub) {
      if (!this.suportado() || localStorage.getItem('chip_off') === '1') return;
      try {
        if (!ativo) { sil = sil || wav(); au = au || Object.assign(new Audio(sil), { loop: true, volume: 0.01 }); au.play().then(() => { ativo = true; }).catch(() => {}); ativo = true; navigator.mediaSession.playbackState = 'playing'; ['play', 'pause', 'stop'].forEach(a => { try { navigator.mediaSession.setActionHandler(a, () => { try { au.play(); } catch {} }); } catch {} }); }
        const m = Math.floor(resta / 60), sg = String(resta % 60).padStart(2, '0'), titulo = `${rotulo} · ${m}:${sg}`;
        if (titulo !== ult) { ult = titulo; navigator.mediaSession.metadata = new MediaMetadata({ title: titulo, artist: sub || 'Igor Sousa Team', album: 'Treino', artwork: [{ src: new URL('./icons/icon-192.png', location.href).href, sizes: '192x192', type: 'image/png' }] }); }
        navigator.mediaSession.setPositionState({ duration: Math.max(1, total), position: Math.min(total, Math.max(0, total - resta)), playbackRate: 1 });
      } catch {}
    },
    // Acabou com o app em segundo plano: apita pelo próprio áudio da mídia (o AudioContext da página dorme com a tela apagada)
    alarme() {
      if (!ativo || !au) return false;
      try {
        const sr = 16000, n = Math.floor(sr * 1.9), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, x) => [...x].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
        w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
        for (let i = 0; i < n; i++) { const t = i / sr, k = t % 0.6, on = k < 0.3 && t < 1.8; v.setInt16(44 + i * 2, on ? Math.sin(2 * Math.PI * (k < 0.15 ? 880 : 1175) * t) * 0.8 * 32767 * Math.min(1, k * 60, (0.3 - k) * 60) : 0, true); }
        au.loop = false; au.volume = 1; au.src = URL.createObjectURL(new Blob([b], { type: 'audio/wav' })); au.onended = () => { au.onended = null; au.loop = true; au.volume = 0.01; au.src = sil; this.para(); }; au.play().catch(() => this.para());
        try { navigator.vibrate?.([350, 120, 350, 120, 600]); } catch {}
        return true;
      } catch { return false; }
    },
    para() { if (!ativo) return; ativo = false; ult = ''; try { au?.pause(); navigator.mediaSession.playbackState = 'none'; navigator.mediaSession.metadata = null; } catch {} }
  };
})();
export function restTimer(segundos, proximo, titulo = 'Descanso', { meio = false, aoMudar, aoMinimizar, intervalos = null, jaFeito = 0, pausadoIni = false, pausarTreino = null } = {}) {
  pararDescanso();
  return new Promise(resolve => {
    let total = segundos + jaFeito, fim = Date.now() + segundos * 1000, iv, trocou = jaFeito > total / 2;
    const trabalho = titulo !== 'Descanso', L = camada();
    // próximo: texto (como antes) ou { tipo: 'exercicio'|'serie', nome, titulo, detalhe, dica, texto }; o texto simples vai pro chip e pro aviso
    const px = proximo && typeof proximo === 'object' ? proximo : null, pxTxt = px ? (px.texto || px.titulo || px.nome || '') : String(proximo || '');
    const cartao = !px ? `<p class="muted center" id="rest-p">${esc(pxTxt)}</p>` : px.tipo === 'exercicio'
      ? `<div class="prox ex" id="rest-p"><span class="prox-l">${t('Próximo exercício')}</span><b class="prox-n">${esc(px.nome || '')}</b>${px.detalhe ? `<span class="prox-d">${esc(px.detalhe)}</span>` : ''}${px.dica ? `<span class="prox-t">⚡ ${esc(px.dica)}</span>` : ''}</div>`
      : `<div class="prox" id="rest-p"><b>${esc(px.titulo || px.nome || '')}</b>${px.detalhe ? `<span class="prox-d">${esc(px.detalhe)}</span>` : ''}</div>`; // Igor (30/10): o "Próximo" era uma linha cinza que ninguém via
    const me = { mini: false, trabalho, fim: () => pausado ? null : fim }; let fase = -1, pausado = 0; // pausado: o cronômetro parado não conta como tempo de treino rodando
    L.innerHTML = `<div class="ov" id="rest">
      <button class="back x" id="rest-x" aria-label="${trabalho ? t('minimizar') : t('Minimizar pra anotar')}">${trabalho ? '▾ ' + t('minimizar') : '✎ ' + t('anotar')}</button>
      <p class="muted ${intervalos ? 'fase' : ''}" id="rest-t" style="letter-spacing:1px;text-transform:uppercase">${meio ? (trocou ? t('Lado 2 de 2') : t('Lado 1 de 2')) : esc(t(titulo))}</p>
      <div class="ring" id="ring"><b id="rest-n"></b></div>
      ${cartao}
      <div class="row">${trabalho ? `<button class="btn sm" id="rest-skip" style="flex:2">✓ ${t('Já fiz')}</button><button class="btn ghost sm" id="rest-pausa" style="flex:1">⏸ ${t('Parar')}</button><button class="btn ghost sm" id="rest-add" style="flex:1">+15s</button>` : `<button class="btn sm" id="rest-skip" style="flex:2">${t('Pular descanso')}</button><button class="btn ghost sm" id="rest-menos" style="flex:1" aria-label="${t('Tirar 15 segundos')}">−15s</button><button class="btn ghost sm" id="rest-add" style="flex:1" aria-label="${t('Mais 15 segundos')}">+15s</button>`}</div>${pausarTreino ? `<button class="link-fim" id="rest-pt">⏸ ${t('Pausar treino')}</button>` : ''}</div>`; // "Parar" = só a contagem; "Pausar treino" = o treino todo (antes eram 3 "Pausar") // criança chamou no meio do descanso: pausa daqui mesmo
    const q = s => L.querySelector(s);
    let idRemoto = null; // alarme no servidor: garante tocar/vibrar no iPhone com a tela apagada
    const avisar = () => { try { if (remoto) { if (idRemoto) remoto.cancelar(idRemoto); idRemoto = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); remoto.agendar({ id: idRemoto, em: fim + 1500, titulo: trabalho ? t('Tempo! ⏱') : t('Descanso acabou! 💪'), corpo: trabalho ? t('Série feita, volta pro app.') : (pxTxt || t('Bora a próxima série.')) }).catch(() => {}); } } catch {} try { navigator.serviceWorker?.controller?.postMessage({ tipo: 'agendar', em: fim, titulo: trabalho ? t('Tempo! ⏱') : t('Descanso acabou! 💪'), corpo: trabalho ? t('Série feita, volta pro app.') : (pxTxt || t('Bora a próxima série.')) }); } catch {} };
    const cancelarAviso = (acabou = false) => { try { navigator.serviceWorker?.controller?.postMessage({ tipo: 'cancelar' }); } catch {} if (idRemoto && !acabou) { try { remoto?.cancelar(idRemoto); } catch {} } idRemoto = null; };
    pedirAviso(); avisar(); fecharToast();
    if (pausarTreino) q('#rest-pt').onclick = () => pausarTreino();
    const left = () => Math.max(0, Math.ceil((fim - (pausado || Date.now())) / 1000)); // parado no ⏸: o tempo que falta não cai
    me.feito = () => total - left();
    // "1 min cada lado": mostra o tempo do lado (1:00 → 0:00 e de novo 1:00 → 0:00), não o total
    const doLado = l => meio ? (l > total / 2 ? l - Math.floor(total / 2) : l) : l, base = l => meio ? total / 2 : total;
    const rotulo = () => meio ? (trocou ? t('Lado 2 de 2') : t('Lado 1 de 2')) : t(titulo);
    const tick = () => {
      if (pausado) return; const l = left(), n = q('#rest-n'); if (!n) return;
      if (meio && !trocou && l <= total / 2 && l > 0) { trocou = true; beep(); q('#rest-t').textContent = t('Lado 2 de 2 · troca de lado!'); toast(t('Troca de lado 🔄')); }
      let resta = 0; // segundos que faltam no intervalo atual (forte/leve)
      if (intervalos && l > 0) { const ciclo = intervalos[0] + intervalos[1], pos = (total - l) % ciclo, f = pos < intervalos[0] ? 0 : 1; resta = f ? ciclo - pos : intervalos[0] - pos; if (f !== fase) { if (fase !== -1) beep(f ? 'leve' : 'forte'); fase = f; q('#rest').classList.toggle('leve', !!f); } q('#rest-t').textContent = `${f ? t('Leve') : t('Forte!')} · ${resta}s`; }
      const rot = intervalos && fase >= 0 ? (fase ? t('Leve') : t('Forte!')) : trouxe(titulo);
      if (!trabalho && !intervalos && l <= 3 && l > 0 && l !== me.ultTic) { me.ultTic = l; beep('tic'); } // contagem 3-2-1 antes de acabar o descanso
      const lv = doLado(l); n.textContent = me.mini ? `${meio ? rotulo() : rot} ${fmtMin(lv)} · ${!trabalho && pxTxt ? pxTxt : t('toca pra abrir')}` : (lv >= 60 ? fmtMin(lv) : lv);
      q('#ring').style.setProperty('--p', (lv / base() * 100) + '%'); if (l > 0) chipDescanso.atualiza(lv, base(), meio ? rotulo() : rot, pxTxt.slice(0, 60)); if (l <= 0) end(true, Date.now() - fim > 30000);
    };
    // atrasado: acabou com a tela apagada (o código parado) e só agora ela voltou: aviso fixo com "há N min", sem apito
    const end = (r, atrasado = false) => { if (restAtivo !== me) return; restAtivo = null; const tocando = r === true && document.hidden && !atrasado && chipDescanso.alarme(); if (!tocando) chipDescanso.para(); cancelarAviso(r === true && (document.hidden || atrasado)); clearInterval(iv); document.removeEventListener('visibilitychange', tick); L.innerHTML = ''; if (r === true) { if (document.hidden || atrasado) avisoNaVolta(fim, trabalho); else { beep(); toast(trabalho ? t('Tempo! Série feita ✓') : t('Descanso acabou. Bora a próxima!')); } } resolve(r); };
    me.end = end;
    me.minimizar = () => { me.mini = true; q('#rest').classList.add('mini'); aoMinimizar?.(true); tick(); };
    me.abrir = () => { me.mini = false; q('#rest').classList.remove('mini'); aoMinimizar?.(false); tick(); };
    // "Já fiz" no meio: registra o que fez. Logo no começo (< 10 s): quem chamou pergunta se ela já tinha feito antes ({ cedo }).
    // saindo do treino (forcado) logo no começo: não registra nada (não inventa 20 min de cardio)
    me.parcial = (forcado = false) => { const feito = total - left(); if (left() <= 3) end(true); else if (feito >= 10) end({ parcial: feito }); else end(forcado ? null : { cedo: true }); };
    restAtivo = me;
    iv = setInterval(tick, 250); document.addEventListener('visibilitychange', tick);
    // Toque duplo (celular lento): o 2º toque que cai no cronômetro logo que ele abre não vale
    const aberto = ultimoClique, cedo = e => e.timeStamp - aberto < 350;
    q('#rest-skip').onclick = e => { e.stopPropagation(); if (cedo(e)) return; fechouEm = e.timeStamp; if (pausado) retoma(); if (!trabalho) return end(false); me.parcial(); };
    q('#rest-add').onclick = e => { e.stopPropagation(); if (cedo(e)) return; fim += 15000; total += 15; avisar(); aoMudar?.(fim); tick(); };
    // −15s: descanso mais curto, nunca abaixo de 5 s (o toque não encerra o descanso sem querer)
    if (q('#rest-menos')) q('#rest-menos').onclick = e => { e.stopPropagation(); if (cedo(e)) return; const novo = Math.max(Date.now() + 5000, fim - 15000), tira = Math.round((fim - novo) / 1000); if (tira <= 0) return; fim = novo; total = Math.max(1, total - tira); me.ultTic = null; avisar(); aoMudar?.(fim); tick(); };
    // Pausar o cronômetro de exercício (criança chamou no meio da prancha/cardio)
    const retoma = () => { fim += Date.now() - pausado; pausado = 0; avisar(); aoMudar?.(fim); iv = setInterval(tick, 250); const b = q('#rest-pausa'); if (b) b.textContent = '⏸ ' + t('Parar'); const r = q('#rest-t'); if (r && !intervalos) r.textContent = rotulo(); tick(); };
    const pausa = () => { pausado = Date.now(); clearInterval(iv); cancelarAviso(); chipDescanso.para(); const b = q('#rest-pausa'); if (b) b.textContent = '▶ ' + t('Continuar'); q('#rest-t').textContent = t('Pausado'); tick(); };
    if (q('#rest-pausa')) q('#rest-pausa').onclick = e => { e.stopPropagation(); if (cedo(e)) return; if (pausado) return retoma(); pausa(); };
    q('#rest-x').onclick = e => { e.stopPropagation(); me.minimizar(); };
    q('#rest').onclick = () => { if (me.mini) me.abrir(); };
    tick(); if (pausadoIni && trabalho) pausa();
  });
}

// Nome da aba inteiro quando cabe; nome curto (Pts, Evol.) só quando não cabe de verdade (letra grande, tela estreita)
let roAbas = null, abaPend = false;
export function ajustaAbas() { $$('.tabs .tab').forEach(b => { b.classList.remove('curto'); const l = b.querySelector('span.l'); if (l && l.scrollWidth > l.clientWidth + 1) b.classList.add('curto'); });
  // letra do celular mudou depois de abrir (zoom, fonte grande): mede de novo
  const nav = $('.tabs'); if (nav && 'ResizeObserver' in window) { roAbas?.disconnect(); roAbas = new ResizeObserver(() => { if (abaPend) return; abaPend = true; requestAnimationFrame(() => { abaPend = false; const h = nav.offsetHeight; if (h !== nav._h) { nav._h = h; ajustaAbas(); } }); }); nav._h = nav.offsetHeight; roAbas.observe(nav); } }
window.addEventListener('resize', () => ajustaAbas()); try { document.fonts?.ready.then(() => ajustaAbas()); } catch {}
export function tabs(active) {
  const abas = [['home', 'Início', 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'], ['treino', 'Treino', 'M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12'],
    ['videos', 'Vídeos', 'M4 5h16v14H4zM10 9l5 3-5 3z'],
    ['pontos', 'Pontos', 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z'], ['evolucao', 'Evolução', 'M4 19V5M4 19h16M7 15l4-5 3 3 5-7'],
    ['perfil', 'Perfil', 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21a8 8 0 0 1 16 0']];
  return `<nav class="tabs">${abas.map(([id, l, d]) => `<button class="tab ${active === id ? 'on' : ''}" data-go="${id}" aria-label="${t(l)}"><svg viewBox="0 0 24 24"><path d="${d}"/></svg><span class="l">${t(l)}</span><span class="c">${t({ Pontos: 'Pts', 'Evolução': 'Evol.' }[l] || l)}</span></button>`).join('')}</nav>`;
}

// Card compartilhável → imagem PNG (canvas) → Web Share ou download
export async function cardImagem({ nome, titulo, minutos, exercicios, series, streak, data, insta, completo = true, total = 0, destaque = '', rotulo = '', stat2 = null, transparente = false, modo = 'compartilhar' }) {
  // a letra da marca precisa estar carregada antes de desenhar (senão o story sai com outra fonte)
  try { await Promise.race([Promise.all(['800 54px "Barlow Condensed"', '500 30px Barlow', '700 48px Barlow'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 1500))]); } catch {}
  // transparente: a mesma arte sem o fundo, mais compacta, pra ela colar por cima da foto dela no story (igual Strava)
  const off = transparente ? -500 : 0, W = 1080, H = transparente ? 1230 : 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), CINZA = transparente ? '#f4f2ee' : '#9a968f';
  if (transparente) { x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 22; x.shadowOffsetY = 3; } // lê bem em cima de foto clara ou escura
  else {
    x.fillStyle = '#0b0b0c'; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W - 120, 120, 20, W - 120, 120, 620); g.addColorStop(0, 'rgba(255,106,0,.55)'); g.addColorStop(1, 'rgba(255,106,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  const DISP = '"Barlow Condensed", Impact, "Noto Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans Devanagari", system-ui, sans-serif', BODY = 'Barlow, Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans Devanagari", system-ui, sans-serif';
  x.fillStyle = '#f4f2ee'; x.font = `800 54px ${DISP}`; x.fillText('IGOR SOUSA', 70, 120);
  x.fillStyle = '#ff6a00'; x.fillText('TEAM', 70 + x.measureText('IGOR SOUSA ').width, 120);
  x.fillStyle = CINZA; x.font = `500 30px ${BODY}`; x.fillText(data, W - 70 - x.measureText(data).width, 118);
  // "TREINO FEITO ✓" no idioma dela; diminui a letra se a palavra for comprida (francês, espanhol)
  const [l1, l2] = (rotulo || (exercicios === 0 || !completo ? t('TREINO|REGISTRADO') : t('TREINO|FEITO'))).split('|'); let fs = 190;
  x.font = `800 ${fs}px ${DISP}`; while (fs > 90 && Math.max(x.measureText(l1).width, x.measureText(l2 + ' ✓').width) > W - 140) { fs -= 10; x.font = `800 ${fs}px ${DISP}`; }
  if (destaque) { const dd = destaque.toUpperCase(); x.fillStyle = '#ff6a00'; let fd = 64; x.font = `800 ${fd}px ${DISP}`; while (fd > 36 && x.measureText(dd).width > W - 140) { fd -= 4; x.font = `800 ${fd}px ${DISP}`; } x.fillText(dd, 70, transparente ? 230 : 600); x.font = `800 ${fs}px ${DISP}`; }
  x.fillStyle = '#f4f2ee'; x.fillText(l1, 70, 880 + off); x.fillText(l2, 70, 880 + off + fs * 0.95);
  x.fillStyle = '#ff6a00'; x.fillText("✓", 70 + x.measureText(l2 + " ").width, 880 + off + fs * 0.95);
  // Palavras por extenso ("semanas", não "sem."): em duas linhas pra caber
  const stats = [[`${minutos}`, t('min')], stat2 ? stat2 : exercicios === 0 && series ? [`${series}`, tp(series, 'série', 'séries')] : [!completo && total ? `${exercicios}/${total}` : `${exercicios}`, tp(!completo && total ? total : exercicios, 'exercício', 'exercícios')], [`🔥${streak}`, tp(streak, 'semana seguida', 'semanas seguidas')]];
    stats.forEach(([v, l], j) => { const yy = 1260 + off + j * 130; x.fillStyle = j === 2 ? '#ff6a00' : '#f4f2ee'; x.font = `800 96px ${DISP}`; x.fillText(v, 70, yy); const wv = x.measureText(v).width; x.fillStyle = CINZA; let fz = 42; x.font = `500 ${fz}px ${BODY}`; while (fz > 26 && x.measureText(l).width > W - 160 - wv) { fz -= 2; x.font = `500 ${fz}px ${BODY}`; } x.fillText(l, 70 + wv + 20, yy); });
  x.fillStyle = CINZA; x.font = `500 36px ${BODY}`;
  let linha = `${nome} · ${titulo}`; if (x.measureText(linha).width > W - 140) { while (x.measureText(linha + '…').width > W - 140 && linha.length > 4) linha = linha.slice(0, -1); linha = linha.trimEnd() + '…'; }
  x.fillText(linha, 70, 1580 + off);
  x.fillStyle = '#ff6a00'; x.font = `700 48px ${BODY}`; x.fillText(insta, 70, 1650 + off); // acima da barra de resposta do Instagram
  // JPEG: ~5x mais leve que PNG pra subir no 4G (o Instagram recomprime de qualquer jeito)
  const tipo = transparente ? 'image/png' : 'image/jpeg', nomeArq = transparente ? 'treino-feito-sem-fundo.png' : 'treino-feito.jpg'; // transparente precisa de PNG
  const blob = await new Promise(r => c.toBlob(r, tipo, 0.9));
  if (modo === 'blob') return blob;
  const file = new File([blob], nomeArq, { type: tipo });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: t('Treino feito') }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancel'; } } // compartilhar falhou (não foi ela que desistiu): baixa a imagem
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomeArq; a.click(); return 'download';
}
