// Helpers de interface
import { t, dataLocal, idioma } from './i18n.js';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let tt;
// Aviso embaixo (não cobre o título), fica mais tempo e fecha com um toque.
export function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast on' + (err ? ' err' : '');
  t.onclick = () => t.classList.remove('on');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), err ? 6500 : 4500);
}

export function overlay(html) { const o = $('#overlay'); o.innerHTML = html; return o; }
export function closeOverlay() { $('#overlay').innerHTML = ''; }
// Mostrar/ocultar senha: qualquer botão .olho ao lado de um input de senha
document.addEventListener('click', e => { const b = e.target.closest('.olho'); if (!b) return; e.preventDefault(); const i = b.parentElement.querySelector('input'); const ver = i.type === 'password'; i.type = ver ? 'text' : 'password'; b.textContent = ver ? t('ocultar') : t('mostrar'); });
export const campoSenha = (id, ph = '', ac = 'new-password') => `<div class="senha"><input class="input" id="${id}" type="password" autocomplete="${ac}" placeholder="${ph}"><button type="button" class="olho">${t('mostrar')}</button></div>`;
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
export const hoje = () => dataLocal(Date.now(), { weekday: 'long', day: 'numeric', month: 'short' });
export const primeiroNome = n => (n || '').trim().split(' ')[0];
// Data só (AAAA-MM-DD) é lida como meio-dia local, pra não voltar um dia no fuso do Brasil.
export const fmtData = d => d ? dataLocal(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00' : d, { day: '2-digit', month: 'short' }) : '';

export function youtubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&playsinline=1&loop=1&playlist=${m[1]}&controls=0&modestbranding=1&rel=0` : null;
}

export function videoModal(nome, url, dica) {
  const yt = youtubeEmbed(url);
  const inner = yt ? `<iframe src="${yt}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
    : url ? `<video src="${esc(url)}" autoplay loop muted playsinline controls></video>`
    : null;
  const o = overlay(inner ? `<div class="modal" id="vm"><div class="box"><div class="area">${inner}</div>
    <div class="row between" style="padding:10px 14px"><span class="muted small">${esc(dica || nome)}</span><button class="back" style="color:var(--accent)" id="vm-close">${t('Fechar')}</button></div></div></div>`
    : `<div class="modal" id="vm"><div class="box" style="padding:20px;display:flex;flex-direction:column;gap:12px"><span class="pill" style="align-self:flex-start">🎬 ${t('vídeo em gravação')}</span><h2>${esc(nome)}</h2>
      ${dica ? `<div class="card" style="background:#101012"><b style="font-size:14px;color:var(--accent)">${t('DICA DO IGOR')}</b><p style="margin-top:4px;font-size:16px;line-height:1.4">${esc(dica)}</p></div>` : ''}
      <p class="muted small">${t('O Igor tá gravando os vídeos de todos os exercícios. Ficou com dúvida na execução? Chama ele no WhatsApp.')}</p><button class="btn sm" id="vm-close">${t('Entendi')}</button></div></div>`);
  $('#vm-close').onclick = closeOverlay;
  $('#vm').addEventListener('click', e => { if (e.target.id === 'vm') closeOverlay(); });
}

// Apito curto (dois tons) ao fim do descanso
export function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    const g = a.createGain(); g.gain.value = .18; g.connect(a.destination);
    [[880, 0, .18], [1100, .22, .4]].forEach(([f, t, d]) => { const o = a.createOscillator(); o.frequency.value = f; o.connect(g); o.start(a.currentTime + t); o.stop(a.currentTime + t + d); });
    if (navigator.vibrate) navigator.vibrate([150, 80, 250]);
  } catch {}
}

// Pede permissão de notificação uma vez, no 1º descanso (o toque dela no ⏱ conta como gesto).
function pedirAviso() {
  try {
    if (!('Notification' in window) || Notification.permission !== 'default' || localStorage.getItem('avisoPedido')) return;
    localStorage.setItem('avisoPedido', '1');
    Notification.requestPermission().then(r => { if (r === 'granted') toast(t('Pronto: te aviso quando o descanso acabar, mesmo com a tela apagada.')); });
  } catch {}
}
// Timer em tela cheia (descanso ou exercício de tempo). Conta pelo horário de término, então não atrasa
// se o celular segurar a tela. "Anotar" encolhe pra uma barra no rodapé pra registrar carga sem parar o tempo.
// Só existe UM timer por vez (abrir outro encerra o anterior) e ele mora numa camada própria, então
// pop-ups (histórico, vídeo) não matam o descanso. Resolve true (acabou), false (pulou/cancelado) ou null
// (fechou sem fazer, só no tempo de exercício). meio:true = "cada lado": apita na metade pra trocar de lado.
let restAtivo = null;
const trouxe = x => t(x === "Bora!" ? "Tempo" : x);
export const descansoAtivo = () => !!restAtivo;
export function pararDescanso() { if (restAtivo) restAtivo.end(false); }
export function minimizarDescanso() { if (restAtivo && !restAtivo.mini) { restAtivo.minimizar(); return true; } return false; }
function camada() { let l = document.getElementById('rest-layer'); if (!l) { l = document.createElement('div'); l.id = 'rest-layer'; document.body.appendChild(l); } return l; }
export function restTimer(segundos, proximo, titulo = 'Descanso', { meio = false, aoMudar } = {}) {
  pararDescanso();
  return new Promise(resolve => {
    let total = segundos, fim = Date.now() + segundos * 1000, iv, trocou = false;
    const trabalho = titulo !== 'Descanso', L = camada();
    const me = { mini: false, trabalho };
    L.innerHTML = `<div class="ov" id="rest">
      <button class="back x" id="rest-x" aria-label="${trabalho ? t('Fechar') : t('Minimizar pra anotar')}">${trabalho ? '✕' : '✎ ' + t('anotar')}</button>
      <p class="muted" id="rest-t" style="letter-spacing:1px;text-transform:uppercase">${esc(t(titulo))}</p>
      <div class="ring" id="ring"><b id="rest-n"></b></div>
      <p class="muted center" id="rest-p">${esc(proximo || '')}</p>
      <div class="row"><button class="btn ghost sm" id="rest-skip">${trabalho ? t('Já fiz') : t('Pular')}</button><button class="btn sm" id="rest-add">+15s</button></div></div>`;
    const q = s => L.querySelector(s);
    const avisar = () => { try { navigator.serviceWorker?.controller?.postMessage({ tipo: 'agendar', em: fim, titulo: trabalho ? t('Tempo! ⏱') : t('Descanso acabou! 💪'), corpo: trabalho ? t('Série feita, volta pro app.') : (proximo || t('Bora a próxima série.')) }); } catch {} };
    const cancelarAviso = () => { try { navigator.serviceWorker?.controller?.postMessage({ tipo: 'cancelar' }); } catch {} };
    pedirAviso(); avisar();
    const left = () => Math.max(0, Math.ceil((fim - Date.now()) / 1000));
    const tick = () => {
      const l = left(), n = q('#rest-n'); if (!n) return;
      if (meio && !trocou && l <= total / 2) { trocou = true; beep(); q('#rest-t').textContent = t('Troca de lado!'); toast(t('Troca de lado 🔄')); }
      n.textContent = me.mini ? `${trouxe(titulo)} ${fmtMin(l)} · ${t('toca pra abrir')}` : (l >= 60 ? fmtMin(l) : l);
      q('#ring').style.setProperty('--p', (l / total * 100) + '%'); if (l <= 0) end(true);
    };
    const end = (r) => { if (restAtivo !== me) return; restAtivo = null; cancelarAviso(); clearInterval(iv); document.removeEventListener('visibilitychange', tick); L.innerHTML = ''; if (r === true) { beep(); toast(trabalho ? t('Tempo! Série feita ✓') : t('Descanso acabou. Bora a próxima!')); } resolve(r); };
    me.end = end;
    me.minimizar = () => { if (trabalho) return end(null); me.mini = true; q('#rest').classList.add('mini'); tick(); };
    restAtivo = me;
    iv = setInterval(tick, 250); document.addEventListener('visibilitychange', tick);
    q('#rest-skip').onclick = e => { e.stopPropagation(); end(trabalho ? true : false); };
    q('#rest-add').onclick = e => { e.stopPropagation(); fim += 15000; total += 15; avisar(); aoMudar?.(fim); tick(); };
    q('#rest-x').onclick = e => { e.stopPropagation(); me.minimizar(); };
    q('#rest').onclick = () => { if (me.mini) { me.mini = false; q('#rest').classList.remove('mini'); tick(); } };
    tick();
  });
}

export function tabs(active) {
  const abas = [['home', 'Início', 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'], ['treino', 'Treino', 'M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12'],
    ['videos', 'Vídeos', 'M4 5h16v14H4zM10 9l5 3-5 3z'],
    ['pontos', 'Pontos', 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z'], ['evolucao', 'Evolução', 'M4 19V5M4 19h16M7 15l4-5 3 3 5-7'],
    ['perfil', 'Perfil', 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21a8 8 0 0 1 16 0']];
  return `<nav class="tabs">${abas.map(([id, l, d]) => `<button class="tab ${active === id ? 'on' : ''}" data-go="${id}"><svg viewBox="0 0 24 24"><path d="${d}"/></svg><span>${t(l)}</span></button>`).join('')}</nav>`;
}

// Card compartilhável → imagem PNG (canvas) → Web Share ou download
export async function cardImagem({ nome, titulo, minutos, exercicios, streak, data, insta }) {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0b0c'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W - 120, 120, 20, W - 120, 120, 620); g.addColorStop(0, 'rgba(255,106,0,.55)'); g.addColorStop(1, 'rgba(255,106,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const DISP = '"Barlow Condensed", Impact, "Noto Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans Devanagari", system-ui, sans-serif', BODY = 'Barlow, Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans Devanagari", system-ui, sans-serif';
  x.fillStyle = '#f4f2ee'; x.font = `800 54px ${DISP}`; x.fillText('IGOR SOUSA', 70, 120);
  x.fillStyle = '#ff6a00'; x.fillText('TEAM', 70 + x.measureText('IGOR SOUSA ').width, 120);
  x.fillStyle = '#9a968f'; x.font = `500 30px ${BODY}`; x.fillText(data, W - 70 - x.measureText(data).width, 118);
  // "TREINO FEITO ✓" no idioma dela; diminui a letra se a palavra for comprida (francês, espanhol)
  const [l1, l2] = t('TREINO|FEITO').split('|'); let fs = 190;
  x.font = `800 ${fs}px ${DISP}`; while (fs > 90 && Math.max(x.measureText(l1).width, x.measureText(l2 + ' ✓').width) > W - 140) { fs -= 10; x.font = `800 ${fs}px ${DISP}`; }
  x.fillStyle = '#f4f2ee'; x.fillText(l1, 70, 1040); x.fillText(l2, 70, 1040 + fs * 0.95);
  x.fillStyle = '#ff6a00'; x.fillText('✓', 70 + x.measureText(l2 + ' ').width, 1040 + fs * 0.95);
  const stats = [[`${minutos}`, t('min')], [`${exercicios}`, t('exerc.')], [`🔥${streak}`, t('sem.')]];
  let sx = 70; stats.forEach(([v, l]) => { x.fillStyle = '#f4f2ee'; x.font = `800 96px ${DISP}`; x.fillText(v, sx, 1420); const w = x.measureText(v).width; x.fillStyle = '#9a968f'; x.font = `500 34px ${BODY}`; x.fillText(l, sx + w + 10, 1420); sx += w + x.measureText(l).width + 80; });
  x.fillStyle = '#9a968f'; x.font = `500 36px ${BODY}`;
  let linha = `${nome} · ${titulo}`; if (x.measureText(linha).width > W - 140) { while (x.measureText(linha + '…').width > W - 140 && linha.length > 4) linha = linha.slice(0, -1); linha = linha.trimEnd() + '…'; }
  x.fillText(linha, 70, 1700);
  x.fillStyle = '#ff6a00'; x.font = `700 48px ${BODY}`; x.fillText(insta, 70, 1775);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'treino-feito.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: t('Treino feito') }); return 'shared'; } catch { return 'cancel'; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'treino-feito.png'; a.click(); return 'download';
}
