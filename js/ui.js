// Helpers de interface
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let tt;
export function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast on' + (err ? ' err' : '');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2800);
}

export function overlay(html) { const o = $('#overlay'); o.innerHTML = html; return o; }
export function closeOverlay() { $('#overlay').innerHTML = ''; }

export const fmtMin = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const hoje = () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
export const primeiroNome = n => (n || '').trim().split(' ')[0];
// Data só (AAAA-MM-DD) é lida como meio-dia local, pra não voltar um dia no fuso do Brasil.
export const fmtData = d => d ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00' : d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';

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
    <div class="row between" style="padding:10px 14px"><span class="muted small">${esc(dica || nome)}</span><button class="back" style="color:var(--accent)" id="vm-close">Fechar</button></div></div></div>`
    : `<div class="modal" id="vm"><div class="box" style="padding:20px;display:flex;flex-direction:column;gap:12px"><span class="pill" style="align-self:flex-start">🎬 vídeo em gravação</span><h2>${esc(nome)}</h2>
      ${dica ? `<div class="card" style="background:#101012"><b style="font-size:13px;color:var(--accent)">COMO FAZER</b><p style="margin-top:4px;font-size:16px;line-height:1.4">${esc(dica)}</p></div>` : ''}
      <p class="muted small">O Igor tá gravando os vídeos de todos os exercícios. Ficou com dúvida na execução? Chama ele no WhatsApp.</p><button class="btn sm" id="vm-close">Entendi</button></div></div>`);
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

// Timer em tela cheia (descanso ou exercício de tempo). Conta pelo horário de término, então não atrasa
// se o celular segurar a tela. "Anotar" encolhe pra uma barra no rodapé pra registrar carga sem parar o tempo.
// Resolve true (acabou), false (pulou) ou null (fechou sem fazer, só no tempo de exercício).
export function restTimer(segundos, proximo, titulo = 'Descanso') {
  return new Promise(resolve => {
    let total = segundos, fim = Date.now() + segundos * 1000, iv, mini = false;
    const trabalho = titulo !== 'Descanso';
    overlay(`<div class="ov" id="rest">
      <button class="back x" id="rest-x" aria-label="Fechar">${trabalho ? '✕' : '✎ anotar'}</button>
      <p class="muted" style="letter-spacing:1px;text-transform:uppercase">${esc(titulo)}</p>
      <div class="ring" id="ring"><b id="rest-n"></b></div>
      <p class="muted center" id="rest-p">${esc(proximo || '')}</p>
      <div class="row"><button class="btn ghost sm" id="rest-skip">${trabalho ? 'Já fiz' : 'Pular'}</button><button class="btn sm" id="rest-add">+15s</button></div></div>`);
    const left = () => Math.max(0, Math.ceil((fim - Date.now()) / 1000));
    const tick = () => { const l = left(), n = $('#rest-n'); if (!n) return; n.textContent = mini ? `${titulo} ${fmtMin(l)} · tocar pra abrir` : (l >= 60 ? fmtMin(l) : l); $('#ring').style.setProperty('--p', (l / total * 100) + '%'); if (l <= 0) end(true); };
    const end = (r) => { clearInterval(iv); document.removeEventListener('visibilitychange', tick); closeOverlay(); if (r === true) { beep(); toast(trabalho ? 'Tempo! Série feita ✓' : 'Descanso acabou. Bora a próxima!'); } resolve(r); };
    iv = setInterval(tick, 250); document.addEventListener('visibilitychange', tick);
    $('#rest-skip').onclick = e => { e.stopPropagation(); end(trabalho ? true : false); };
    $('#rest-add').onclick = e => { e.stopPropagation(); fim += 15000; total += 15; tick(); };
    $('#rest-x').onclick = e => { e.stopPropagation(); if (trabalho) return end(null); mini = true; $('#rest').classList.add('mini'); tick(); };
    $('#rest').onclick = () => { if (mini) { mini = false; $('#rest').classList.remove('mini'); tick(); } };
    tick();
  });
}

export function tabs(active) {
  const t = [['home', 'Início', 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'], ['treino', 'Treino', 'M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12'],
    ['pontos', 'Pontos', 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z'], ['evolucao', 'Evolução', 'M4 19V5M4 19h16M7 15l4-5 3 3 5-7'],
    ['perfil', 'Perfil', 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21a8 8 0 0 1 16 0']];
  return `<nav class="tabs">${t.map(([id, l, d]) => `<button class="tab ${active === id ? 'on' : ''}" data-go="${id}"><svg viewBox="0 0 24 24"><path d="${d}"/></svg>${l}</button>`).join('')}</nav>`;
}

// Card compartilhável → imagem PNG (canvas) → Web Share ou download
export async function cardImagem({ nome, titulo, minutos, exercicios, streak, data, insta }) {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0b0c'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W - 120, 120, 20, W - 120, 120, 620); g.addColorStop(0, 'rgba(255,106,0,.55)'); g.addColorStop(1, 'rgba(255,106,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#f4f2ee'; x.font = '800 54px "Barlow Condensed", Impact, sans-serif'; x.fillText('IGOR SOUSA', 70, 120);
  x.fillStyle = '#ff6a00'; x.fillText('TEAM', 70 + x.measureText('IGOR SOUSA ').width, 120);
  x.fillStyle = '#9a968f'; x.font = '500 30px Barlow, Arial'; x.fillText(data, W - 70 - x.measureText(data).width, 118);
  x.fillStyle = '#f4f2ee'; x.font = '800 190px "Barlow Condensed", Impact, sans-serif'; x.fillText('TREINO', 70, 1040); x.fillText('FEITO', 70, 1220);
  x.fillStyle = '#ff6a00'; x.fillText('✓', 70 + x.measureText('FEITO ').width, 1220);
  const stats = [[`${minutos}`, 'min'], [`${exercicios}`, 'exerc.'], [`🔥${streak}`, 'sem.']];
  let sx = 70; stats.forEach(([v, l]) => { x.fillStyle = '#f4f2ee'; x.font = '800 96px "Barlow Condensed", Impact, sans-serif'; x.fillText(v, sx, 1420); const w = x.measureText(v).width; x.fillStyle = '#9a968f'; x.font = '500 34px Barlow, Arial'; x.fillText(l, sx + w + 10, 1420); sx += w + x.measureText(l).width + 80; });
  x.fillStyle = '#9a968f'; x.font = '500 34px Barlow, Arial'; x.fillText(`${nome} · ${titulo} · ${insta}`, 70, 1760);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'treino-feito.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Treino feito' }); return 'shared'; } catch { return 'cancel'; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'treino-feito.png'; a.click(); return 'download';
}
