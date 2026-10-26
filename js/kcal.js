// GASTO CALÓRICO ESTIMADO de cada treino, a partir do peso, altura, idade e sexo da aluna.
// Método: MET da atividade (Compendium of Physical Activities, 2024) × taxa metabólica basal por hora (Mifflin-St Jeor).
// 1 MET = gasto em repouso; usar a basal DELA (e não o padrão de 3,5 ml/kg/min) deixa a conta mais justa
// pra quem é mais leve, mais velha ou mais baixa (Kozey et al., 2010: MET padrão superestima em mulheres).
// É estimativa: sempre mostrado como "~" e arredondado de 5 em 5.

// MET por tipo de bloco
export const MET = {
  musculacao: 3.5,   // musculação com descanso normal (Compendium 02054)
  biset: 5.0,        // musculação em bi-set / pouco descanso (02052 vigorosa)
  express: 5.5,      // versão express: mesma carga, menos descanso
  hiit: 8.0,         // HIIT/cardio intervalado vigoroso
  mobilidade: 2.3,   // alongamento/mobilidade
  core: 3.8,         // abdômen/core
  caminhada: 3.5,
};
// Bike de spinning pelo esforço (0–10) do bloco: leve 4,0 · moderado 5,5–7,0 · vigoroso 8,8 · máximo 11 (Compendium 02010–02017)
export const metBike = esf => esf <= 2 ? 3.5 : esf <= 3 ? 4.0 : esf <= 4 ? 5.0 : esf <= 5 ? 6.0 : esf <= 6 ? 7.0 : esf <= 7 ? 8.0 : esf <= 8 ? 8.8 : esf <= 9 ? 10.0 : 11.0;

function idadeDe(p) { if (!p?.nascimento) return null; const i = Math.floor((Date.now() - new Date(p.nascimento)) / 31557600000); return i >= 14 && i <= 90 ? i : null; }
// Basal por hora (kcal/h). Sem altura ou idade, usa a conta por peso (1 kcal/kg/h). Sem peso: null.
export function basalHora(p) {
  const kg = +p?.peso_kg; if (!(kg >= 30 && kg <= 250)) return null;
  const alt = +p?.altura_m, id = idadeDe(p);
  if (alt >= 1.2 && alt <= 2.2 && id) return (10 * kg + 6.25 * alt * 100 - 5 * id + (p.sexo === 'M' ? 5 : -161)) / 24;
  return kg * 1.0;
}
const arred = k => Math.max(5, Math.round(k / 5) * 5);
// kcal de X minutos numa atividade de MET m
export function kcalMin(p, minutos, met) { const b = basalHora(p); return b ? arred(b * met * minutos / 60) : null; }
// Treino de musculação do app: bi-set e express gastam mais; HIIT/cardio do fim conta à parte
export function kcalTreino(p, exercicios, minutos, { express = false } = {}) {
  const b = basalHora(p); if (!b || !minutos) return null;
  const hiit = exercicios.filter(e => /hiit|cardio/i.test(e.nome)), mob = exercicios.filter(e => /mobilidade|alongamento|ativa[çc][ãa]o/i.test(e.nome));
  const minHiit = Math.min(minutos * .4, hiit.length * 8), minMob = Math.min(minutos * .2, mob.length * 2.5), resto = Math.max(0, minutos - minHiit - minMob);
  const temBiset = exercicios.some(e => e.biset_com);
  const met = express ? MET.express : temBiset ? MET.biset : MET.musculacao;
  return arred(b * (resto * met + minHiit * MET.hiit + minMob * MET.mobilidade) / 60);
}
// Depois do treino: tempo real + esforço que ela marcou (Borg 0–10) ajustam o MET da musculação
export function kcalFeito(p, minutos, esforco, { hiit = false } = {}) {
  const b = basalHora(p); if (!b || !minutos) return null;
  const met = Math.max(3, Math.min(6.5, 3.5 + ((esforco ?? 6) - 5) * 0.45)) + (hiit ? 0.8 : 0);
  return arred(b * met * minutos / 60);
}
// Aula de spinning: soma bloco a bloco pelo esforço
export function kcalSpin(p, blocos, segundosFeitos = null) {
  const b = basalHora(p); if (!b) return null; let rest = segundosFeitos ?? Infinity, k = 0;
  for (const x of blocos) { const s = Math.min(x.seg, rest); if (s <= 0) break; k += b * metBike(x.esf) * s / 3600; rest -= s; }
  return arred(k);
}
export const faltaDado = p => !basalHora(p);
