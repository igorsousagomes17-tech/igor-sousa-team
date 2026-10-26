// SPINNING GUIADO — aula na bike da academia, conduzida por um boneco animado (sem vídeo, quase sem internet).
// Cada aula é uma lista de blocos: nome, segundos, posição (sentada / em pé), cadência (rpm), esforço (0–10) e dica.
import { $, $$, esc, toast, beep } from './ui.js';
import { t, tp } from './i18n.js';
import { AULAS, DICAS } from './spin-aulas.js';
const dicaDe = b => DICAS[b.dica] || b.dica;
export const nomeAula = a => `${t(a.nome)} ${a.min}`;
import { kcalSpin } from './kcal.js';
const kc = (p, a, seg) => { const k = kcalSpin(p, a.blocos, seg); return k ? ` · ~${t('{n} kcal', { n: k })}` : ''; };
export { AULAS };

export const DURACOES = [10, 15, 20, 25, 30];
const minDe = a => Math.round(a.blocos.reduce((s, b) => s + b.seg, 0) / 60);
export const duracaoAula = minDe;
// Aula do mês: roda entre todas as aulas, uma por mês (todo mês tem uma "nova" em destaque)
export function aulaDoMes(d = new Date()) { const ord = [...AULAS].sort((a, b) => a.mes - b.mes); return ord[(d.getFullYear() * 12 + d.getMonth()) % ord.length]; }
const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const ESTILO = { intervalado: 'Intervalado', subida: 'Subidas', piramide: 'Pirâmide', ritmo: 'Ritmo', sprint: 'Sprints' };

// LISTA ---------------------------------------------------------------------------------------
export function htmlLista(filtro, perfil) {
  const dm = aulaDoMes(), lista = AULAS.filter(a => !filtro || a.min === +filtro);
  const card = a => `<button class="card spin-aula" data-spin="${esc(a.id)}"><div class="row between" style="gap:10px"><div style="min-width:0"><b>${esc(nomeAula(a))}</b><p class="muted small">${t(ESTILO[a.estilo])} · ${t('{n} min', { n: minDe(a) })}${kc(perfil, a)} · ${t('em pé {n}%', { n: Math.round(a.blocos.filter(b => b.pe).reduce((s, b) => s + b.seg, 0) / a.blocos.reduce((s, b) => s + b.seg, 0) * 100) })}</p></div><span class="spin-int" aria-label="${t('Intensidade')}">${'🔥'.repeat(a.nivel)}</span></div>${miniTrilha(a)}</button>`;
  return `<div class="card hero spin-mes" style="color:#1a0d00"><span class="pill" style="background:rgba(0,0,0,.18);color:#1a0d00">${t('Aula do mês')}</span>
    <div class="logo" style="font-size:1.9rem;margin:8px 0 2px;color:#1a0d00">${esc(nomeAula(dm))}</div><p style="font-weight:600">${t(ESTILO[dm.estilo])} · ${t('{n} min', { n: minDe(dm) })}${kc(perfil, dm)}</p>
    <button class="btn dark" style="margin-top:8px" data-spin="${esc(dm.id)}">▶ ${t('Começar')}</button></div>
  <div class="spin-filtro" role="group" aria-label="${t('Duração')}">${['', ...DURACOES].map(d => `<button class="${String(filtro || '') === String(d) ? 'on' : ''}" data-dur="${d}">${d ? t('{n} min', { n: d }) : t('Todas')}</button>`).join('')}</div>
  <div class="spin-lista">${lista.map(card).join('')}</div>
  <div class="card" style="border:1px solid var(--accent)"><b>⚠ ${t('Primeira vez no spinning?')}</b><p class="muted">${t('Começa pelas aulas "Pedal no ritmo" (🔥) e não passa do esforço 7 nas primeiras semanas. Se a urina ficar escura ou a dor muscular for muito forte 1 a 3 dias depois, procura um médico. Tem pressão alta? Evita os tiros e nunca prende a respiração.')}</p></div>
  <div class="card"><b>${t('Antes de subir na bike')}</b><p class="muted">${t('Selim na altura do quadril (em pé ao lado da bike). Joelho levemente dobrado com o pedal embaixo. Garrafinha de água por perto. A carga quem controla é você: o app diz o esforço, você gira o botão até chegar nele.')}</p></div>`;
}
export const miniTrilha = a => `<div class="spin-trilha" aria-hidden="true">${a.blocos.map(b => `<i style="flex:${b.seg};height:${6 + b.esf * 2.4}px" class="${b.pe ? 'pe' : ''}"></i>`).join('')}</div>`;

// PLAYER --------------------------------------------------------------------------------------
const SVG = `<svg class="spin-svg" viewBox="0 0 400 300" role="img" aria-label="${t('Boneco pedalando na bike de spinning')}">
<defs><radialGradient id="sLuz" cx="50%" cy="100%" r="60%"><stop offset="0" stop-color="#ff6a00" stop-opacity=".35"/><stop offset="1" stop-color="#ff6a00" stop-opacity="0"/></radialGradient>
<linearGradient id="sPele" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c9c9cc"/><stop offset="1" stop-color="#8f8f94"/></linearGradient>
<linearGradient id="sMetal" x1="0" x2="1"><stop offset="0" stop-color="#3a3a40"/><stop offset=".5" stop-color="#6a6a72"/><stop offset="1" stop-color="#2c2c31"/></linearGradient></defs>
<ellipse cx="200" cy="268" rx="170" ry="26" fill="url(#sLuz)"/><ellipse cx="200" cy="270" rx="120" ry="7" fill="#000" opacity=".55"/>
<path d="M110 262 L300 262" stroke="#2a2a2e" stroke-width="10" stroke-linecap="round"/>
<circle cx="285" cy="205" r="42" fill="#1b1b1f" stroke="url(#sMetal)" stroke-width="7"/><circle id="sVol" cx="285" cy="205" r="30" fill="none" stroke="#ff6a00" stroke-width="3" stroke-dasharray="14 10"/>
<path d="M150 262 L185 175 L200 205 M185 175 L250 160 L285 205 M200 205 L285 205 M250 160 L262 112" stroke="url(#sMetal)" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M185 175 L176 128" stroke="url(#sMetal)" stroke-width="8" stroke-linecap="round"/><path d="M150 124 Q176 116 198 126" stroke="#111" stroke-width="10" stroke-linecap="round" fill="none"/>
<path d="M262 112 L292 106 Q302 104 304 114" stroke="#111" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M285 205 L300 262" stroke="url(#sMetal)" stroke-width="8" stroke-linecap="round"/>
<g opacity=".75"><line id="sCxT" stroke="url(#sPele)" stroke-width="15" stroke-linecap="round"/><line id="sCaT" stroke="url(#sPele)" stroke-width="11" stroke-linecap="round"/><line id="sPeT" stroke="#111" stroke-width="9" stroke-linecap="round"/></g>
<circle cx="200" cy="205" r="10" fill="#2c2c31"/><line id="sPedA" stroke="#55555c" stroke-width="6" stroke-linecap="round"/><line id="sPedB" stroke="#55555c" stroke-width="6" stroke-linecap="round"/>
<line id="sTronco" stroke="#111" stroke-width="26" stroke-linecap="round"/><line id="sBraco" stroke="url(#sPele)" stroke-width="11" stroke-linecap="round"/><line id="sAnte" stroke="url(#sPele)" stroke-width="10" stroke-linecap="round"/>
<circle id="sCab" r="13" fill="url(#sPele)"/><path id="sRabo" fill="#2a2a2e"/>
<line id="sCxF" stroke="#111" stroke-width="17" stroke-linecap="round"/><line id="sCaF" stroke="url(#sPele)" stroke-width="11" stroke-linecap="round"/><line id="sPeF" stroke="#111" stroke-width="9" stroke-linecap="round"/></svg>`;

export function htmlPlayer(a, perfil) {
  return `<div class="spin-palco">${SVG}<div class="spin-selo" id="sSelo">${t('Sentada')}</div><div class="spin-rpm"><b id="sRpm">0</b><span>${t('pedaladas/min')}</span></div></div>
  <div><h1 id="sNome" style="font-size:2.3rem">${esc(nomeAula(a))}</h1><p class="muted" id="sDica">${t('Ajusta a bike, pega a água e toca em começar. O app conduz o resto.')}</p></div>
  <div class="row" style="gap:10px"><div class="card" style="flex:1;padding:10px 12px"><p class="muted small">${t('Tempo do bloco')}</p><b class="spin-big" id="sTempo">0:00</b></div><div class="card" style="flex:1;padding:10px 12px"><p class="muted small">${t('Esforço')}</p><b class="spin-big" id="sEsf">—</b><div class="spin-esf" id="sEsfB"></div></div></div>
  <div class="spin-barra"><i id="sProg"></i></div>
  <p class="muted small" id="sProx"></p>
  <div class="spin-trilha grande" id="sTrilha">${a.blocos.map(b => `<i style="flex:${b.seg};height:${8 + b.esf * 2.6}px" class="${b.pe ? 'pe' : ''}"></i>`).join('')}</div>
  <p class="muted small center" id="sTotal">${t('Aula de {n} min', { n: minDe(a) })}${kc(perfil, a)} · ${tp(a.blocos.length, '{n} bloco', '{n} blocos')}</p>
  <div class="row" style="gap:10px"><button class="btn ghost sm" id="sPausa" style="flex:0 0 120px" disabled>${t('Pausar')}</button><button class="btn" id="sGo" style="flex:1">▶ ${t('Começar')}</button></div>
  <button class="link-fim" id="sSair">${t('Sair da aula')}</button>`;
}

// Animação do boneco: perna e braço por cinemática inversa de 2 segmentos
const C = { x: 200, y: 205 }, R = 26, COXA = 64, CANELA = 62, BRACO = 40, ANTEB = 38;
function ik(A, B, l1, l2, lado) { const dx = B.x - A.x, dy = B.y - A.y; const d = Math.min(Math.hypot(dx, dy), l1 + l2 - .01); const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))), ang = Math.atan2(dy, dx) - lado * a; return { x: A.x + Math.cos(ang) * l1, y: A.y + Math.sin(ang) * l1 }; }
const set = (id, a, b) => { const e = document.getElementById(id); if (!e) return; e.setAttribute('x1', a.x.toFixed(1)); e.setAttribute('y1', a.y.toFixed(1)); e.setAttribute('x2', b.x.toFixed(1)); e.setAttribute('y2', b.y.toFixed(1)); };
const lerp = (a, b, k) => a + (b - a) * k;

// Controla a aula. aoTerminar({ seg, feito }) é chamado quando acaba (ou ela sai depois de fazer parte).
export function iniciarPlayer(a, { aoTerminar, aoSair, manterTela, soltarTela }) {
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fimBloco = 0, ang = 0, emPe = 0, rpm = 0, i = -1, resta = 0, rodando = false, pausado = false, feito = 0, ult = performance.now(), raf = 0, vivo = true, ultimoBipe = -1;
  const total = a.blocos.reduce((s, b) => s + b.seg, 0);
  function desenha(dt) {
    const b = a.blocos[Math.max(0, i)];
    rpm = lerp(rpm, rodando && !pausado ? b.rpm : 0, Math.min(1, dt * 2.5)); emPe = lerp(emPe, rodando && b.pe ? 1 : 0, Math.min(1, dt * (reduz ? 20 : 3)));
    ang += (rpm / 60) * Math.PI * 2 * dt; const r = document.getElementById('sRpm'); if (!r) return false; r.textContent = Math.round(rpm);
    const pA = { x: C.x + Math.cos(ang) * R, y: C.y + Math.sin(ang) * R }, pB = { x: C.x - Math.cos(ang) * R, y: C.y - Math.sin(ang) * R };
    set('sPedA', C, pA); set('sPedB', C, pB); document.getElementById('sVol').setAttribute('transform', `rotate(${(ang * 57.3).toFixed(1)} 285 205)`);
    const bal = Math.sin(ang * 2) * 3 * emPe, quad = { x: lerp(170, 190, emPe) + Math.sin(ang) * 4 * emPe, y: lerp(118, 104, emPe) + bal }, omb = { x: lerp(234, 250, emPe), y: lerp(76, 64, emPe) + bal * .6 };
    const cab = { x: omb.x + 14, y: omb.y - 22 }, mao = { x: 300, y: 110 }, pF = { x: pA.x + 4, y: pA.y + 4 }, pT = { x: pB.x + 4, y: pB.y + 4 };
    const jF = ik(quad, pF, COXA, CANELA, 1), jT = ik(quad, pT, COXA, CANELA, 1), cot = ik(omb, mao, BRACO, ANTEB, -1);
    set('sCxF', quad, jF); set('sCaF', jF, pF); set('sPeF', { x: pF.x - 6, y: pF.y }, { x: pF.x + 14, y: pF.y + 2 });
    set('sCxT', quad, jT); set('sCaT', jT, pT); set('sPeT', { x: pT.x - 6, y: pT.y }, { x: pT.x + 14, y: pT.y + 2 });
    set('sTronco', quad, omb); set('sBraco', omb, cot); set('sAnte', cot, mao);
    const cb = document.getElementById('sCab'); cb.setAttribute('cx', cab.x.toFixed(1)); cb.setAttribute('cy', cab.y.toFixed(1));
    document.getElementById('sRabo').setAttribute('d', `M${(cab.x - 12).toFixed(1)} ${(cab.y - 5).toFixed(1)} q-10 4 -8 16 q6 -6 10 -8 z`);
    return true;
  }
  function mostra() {
    const b = a.blocos[i], p = a.blocos[i + 1];
    $('#sNome').textContent = t(b.nome); $('#sDica').textContent = t(dicaDe(b)); $('#sSelo').textContent = b.pe ? t('Em pé') : t('Sentada'); $('#sSelo').classList.toggle('pe', !!b.pe);
    $('#sEsf').textContent = b.esf + '/10'; $('#sEsfB').innerHTML = Array.from({ length: 10 }, (_, k) => `<i class="${k < b.esf ? 'on' : ''}"></i>`).join('');
    $('#sProx').innerHTML = p ? `${t('Próximo:')} <b>${esc(t(p.nome))}</b> · ${p.pe ? t('em pé') : t('sentada')} · ${t('esforço {n}/10', { n: p.esf })}` : t('Último bloco! Segura que tá acabando.');
    $$('#sTrilha i').forEach((x, k) => { x.classList.toggle('feito', k < i); x.classList.toggle('agora', k === i); });
  }
  function proximo(pulou) {
    if (i >= 0 && !pulou) feito += a.blocos[i].seg; else if (i >= 0) feito += a.blocos[i].seg - Math.max(0, resta);
    i++; if (i >= a.blocos.length) return fim();
    const agora = Date.now(); fimBloco = (pulou || i === 0 || fimBloco <= 0 ? agora : fimBloco) + a.blocos[i].seg * 1000; resta = (fimBloco - agora) / 1000; ultimoBipe = -1; beep(i ? 'forte' : 'fim'); try { navigator.vibrate?.(120); } catch {} mostra();
  }
  function fim() { rodando = false; vivo = false; soltarTela?.(); aoTerminar({ seg: Math.round(feito), feito: true }); }
  function loop(tm) {
    if (!vivo) return; const dt = Math.min(.05, (tm - ult) / 1000); ult = tm;
    if (rodando && !pausado) { resta = (fimBloco - Date.now()) / 1000; const s = Math.ceil(resta); if (s <= 3 && s > 0 && s !== ultimoBipe && a.blocos[i + 1]) { ultimoBipe = s; beep('leve'); } if (resta <= 0) proximo(false); }
    if (i >= 0 && a.blocos[i]) { const e = $('#sTempo'); if (e) e.textContent = fmt(resta); const pr = $('#sProg'); if (pr) pr.style.width = ((feito + a.blocos[i].seg - Math.max(0, resta)) / total * 100).toFixed(1) + '%'; }
    if (!desenha(dt)) { vivo = false; soltarTela?.(); return; } raf = requestAnimationFrame(loop);
  }
  // Tela apagada/app escondido: o tempo continua contando certo pela diferença de relógio (o loop retoma de onde parou)
  $('#sGo').onclick = () => { if (!rodando) { rodando = true; pausado = false; manterTela?.(); $('#sGo').textContent = '⏭ ' + t('Pular bloco'); $('#sPausa').disabled = false; proximo(false); } else proximo(true); };
  $('#sPausa').onclick = () => { if (!rodando) return; pausado = !pausado; if (!pausado) fimBloco = Date.now() + resta * 1000; $('#sPausa').textContent = pausado ? t('Seguir') : t('Pausar'); };
  $('#sSair').onclick = () => { const fez = feito + (i >= 0 && a.blocos[i] ? a.blocos[i].seg - Math.max(0, resta) : 0); vivo = false; soltarTela?.(); aoSair({ seg: Math.round(fez) }); };
  raf = requestAnimationFrame(loop);
  return () => { vivo = false; cancelAnimationFrame(raf); soltarTela?.(); };
}

export const kcalFeitoSpin = (perfil, a, seg) => kcalSpin(perfil, a.blocos, seg);
