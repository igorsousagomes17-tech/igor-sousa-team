// PLANO DE CORRIDA (estilo Runna) — programa extra opcional, liberado nos dois planos.
// A aluna escolhe a meta (5, 10 ou 21 km), quantos dias corre na semana e a data da prova (opcional).
// O ritmo (pace) de cada treino sai de um teste ou de um tempo recente dela (VDOT de Daniels & Gilbert)
// e é recalculado quando ela faz um teste novo ou registra a prova. Sem tempo nenhum, o treino vai por esforço.
// Regras e fontes em docs/metodologia/corrida.md. O treino do dia é guiado por TEMPO (sem GPS):
// o app avisa a troca de bloco e o ritmo alvo; a distância de verdade fica no relógio/Strava dela.
import { $, $$, esc, beep } from './ui.js';
import { t, tp } from './i18n.js';
import { basalHora } from './kcal.js';

// VDOT --------------------------------------------------------------------------------------
// Daniels & Gilbert (1979): VO2 de uma velocidade (m/min) e % do VO2máx sustentável por t minutos.
const vo2De = v => -4.60 + 0.182258 * v + 0.000104 * v * v;
const fracDe = min => 0.8 + 0.1894393 * Math.exp(-0.012778 * min) + 0.2989558 * Math.exp(-0.1932605 * min);
const velDe = vo2 => (-0.182258 + Math.sqrt(0.182258 ** 2 + 4 * 0.000104 * (4.60 + vo2))) / (2 * 0.000104);
// VDOT de uma corrida (km, segundos). Fora de faixa razoável: null (tempo digitado errado).
export function vdotDe(km, seg) {
  if (!(km >= 1 && km <= 43) || !(seg > 0)) return null;
  const min = seg / 60, v = km * 1000 / min; if (v < 90 || v > 400) return null; // entre ~11:00/km e 2:30/km
  const x = vo2De(v) / fracDe(min); return x >= 15 && x <= 85 ? Math.round(x * 10) / 10 : null;
}
// Tempo previsto (s) pra uma distância com esse VDOT (busca binária)
export function previsao(vdot, km) {
  let a = km * 120, b = km * 900; // 2:00/km a 15:00/km
  for (let k = 0; k < 50; k++) { const m = (a + b) / 2, v = km * 1000 / (m / 60); if (vo2De(v) / fracDe(m / 60) > vdot) a = m; else b = m; }
  return Math.round((a + b) / 2);
}
// Zonas: fração do VDOT de cada ritmo (Daniels). Sem VDOT, cada zona vai pela sensação.
export const ZONAS = {
  caminhada: { nome: 'Caminhada', sens: 'Caminhada rápida, respirando fundo pra recuperar.' },
  trote: { nome: 'Trote', f: [0.58, 0.64], sens: 'Bem leve, só pra soltar e recuperar.' },
  leve: { nome: 'Leve', f: [0.62, 0.70], sens: 'Leve: dá pra conversar frases inteiras.' },
  moderado: { nome: 'Moderado', f: [0.78, 0.81], sens: 'Moderado: dá pra falar frases curtas.' },
  meia: { nome: 'Ritmo de meia', f: [0.83, 0.85], sens: 'Firme e constante: dá pra falar poucas palavras.' },
  limiar: { nome: 'Limiar', f: [0.86, 0.89], sens: 'Forte controlado: duas ou três palavras por vez.' },
  intervalo: { nome: 'Forte', f: [0.95, 0.99], sens: 'Forte: quase sem conseguir falar.' },
  tiro: { nome: 'Tiro', f: [1.03, 1.08], sens: 'Rápido e solto, curtinho. Sem travar o corpo.' },
  prova: { nome: 'Prova', sens: 'Ritmo de prova: o mesmo do começo ao fim.' }
};
const paceDeFrac = (vdot, f) => 60000 / velDe(vdot * f); // segundos por km
// Ritmo alvo [rápido, lento] em s/km. Prova usa a previsão da meta.
export function ritmo(vdot, zona, km) {
  if (!vdot) return null;
  if (zona === 'prova' && km) { const p = previsao(vdot, km) / km; return [p - 3, p + 3]; }
  const z = ZONAS[zona]; if (!z?.f) return null;
  return [Math.round(paceDeFrac(vdot, z.f[1])), Math.round(paceDeFrac(vdot, z.f[0]))];
}
export const fmtPace = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
export const fmtTempo = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
// "30:00", "1:52:10", "28" (minutos) → segundos
export function lerTempo(txt) {
  const p = String(txt || '').trim().replace(/[^\d:]/g, '').split(':').filter(x => x !== '').map(Number); if (!p.length || p.some(isNaN)) return null;
  if (p.length === 1) return p[0] * 60; if (p.length === 2) return p[0] * 60 + p[1]; return p[0] * 3600 + p[1] * 60 + p[2];
}

// METAS -------------------------------------------------------------------------------------
export const METAS = {
  '5k': { km: 5, nome: '5 km', min: 6, padrao: 8, longo: [30, 50], leve: [25, 35] },
  '10k': { km: 10, nome: '10 km', min: 8, padrao: 10, longo: [40, 75], leve: [25, 40] },
  '21k': { km: 21.0975, nome: '21 km', min: 10, padrao: 12, longo: [50, 115], leve: [30, 50] }
};
export const MAX_SEMANAS = 16;
// Semanas até a prova (conta a semana da prova). Sem data: o padrão da meta.
export function semanasAte(prova, hoje = new Date()) {
  if (!prova) return null; const d = new Date(prova + 'T12:00:00'); if (isNaN(d)) return null;
  return Math.ceil((d - segundaDe(hoje)) / (7 * 86400000));
}
export function segundaDe(d = new Date()) { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

// GERADOR -----------------------------------------------------------------------------------
const B = (nome, min, zona, dica, nv) => ({ nome, seg: Math.round(min * 60), zona, dica, ...(nv ? { nv } : {}) });
// Nome em português com as partes preenchidas (título que vai pro histórico/painel do Igor)
export const nomePt = x => String(x.nome).replace(/\{(\w+)\}/g, (m, k) => x.nv?.[k] ?? m);
export const nomeT = x => t(x.nome, x.nv && Object.fromEntries(Object.entries(x.nv).map(([k, v]) => [k, typeof v === 'string' ? t(v) : v])));
const rep = (n, ...bl) => Array.from({ length: n }, () => bl.map(b => ({ ...b }))).flat();
const r5 = x => Math.max(5, Math.round(x / 5) * 5);
const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
const aquece = (m = 10) => B('Aquecimento', m, 'leve', 'Começa devagar. Os primeiros minutos são pra o corpo esquentar.');
const desaquece = (m = 8) => B('Desaquecimento', m, 'trote', 'Solta o ritmo. Pode terminar caminhando.');

export function fase(w, n, meta) {
  if (w === n - 1) return 'prova';
  if (meta === '21k' && w === n - 2 && n >= 10) return 'polimento';
  if (w === n - 2) return 'polimento';
  if (w < Math.round(n * 0.4)) return 'base';
  if (w < n - 3) return 'construcao';
  return 'pico';
}
export const FASES = {
  base: { nome: 'Base', txt: 'Construir o fôlego: quase tudo leve, com acelerações curtas.' },
  construcao: { nome: 'Construção', txt: 'Entram os treinos de ritmo: limiar e tiros controlados.' },
  pico: { nome: 'Pico', txt: 'Semanas mais fortes, com treino no ritmo da prova.' },
  polimento: { nome: 'Polimento', txt: 'Menos volume pra chegar descansada e afiada.' },
  prova: { nome: 'Semana da prova', txt: 'Treino curto, sono em dia e confiança. Agora é aproveitar.' }
};
// Semana de alívio a cada 4 (volume 80%): o corpo absorve o treino
const alivio = (w, f) => (w + 1) % 4 === 0 && (f === 'base' || f === 'construcao' || f === 'pico');

// Corre/caminha pra quem ainda não corre 20 min seguidos (progressão estilo "do sofá aos 5 km")
const CC = [[1, 2, 8], [2, 2, 6], [3, 2, 5], [4, 2, 4], [5, 2, 4], [6, 1, 4], [8, 2, 3], [10, 2, 2], [12, 1, 2], [15, 1, 2], [20, 0, 1], [25, 0, 1], [30, 0, 1]];
export const SEMANAS_COMECO = 10;
function correCaminha(w, n) {
  // Sobe no máximo um degrau por semana; com prazo longo, chega nos 30 min contínuos antes da prova
  const st = CC[Math.min(CC.length - 1, w, Math.round(w * (CC.length - 1) / Math.max(1, n - 2)))];
  const [corre, anda, vezes] = st;
  const blocos = [B('Caminhada de aquecimento', 5, 'caminhada', 'Caminha firme, balançando os braços.')];
  for (let k = 0; k < vezes; k++) { blocos.push(B('Corre', corre, 'leve', 'Corre bem devagar: se não der pra conversar, diminui.')); if (anda && k < vezes - 1) blocos.push(B('Caminha', anda, 'caminhada', 'Caminha e recupera o fôlego.')); }
  if (!anda) blocos[1] = B('Corrida contínua', corre, 'leve', 'Bem devagar e sem parar. Se precisar, caminha 1 min e volta.');
  blocos.push(B('Caminhada final', 5, 'caminhada', 'Caminha soltando as pernas.'));
  return { tipo: 'leve', nome: anda ? 'Corre {a} min / caminha {b} min' : 'Corrida contínua {a} min', nv: { a: corre, b: anda }, blocos };
}

function qualidade(f, meta, w, n, k, deload) {
  const p = w / Math.max(1, n - 2), d = deload ? 0.8 : 1;
  if (f === 'base') return { tipo: 'qualidade', nome: 'Leve + acelerações', blocos: [B('Corrida leve', r5(lerp(20, 30, p) * d), 'leve', 'Leve de verdade: é aqui que o fôlego cresce.'), ...rep(6, B('Aceleração', 20 / 60, 'tiro', 'Acelera solto por 20 s.'), B('Trote', 100 / 60, 'trote', 'Recupera trotando.')), desaquece(5)] };
  if (f === 'polimento' || f === 'prova') return { tipo: 'qualidade', nome: 'Ritmo de prova curto', blocos: [aquece(), ...rep(f === 'prova' ? 3 : 4, B('Ritmo de prova', meta === '5k' ? 2 : 3, 'prova', 'Sente o ritmo da prova: confortável e firme.'), B('Trote', 2, 'trote', 'Recupera.')), desaquece(6)] };
  // construção e pico: alterna limiar e tiros (k = qual sessão de qualidade da semana)
  const limiar = (w + k) % 2 === 0;
  if (f === 'pico' && !limiar) {
    if (meta === '5k') return { tipo: 'qualidade', nome: 'Tiros longos', blocos: [aquece(), ...rep(deload ? 4 : 5, B('Forte', 4, 'intervalo', 'Forte e igual em todos os tiros.'), B('Trote', 2.5, 'trote', 'Recupera trotando, sem parar.')), desaquece()] };
    if (meta === '10k') return { tipo: 'qualidade', nome: 'Limiar longo', blocos: [aquece(), B('Limiar', deload ? 10 : 12, 'limiar', 'Forte controlado, constante.'), B('Trote', 3, 'trote', 'Recupera.'), B('Limiar', deload ? 8 : 12, 'limiar', 'Mesmo ritmo do primeiro.'), desaquece()] };
    return { tipo: 'qualidade', nome: 'Ritmo de meia', blocos: [aquece(), ...rep(deload ? 2 : 3, B('Ritmo de meia', 10, 'meia', 'O ritmo que você vai segurar na prova.'), B('Trote', 2, 'trote', 'Recupera.')), desaquece()] };
  }
  if (limiar) {
    const reps = Math.round(lerp(3, 4, p)), m = Math.round(lerp(5, 8, p));
    return { tipo: 'qualidade', nome: 'Limiar', blocos: [aquece(), ...rep(deload ? reps - 1 : reps, B('Limiar', m, 'limiar', 'Forte controlado: dá pra falar duas ou três palavras.'), B('Trote', 1, 'trote', 'Recupera trotando.')), desaquece()] };
  }
  const reps = Math.round(lerp(4, 6, p));
  return { tipo: 'qualidade', nome: 'Tiros de 3 min', blocos: [aquece(), ...rep(deload ? reps - 1 : reps, B('Forte', 3, 'intervalo', 'Forte, mas igual do 1º ao último.'), B('Trote', 2, 'trote', 'Recupera trotando.')), desaquece()] };
}

function leve(f, meta, w, n, deload) {
  const M = METAS[meta], p = w / Math.max(1, n - 2), d = deload ? 0.8 : f === 'polimento' ? 0.7 : f === 'prova' ? 0.6 : 1;
  return { tipo: 'leve', nome: 'Corrida leve', blocos: [B('Corrida leve', r5(lerp(M.leve[0], M.leve[1], p) * d), 'leve', 'Leve de verdade: se não der pra conversar, diminui.')] };
}
function longao(f, meta, w, n, deload) {
  const M = METAS[meta], p = w / Math.max(1, n - 3), d = deload ? 0.8 : f === 'polimento' ? 0.6 : 1, min = Math.min(120, r5(lerp(M.longo[0], M.longo[1], p) * d));
  // No pico da meia, os últimos minutos do longão vão no ritmo de meia (treina o fim da prova)
  if (meta === '21k' && f === 'pico' && !deload) return { tipo: 'longao', nome: 'Longão com final forte', blocos: [B('Longão leve', min - 20, 'leve', 'Leve e constante. Leva água se passar de 60 min.'), B('Final no ritmo de meia', 20, 'meia', 'Termina firme, no ritmo da prova.')] };
  return { tipo: 'longao', nome: 'Longão', blocos: [B('Longão leve', min, 'leve', min >= 60 ? 'Leve e constante. Leva água e um gel ou fruta se passar de 75 min.' : 'Leve e constante. O objetivo é o tempo, não a velocidade.')] };
}
const teste = (vdot) => ({ tipo: 'teste', nome: 'Teste de 3 km', blocos: [aquece(10), B('Teste: 3 km', (vdot ? previsao(vdot, 3) : 18 * 60) / 60, 'intervalo', 'O mais rápido que você consegue manter os 3 km inteiros. Marca o tempo no relógio ou no celular.'), desaquece(5)] });
const prova = (meta, vdot, comeco) => {
  const M = METAS[meta], est = vdot ? previsao(vdot, M.km) : (comeco ? 8.5 : 7) * 60 * M.km;
  return { tipo: 'prova', nome: 'Prova: {k}', nv: { k: M.nome }, blocos: [B('Aquecimento leve', 8, 'leve', 'Trote leve e 3 acelerações curtas. Nada de cansar antes da largada.'), B('Prova: {k}', est / 60, 'prova', 'Começa contida nos primeiros quilômetros. Se sobrar, acelera no fim.', { k: M.nome })] };
};

// Plano inteiro. cfg = { meta, dias (2–4), semanas, vdot, comeco }
export function gerarPlano(cfg) {
  const meta = METAS[cfg.meta] ? cfg.meta : '5k', n = Math.max(4, Math.min(MAX_SEMANAS, cfg.semanas || (cfg.comeco && meta === '5k' ? SEMANAS_COMECO : METAS[meta].padrao))), dias = Math.max(2, Math.min(4, cfg.dias || 3));
  const comeco = !!cfg.comeco && meta === '5k', vdot = comeco ? null : cfg.vdot || null, semanas = [];
  for (let w = 0; w < n; w++) {
    const f = fase(w, n, meta), dl = alivio(w, f); let s;
    if (comeco) {
      s = Array.from({ length: dias }, (_, j) => correCaminha(w, n));
      if (f === 'prova') s[s.length - 1] = prova(meta, null, true);
    } else {
      const q1 = w === 3 && n >= 8 ? teste(vdot) : qualidade(f, meta, w, n, 0, dl), lv = leve(f, meta, w, n, dl), lg = longao(f, meta, w, n, dl);
      s = dias === 2 ? [q1, lg] : dias === 3 ? [q1, lv, lg] : [q1, lv, f === 'base' || f === 'polimento' ? leve(f, meta, w, n, dl) : qualidade(f, meta, w, n, 1, dl), lg];
      if (f === 'prova') { s = dias === 2 ? [qualidade(f, meta, w, n, 0, false)] : [qualidade(f, meta, w, n, 0, false), leve(f, meta, w, n, false)]; s.push(prova(meta, vdot)); }
    }
    semanas.push({ n: w, fase: f, alivio: dl, sessoes: s.map((x, j) => ({ ...x, id: `c${w}-${j}`, sem: w, ordem: j, min: Math.round(x.blocos.reduce((a, b) => a + b.seg, 0) / 60) })) });
  }
  return { meta, km: METAS[meta].km, n, dias, comeco, vdot, semanas };
}

// Semana em que ela está (0 = 1ª), a partir da segunda-feira em que começou
export const semanaAtual = (inicio, hoje = new Date()) => Math.floor((segundaDe(hoje) - segundaDe(new Date(inicio + 'T12:00:00'))) / (7 * 86400000));
// Próxima sessão: a 1ª não feita da semana atual (se a semana acabou, a 1ª da próxima)
export function proxima(plano, inicio, feitos = {}, hoje = new Date()) {
  const w = Math.max(0, Math.min(plano.n - 1, semanaAtual(inicio, hoje)));
  for (let k = w; k < plano.n; k++) { const s = plano.semanas[k].sessoes.find(x => !feitos[x.id]); if (s) return s; }
  return null;
}
export const sessaoPorId = (plano, id) => plano.semanas.flatMap(s => s.sessoes).find(x => x.id === id) || null;

// KCAL --------------------------------------------------------------------------------------
// ACSM: corrida VO2 = 0,2·v + 3,5; caminhada VO2 = 0,1·v + 3,5 (v em m/min). MET = VO2/3,5. Sem VDOT: velocidade típica da zona.
const VEL = { caminhada: 95, trote: 125, leve: 135, moderado: 150, meia: 160, limiar: 165, intervalo: 180, tiro: 200, prova: 160 };
function metBloco(b, vdot, km) {
  if (b.zona === 'caminhada') return (0.1 * VEL.caminhada + 3.5) / 3.5;
  const r = ritmo(vdot, b.zona, km), v = r ? 60000 / ((r[0] + r[1]) / 2) : VEL[b.zona] || 135;
  return (0.2 * v + 3.5) / 3.5;
}
export function kcalSessao(perfil, s, vdot, km, segFeitos = null) {
  const bh = basalHora(perfil); if (!bh) return null; let rest = segFeitos ?? Infinity, k = 0;
  for (const b of s.blocos) { const x = Math.min(b.seg, rest); if (x <= 0) break; k += bh * metBloco(b, vdot, km) * x / 3600; rest -= x; }
  return Math.max(5, Math.round(k / 5) * 5);
}

// TELAS -------------------------------------------------------------------------------------
const nomeZona = z => t(ZONAS[z]?.nome || z);
export function alvo(b, vdot, km) {
  const r = ritmo(vdot, b.zona, km);
  return r ? `${fmtPace(r[0])}–${fmtPace(r[1])} /km` : t(ZONAS[b.zona]?.sens || '');
}
const COR = { caminhada: '#3a3a40', trote: '#4a4a52', leve: '#6a6a72', moderado: '#a84a0a', meia: '#c75a0c', limiar: '#e0650d', intervalo: '#ff6a00', tiro: '#ff8a30', prova: '#ff6a00' };
const ALT = { caminhada: 6, trote: 9, leve: 13, moderado: 18, meia: 21, limiar: 24, intervalo: 30, tiro: 34, prova: 26 };
export const trilha = (s, grande) => `<div class="spin-trilha ${grande ? 'grande' : ''}" ${grande ? 'id="cTrilha"' : 'aria-hidden="true"'}>${s.blocos.map(b => `<i style="flex:${b.seg};height:${ALT[b.zona] || 12}px;background:${COR[b.zona] || '#555'}"></i>`).join('')}</div>`;

export function htmlPlayer(s, cfg, perfil) {
  const k = kcalSessao(perfil, s, cfg.vdot, METAS[cfg.meta]?.km);
  return `<div class="card hero" style="color:#1a0d00"><span class="pill" style="background:rgba(0,0,0,.18);color:#1a0d00" id="cZona">${t('Pronta?')}</span>
    <h1 id="cNome" style="font-size:clamp(1.6rem,8vw,2.3rem);line-height:1.08;margin:8px 0 4px;color:#1a0d00">${esc(nomeT(s))}</h1>
    <p style="font-weight:700;font-size:1.15rem" id="cAlvo">${t('Toca em começar quando estiver na rua ou na esteira.')}</p></div>
  <p class="muted" id="cDica">${t('O app avisa com apito cada troca de ritmo. Deixa o som ligado.')}</p>
  <div class="row" style="gap:10px"><div class="card" style="flex:1;padding:10px 12px"><p class="muted small">${t('Tempo do bloco')}</p><b class="spin-big" id="cTempo">0:00</b></div><div class="card" style="flex:1;padding:10px 12px"><p class="muted small">${t('Total')}</p><b class="spin-big" id="cTot">0:00</b></div></div>
  <div class="spin-barra"><i id="cProg"></i></div>
  <p class="muted small" id="cProx"></p>
  ${trilha(s, true)}
  <p class="muted small center">${t('Treino de {n} min', { n: s.min })}${k ? ` · ~${t('{n} kcal', { n: k })}` : ''} · ${tp(s.blocos.length, '{n} bloco', '{n} blocos')}</p>
  <div class="row" style="gap:10px"><button class="btn ghost sm" id="cPausa" style="flex:0 0 120px" disabled>${t('Pausar')}</button><button class="btn" id="cGo" style="flex:1">▶ ${t('Começar')}</button></div>
  <button class="link-fim" id="cSair">${t('Sair do treino')}</button>`;
}

// Controla o treino guiado. Igual ao player do spinning: o tempo conta pelo relógio (tela apagada não atrasa).
export function iniciarPlayer(s, cfg, { aoTerminar, aoSair, manterTela, soltarTela, retomar = null, salvar = () => {} }) {
  const km = METAS[cfg.meta]?.km, total = s.blocos.reduce((a, b) => a + b.seg, 0);
  let i = -1, fimBloco = 0, resta = 0, feito = 0, rodando = false, pausado = false, vivo = true, ultimoBipe = -1, comecouEm = 0, ultSalvo = 0, timer = 0;
  const fmt = x => fmtTempo(Math.max(0, Math.ceil(x)));
  function mostra() {
    const b = s.blocos[i], p = s.blocos[i + 1];
    $('#cZona').textContent = nomeZona(b.zona); $('#cNome').textContent = nomeT(b); $('#cAlvo').textContent = alvo(b, cfg.vdot, km); $('#cDica').textContent = t(b.dica || ZONAS[b.zona]?.sens || '');
    $('#cProx').innerHTML = p ? `${t('Próximo:')} <b>${esc(nomeT(p))}</b> · ${fmt(p.seg)} · ${esc(alvo(p, cfg.vdot, km))}` : t('Último bloco! Segura que tá acabando.');
    $$('#cTrilha i').forEach((x, k) => { x.style.opacity = k < i ? '.35' : '1'; x.style.boxShadow = k === i ? '0 0 0 2px rgba(255,106,0,.45)' : ''; });
  }
  function proximo(pulou) {
    if (pulou && i >= 0 && !pausado) resta = (fimBloco - Date.now()) / 1000; // pulou: conta o que correu até agora (não o último quadro)
    if (i >= 0) feito += pulou ? s.blocos[i].seg - Math.max(0, resta) : s.blocos[i].seg;
    i++; if (i >= s.blocos.length) return fim();
    const agora = Date.now(); fimBloco = (pulou || i === 0 || fimBloco <= 0 ? agora : fimBloco) + s.blocos[i].seg * 1000; resta = (fimBloco - agora) / 1000; ultimoBipe = -1;
    beep(i ? 'forte' : 'fim'); try { navigator.vibrate?.([120, 80, 120]); } catch {} mostra();
  }
  const estado = () => ({ id: s.id, i, resta: Math.max(0, resta), feito, em: Date.now() });
  function fim() { rodando = false; vivo = false; clearInterval(timer); soltarTela?.(); salvar(null); aoTerminar({ seg: Math.round(feito), total }); }
  function tick() {
    if (!vivo) return; if (!document.getElementById('cTempo')) { vivo = false; clearInterval(timer); soltarTela?.(); return; }
    if (rodando && !pausado) {
      resta = (fimBloco - Date.now()) / 1000; const x = Math.ceil(resta);
      if (x <= 3 && x > 0 && x !== ultimoBipe && s.blocos[i + 1]) { ultimoBipe = x; beep('leve'); }
      if (resta <= 0) proximo(false);
      if (vivo && Date.now() - ultSalvo > 5000) { ultSalvo = Date.now(); salvar(estado()); }
    }
    if (vivo && i >= 0 && s.blocos[i]) { const fz = feito + s.blocos[i].seg - Math.max(0, resta); $('#cTempo').textContent = fmt(resta); $('#cTot').textContent = fmt(fz); $('#cProg').style.width = (fz / total * 100).toFixed(1) + '%'; }
  }
  const comecou = () => { rodando = true; comecouEm = Date.now(); manterTela?.(); $('#cGo').textContent = '⏭ ' + t('Pular bloco'); $('#cGo').classList.add('ghost'); $('#cPausa').disabled = false; $('#cPausa').classList.remove('ghost'); };
  const pausa = p => { pausado = p; if (!p) { fimBloco = Date.now() + resta * 1000; manterTela?.(); } $('#cPausa').textContent = p ? t('Seguir') : t('Pausar'); if (vivo) salvar(estado()); };
  $('#cGo').onclick = () => { if (!rodando) { comecou(); proximo(false); salvar(estado()); } else if (Date.now() - comecouEm > 1200) { proximo(true); salvar(estado()); } };
  $('#cPausa').onclick = () => { if (rodando) pausa(!pausado); };
  $('#cSair').onclick = () => { const fez = feito + (i >= 0 && s.blocos[i] ? s.blocos[i].seg - Math.max(0, resta) : 0), estava = pausado; if (rodando && !pausado) pausa(true); aoSair({ seg: Math.round(fez), total, comecou: rodando, voltar: () => { if (vivo && rodando && !estava) pausa(false); } }); };
  if (retomar && s.blocos[retomar.i]) { i = retomar.i; resta = Math.min(s.blocos[i].seg, retomar.resta); feito = retomar.feito || 0; comecou(); pausa(true); mostra(); tick(); }
  timer = setInterval(tick, 250);
  return () => { vivo = false; clearInterval(timer); soltarTela?.(); };
}
