// Animação 2D do exercício (boneco em vista lateral), enquanto o vídeo do Igor não chega.
// Cada movimento = 2 poses-chave (pontos do tornozelo, quadril, ombro e mão). Joelho e cotovelo saem por cinemática inversa,
// então o boneco nunca "estica" ou quebra a perna. Loop: desce devagar, sobe, pausa curta (ritmo de execução, ~3 s).
import { t } from './i18n.js';

const COXA = 64, CANELA = 60, BRACO = 44, ANTEB = 42, CHAO = 262;
// Movimentos-base. Por enquanto 3 de amostra (aprovação do Igor antes dos outros 17).
const MOV = {
  agachamento: { // goblet: halter no peito, tronco inclina, joelho acompanha a ponta do pé
    nome: 'Agachamento',
    poses: [
      { tor: [148, CHAO], quad: [140, 142], omb: [146, 64], mao: [176, 100], jo: 1, co: -1 },
      { tor: [148, CHAO], quad: [104, 210], omb: [150, 132], mao: [182, 166], jo: 1, co: -1 }
    ],
    peso: 'halter', banco: null, seta: 'v'
  },
  quadril: { // elevação de quadril: costas apoiadas no banco, barra no quadril, sobe até alinhar o tronco
    nome: 'Elevação de quadril',
    poses: [
      { tor: [222, CHAO], quad: [150, 232], omb: [86, 196], mao: [150, 218], jo: -1, co: 1, deitado: true },
      { tor: [222, CHAO], quad: [160, 186], omb: [86, 192], mao: [160, 172], jo: -1, co: 1, deitado: true }
    ],
    peso: 'barra-quadril', banco: [40, 196, 70, 66], seta: 'v'
  },
  remada: { // remada curvada com halter: tronco a ~45°, puxa o cotovelo pra trás, rente ao corpo
    nome: 'Remada',
    poses: [
      { tor: [150, CHAO], quad: [132, 160], omb: [196, 112], mao: [204, 196], jo: 1, co: 1 },
      { tor: [150, CHAO], quad: [132, 160], omb: [196, 112], mao: [168, 150], jo: 1, co: 1 }
    ],
    peso: 'halter', banco: null, seta: 'h'
  }
};

// Qual animação serve pra esse exercício (pelo nome). null = ainda sem animação.
export function animacaoDe(nome) {
  const n = String(nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/bulgaro|afundo|passada|avanco|cossaco/.test(n)) return null; // afundo tem animação própria (nos próximos 17)
  if (/agachamento|goblet|squat|hack/.test(n)) return 'agachamento';
  if (/elevacao de quadril|hip thrust|ponte de gluteo|glute bridge/.test(n)) return 'quadril';
  if (/remada/.test(n) && !/remada alta/.test(n)) return 'remada';
  return null;
}

// Joelho/cotovelo: dado o início (a), o fim (b) e os dois segmentos, acha o ponto do meio. lado = pra que lado dobra.
function ik(a, b, l1, l2, lado) {
  const dx = b[0] - a[0], dy = b[1] - a[1]; let d = Math.hypot(dx, dy); d = Math.min(d, l1 + l2 - 0.01);
  const ang = Math.atan2(dy, dx), cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), alfa = Math.acos(Math.max(-1, Math.min(1, cos)));
  const g = ang - lado * alfa; return [a[0] + l1 * Math.cos(g), a[1] + l1 * Math.sin(g)];
}
const mix = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export function htmlAnimacao(chave) {
  const m = MOV[chave]; if (!m) return '';
  const banco = m.banco ? `<rect x="${m.banco[0]}" y="${m.banco[1]}" width="${m.banco[2]}" height="${m.banco[3]}" rx="6" fill="#26262b"/>` : '';
  return `<div class="anim"><svg viewBox="0 0 300 300" role="img" aria-label="${t('Animação do exercício: {x}', { x: t(m.nome) })}">
  <defs><linearGradient id="aBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1310"/><stop offset="1" stop-color="#0b0b0c"/></linearGradient></defs>
  <rect width="300" height="300" fill="url(#aBg)"/><line x1="18" y1="${CHAO + 2}" x2="282" y2="${CHAO + 2}" stroke="#2f2f35" stroke-width="3" stroke-linecap="round"/>${banco}
  <path id="aSeta" fill="none" stroke="#ff6a00" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 7" opacity=".7"/>
  <g stroke-linecap="round" stroke-linejoin="round">
    <line id="aCx" stroke="#cfc9bf" stroke-width="15"/><line id="aCa" stroke="#cfc9bf" stroke-width="12"/><line id="aPe" stroke="#cfc9bf" stroke-width="9"/>
    <line id="aTr" stroke="#e6e1d9" stroke-width="22"/>
    <line id="aBr" stroke="#bdb6ab" stroke-width="10"/><line id="aAb" stroke="#bdb6ab" stroke-width="9"/>
    <circle id="aCb" r="15" fill="#e6e1d9"/>
    <g id="aPeso" fill="#ff6a00"></g>
  </g></svg><p class="muted small center">${t('Animação ilustrativa · vídeo do Igor em breve')}</p></div>`;
}

// Liga a animação dentro de `el`. Para sozinha quando o pop-up fecha. Respeita "reduzir movimento" do celular.
export function iniciarAnimacao(el, chave) {
  const m = MOV[chave], svg = el?.querySelector('.anim svg'); if (!m || !svg) return () => {};
  const $ = id => svg.querySelector('#' + id), L = (id, a, b) => { const e = $(id); e.setAttribute('x1', a[0]); e.setAttribute('y1', a[1]); e.setAttribute('x2', b[0]); e.setAttribute('y2', b[1]); };
  const [A, B] = m.poses, quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // seta: caminho do ponto que mais se mexe (quadril no agachamento/ponte, mão na remada)
  const pt = chave === 'remada' ? 'mao' : 'quad'; const sa = A[pt], sb = B[pt];
  $('aSeta').setAttribute('d', `M${sa[0] + 30} ${sa[1]} L${sb[0] + 30} ${sb[1]}`);
  function pose(k) {
    const P = {}; ['tor', 'quad', 'omb', 'mao'].forEach(x => P[x] = mix(A[x], B[x], k));
    const joelho = ik(P.quad, P.tor, COXA, CANELA, A.jo), cot = ik(P.omb, P.mao, BRACO, ANTEB, A.co);
    const pe = [P.tor[0] + 26, CHAO];
    const dir = [P.omb[0] - P.quad[0], P.omb[1] - P.quad[1]], dl = Math.hypot(...dir);
    const cab = [P.omb[0] + dir[0] / dl * 22, P.omb[1] + dir[1] / dl * 22];
    L('aCx', P.quad, joelho); L('aCa', joelho, P.tor); L('aPe', P.tor, pe); L('aTr', P.quad, P.omb); L('aBr', P.omb, cot); L('aAb', cot, P.mao);
    $('aCb').setAttribute('cx', cab[0]); $('aCb').setAttribute('cy', cab[1]);
    const h = m.peso === 'barra-quadril' ? P.quad : P.mao;
    $('aPeso').innerHTML = m.peso === 'barra-quadril' ? `<rect x="${h[0] - 34}" y="${h[1] - 18}" width="68" height="6" rx="3"/><circle cx="${h[0]}" cy="${h[1] - 15}" r="16" fill="none" stroke="#ff6a00" stroke-width="7"/>`
      : `<rect x="${h[0] - 13}" y="${h[1] - 4}" width="26" height="8" rx="3"/><rect x="${h[0] - 16}" y="${h[1] - 9}" width="7" height="18" rx="2"/><rect x="${h[0] + 9}" y="${h[1] - 9}" width="7" height="18" rx="2"/>`;
  }
  if (quieto) { pose(1); return () => {}; }
  // ciclo de 3,2 s: 1,4 s descendo (excêntrica), 0,3 s embaixo, 1,0 s subindo, 0,5 s em cima
  const T = 3200; let id = 0; const t0 = performance.now();
  const loop = now => {
    if (!svg.isConnected) return; const x = ((now - t0) % T) / T;
    const k = x < .44 ? ease(x / .44) : x < .53 ? 1 : x < .84 ? 1 - ease((x - .53) / .31) : 0;
    pose(k); id = requestAnimationFrame(loop);
  };
  id = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(id);
}
