// META DE ÁGUA DO DIA (aprovada pelo Igor em 08/11/2026).
// Conta: 35 ml por kg (peso da anamnese) + 500 ml por hora de treino finalizado no dia + gestação (+300) ou pós-parto (+700, EFSA p/ lactação).
// Travas: nunca abaixo de 1,6 L (EFSA: água vinda de líquidos p/ mulheres) nem acima de 4 L. Sem peso: 2,0 L (EFSA mulheres).
// Ela pode trocar a meta na mão (médico/nutri passou outro valor). Nunca tira ponto: só mostra progresso e a semana em bolinhas.
// Fica guardado no celular (abre sem sinal); guarda só os últimos 14 dias.
import { t, tp, dec } from './i18n.js';

const MIN = 1600, MAX = 4000, PADRAO = 2000;
const arred = ml => Math.round(ml / 50) * 50;
export const diaDe = (d = new Date()) => { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Minutos de treino finalizado hoje (treino do app, presencial, spinning, Hyrox...). Máx. 3 h pra não estourar.
export function minutosTreinoHoje(sessoes = [], hoje = diaDe()) {
  const s = sessoes.filter(x => x.finalizada_em && diaDe(x.finalizada_em) === hoje).reduce((a, x) => a + (+x.duracao_s || 0), 0);
  return Math.min(180, Math.round(s / 60));
}
// { ml, auto, base, treino, extra, semPeso }
export function metaDia(p, minTreino = 0, manual = null) {
  const kg = +p?.peso_kg, temPeso = kg >= 30 && kg <= 250;
  const base = temPeso ? kg * 35 : PADRAO;
  const treino = minTreino >= 10 ? minTreino / 60 * 500 : 0; // treino de menos de 10 min não muda a meta
  const extra = p?.gestacao === 'gravida' ? 300 : p?.gestacao === 'pos_parto' ? 700 : 0;
  const auto = arred(Math.min(MAX, Math.max(MIN, base + treino + extra)));
  const m = +manual;
  return { ml: m >= 500 && m <= 6000 ? arred(m) : auto, auto, base: arred(base), treino: arred(treino), extra, semPeso: !temPeso, manual: m >= 500 && m <= 6000 };
}

// Guardado: { 'AAAA-MM-DD': { goles: [250, 500, ...], meta: 2450 } }
export function ler(LS) { return LS.get('agua', {}) || {}; }
function gravar(LS, dados) { const ks = Object.keys(dados).sort().slice(-14), out = {}; ks.forEach(k => out[k] = dados[k]); LS.set('agua', out); }
export const totalDe = d => (d?.goles || []).reduce((a, x) => a + x, 0);
export function adicionar(LS, ml, meta, hoje = diaDe()) { const d = ler(LS); const h = d[hoje] || { goles: [] }; h.goles = [...h.goles, ml]; h.meta = meta; d[hoje] = h; gravar(LS, d); return totalDe(h); }
export function desfazer(LS, meta, hoje = diaDe()) { const d = ler(LS); const h = d[hoje]; if (!h?.goles?.length) return 0; h.goles = h.goles.slice(0, -1); h.meta = meta; d[hoje] = h; gravar(LS, d); return totalDe(h); }

// Últimos 7 dias (o de hoje por último): bateu a meta daquele dia?
export function semana(LS, metaHoje, hoje = new Date()) {
  const d = ler(LS);
  return Array.from({ length: 7 }, (_, i) => { const dia = new Date(hoje); dia.setDate(dia.getDate() - (6 - i)); const k = diaDe(dia), r = d[k]; const tot = totalDe(r); return { k, bateu: tot > 0 && tot >= (k === diaDe(hoje) ? metaHoje : (r?.meta || metaHoje)), hoje: i === 6, letra: dia.toLocaleDateString(undefined, { weekday: 'narrow' }) }; });
}

const L = ml => dec(Math.round(ml / 100) / 10) + ' L';
function frase(tot, meta, treino) {
  const pct = tot / meta;
  if (pct >= 1) return t('Meta batida! 💧 Seu corpo agradece.');
  if (!tot) return treino ? t('Dia de treino: sua meta subiu um pouco. Bora começar?') : t('Bora começar? Um copo agora já conta.');
  if (pct >= .75) return t('Quase lá: falta {x}.', { x: L(meta - tot) });
  if (pct >= .4) return t('Metade do caminho. Deixa a garrafa por perto.');
  return t('Boa! Cada copo conta.');
}

export function cardHtml(p, sessoes, LS) {
  const min = minutosTreinoHoje(sessoes), m = metaDia(p, min, LS.get('aguaMetaManual', null)), hoje = ler(LS)[diaDe()], tot = totalDe(hoje);
  const pct = Math.min(1, tot / m.ml), C = 2 * Math.PI * 34, sem = semana(LS, m.ml);
  const det = m.manual ? t('Meta que você definiu') : m.semPeso ? t('Meta padrão: completa seu peso pra ela ficar do seu tamanho') : m.treino ? t('Pelo seu peso + {x} do treino de hoje', { x: L(m.treino) }) : t('Meta estimada pelo seu peso');
  return `<div class="card agua" id="agua">
  <div class="row between"><b style="font-size:1rem">💧 ${t('Água de hoje')}</b><button class="back small" id="aguaAjusta" style="color:var(--accent)">${t('ajustar')}</button></div>
  <div class="row agua-c" style="gap:14px;margin-top:8px">
    <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label="${t('{a} de {b}', { a: L(tot), b: L(m.ml) })}"><circle cx="42" cy="42" r="34" fill="none" stroke="#2a2a2e" stroke-width="8"/><circle cx="42" cy="42" r="34" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 42 42)" style="transition:stroke-dashoffset .4s"/><text x="42" y="42" text-anchor="middle" fill="var(--fg)" style="font-size:15px;font-weight:700">${L(tot)}</text><text x="42" y="57" text-anchor="middle" fill="var(--muted)" style="font-size:10px">${t('de {x}', { x: L(m.ml) })}</text></svg>
    <div style="flex:1;min-width:0"><p style="font-weight:600;line-height:1.35">${frase(tot, m.ml, m.treino)}</p><p class="muted small" style="margin-top:4px">${det}</p></div>
  </div>
  <div class="row" style="gap:8px;margin-top:10px"><button class="btn sm" data-agua="250" style="flex:1">+ ${t('Copo')} <small>250 ml</small></button><button class="btn sm" data-agua="500" style="flex:1">+ ${t('Garrafa')} <small>500 ml</small></button></div>
  <div class="row between" style="margin-top:10px"><div class="row" style="gap:6px" aria-label="${t('Últimos 7 dias')}">${sem.map(d => `<span class="agua-d${d.hoje ? ' hj' : ''}"><i class="dot ${d.bateu ? 'on' : ''}"></i><small>${d.letra}</small></span>`).join('')}</div>${tot ? `<button class="back small" id="aguaDesfaz">↺ ${t('desfazer')}</button>` : ''}</div>
  <div id="aguaForm" hidden style="margin-top:10px"><p class="muted small">${t('O médico ou a nutri passou outro valor? Coloca aqui (em litros).')}</p><div class="row" style="gap:8px;margin-top:6px"><input id="aguaL" inputmode="decimal" placeholder="${dec(m.auto / 1000)}" value="${m.manual ? dec(m.ml / 1000) : ''}" aria-label="${t('Meta em litros')}" style="flex:1"><button class="btn sm" id="aguaSalva" style="width:auto">${t('Salvar')}</button></div>${m.manual ? `<button class="back small" id="aguaAuto" style="margin-top:6px;text-decoration:underline">${t('Voltar pra meta automática ({x})', { x: L(m.auto) })}</button>` : ''}</div>
</div>`;
}

// Liga os botões. redesenha() recria só o card (sem recarregar o Início).
export function ligar(p, sessoes, LS, { $, toast }) {
  const card = $('#agua'); if (!card) return;
  const meta = () => metaDia(p, minutosTreinoHoje(sessoes), LS.get('aguaMetaManual', null)).ml;
  const redesenha = () => { const el = $('#agua'); if (!el) return; el.outerHTML = cardHtml(p, sessoes, LS); ligar(p, sessoes, LS, { $, toast }); };
  card.querySelectorAll('[data-agua]').forEach(b => b.onclick = () => {
    const antes = totalDe(ler(LS)[diaDe()]), m = meta(), tot = adicionar(LS, +b.dataset.agua, m);
    if (navigator.vibrate) try { navigator.vibrate(15); } catch {}
    redesenha(); if (antes < m && tot >= m) toast(t('Meta de água batida! 💧'));
  });
  const dz = $('#aguaDesfaz'); if (dz) dz.onclick = () => { desfazer(LS, meta()); redesenha(); };
  $('#aguaAjusta').onclick = () => { const f = $('#aguaForm'); f.hidden = !f.hidden; if (!f.hidden) $('#aguaL').focus(); };
  $('#aguaSalva').onclick = () => {
    const v = parseFloat(String($('#aguaL').value).replace(',', '.'));
    if (!(v >= 0.5 && v <= 6)) { toast(t('Coloca um valor entre 0,5 e 6 litros.'), true); return; }
    LS.set('aguaMetaManual', Math.round(v * 1000)); redesenha(); toast(t('Meta de água salva ✓'));
  };
  const au = $('#aguaAuto'); if (au) au.onclick = () => { LS.del('aguaMetaManual'); redesenha(); };
}
