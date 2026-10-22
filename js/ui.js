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
export const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';

export function youtubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&playsinline=1&loop=1&playlist=${m[1]}&controls=0&modestbranding=1&rel=0` : null;
}

export function videoModal(nome, url, dica) {
  const yt = youtubeEmbed(url);
  const inner = yt ? `<iframe src="${yt}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
    : url ? `<video src="${esc(url)}" autoplay loop muted playsinline controls></video>`
    : `<div><div class="play" style="margin:0 auto 10px;width:54px;height:54px"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></div><b style="color:var(--fg)">${esc(nome)}</b><br>vídeo do Igor em breve</div>`;
  const o = overlay(`<div class="modal" id="vm"><div class="box"><div class="area">${inner}</div>
    <div class="row between" style="padding:10px 14px"><span class="muted small">${esc(dica || nome)}</span><button class="back" style="color:var(--accent)" id="vm-close">Fechar</button></div></div></div>`);
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

// Timer de descanso em tela cheia. Resolve quando acabar ou pular.
export function restTimer(segundos, proximo) {
  return new Promise(resolve => {
    let total = segundos, left = segundos, iv;
    const o = overlay(`<div class="ov" id="rest">
      <p class="muted" style="letter-spacing:1px;text-transform:uppercase">Descanso</p>
      <div class="ring" id="ring"><b id="rest-n">${left}</b></div>
      <p class="muted center">${esc(proximo || '')}</p>
      <div class="row"><button class="btn ghost sm" id="rest-skip">Pular</button><button class="btn sm" id="rest-add">+15s</button></div></div>`);
    const tick = () => { $('#rest-n').textContent = left; $('#ring').style.setProperty('--p', (left / total * 100) + '%'); };
    const end = (done) => { clearInterval(iv); closeOverlay(); if (done) { beep(); toast('Descanso acabou. Bora a próxima!'); } resolve(done); };
    iv = setInterval(() => { left--; tick(); if (left <= 0) end(true); }, 1000);
    $('#rest-skip').onclick = () => end(false);
    $('#rest-add').onclick = () => { left += 15; total = Math.max(total, left); tick(); };
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
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0b0c'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W - 120, 120, 20, W - 120, 120, 620); g.addColorStop(0, 'rgba(255,106,0,.55)'); g.addColorStop(1, 'rgba(255,106,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#f4f2ee'; x.font = '800 54px "Barlow Condensed", Impact, sans-serif'; x.fillText('IGOR SOUSA', 70, 120);
  x.fillStyle = '#ff6a00'; x.fillText('TEAM', 70 + x.measureText('IGOR SOUSA ').width, 120);
  x.fillStyle = '#9a968f'; x.font = '500 30px Barlow, Arial'; x.fillText(data, W - 70 - x.measureText(data).width, 118);
  x.fillStyle = '#f4f2ee'; x.font = '800 170px "Barlow Condensed", Impact, sans-serif'; x.fillText('TREINO', 70, 720); x.fillText('FEITO', 70, 880);
  x.fillStyle = '#ff6a00'; x.fillText('✓', 70 + x.measureText('FEITO ').width, 880);
  const stats = [[`${minutos}`, 'min'], [`${exercicios}`, 'exerc.'], [`🔥${streak}`, 'dias']];
  let sx = 70; stats.forEach(([v, l]) => { x.fillStyle = '#f4f2ee'; x.font = '800 96px "Barlow Condensed", Impact, sans-serif'; x.fillText(v, sx, 1050); const w = x.measureText(v).width; x.fillStyle = '#9a968f'; x.font = '500 34px Barlow, Arial'; x.fillText(l, sx + w + 10, 1050); sx += w + x.measureText(l).width + 80; });
  x.fillStyle = '#9a968f'; x.font = '500 34px Barlow, Arial'; x.fillText(`${nome} · ${titulo} · ${insta}`, 70, 1230);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'treino-feito.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Treino feito' }); return 'shared'; } catch { return 'cancel'; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'treino-feito.png'; a.click(); return 'download';
}
