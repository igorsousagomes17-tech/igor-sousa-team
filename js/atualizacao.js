// Atualização mensal automática (planejada em 25/11, ainda não lançada).
// Motor puro, sem tela e sem banco: a partir do treino base do mês monta a versão de cada aluna,
// confere as regras do Igor e mede o quanto duas alunas ficaram parecidas.
//
// Regras do Igor que este arquivo segue:
// - Cada aluna parte do que ela já faz: os exercícios dos últimos 4-5 treinos dela no Mfit (histórico)
//   ficam. Muita gente treina em academia de prédio, então exercício diferente ela não consegue fazer.
// - Acrescentar só com halter (nunca máquina), ou mobilidade/abdômen sem aparelho, e só exercício autorizado:
//   os que ele cadastrou no Mfit ou os que estão na biblioteca do app.
// - Amigas não podem ficar com o treino uma a cara da outra (limite de parecido menor entre amigas).
// - Fechamento do treino no sábado ou domingo, treino novo começa na segunda.
// - Nunca duas máquinas num bi-set, e o exercício B do bi-set com halter.
// O histórico do Mfit chega aqui só na hora de montar o treino daquela aluna e não é guardado.

export const LIMITE_GERAL = 60;   // % máximo de igual entre duas alunas quaisquer
export const LIMITE_AMIGAS = 40;  // % máximo de igual entre amigas marcadas no painel
export const SEMANAS = 4;         // duração padrão do treino novo (segunda até domingo, 4 semanas)

// ---------- nomes ----------
export const chave = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[°º]/g, ' ').replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

// Equipamento pelo nome (o Igor escreve o aparelho no nome do exercício). A ordem importa:
// "agachamento goblet com halter" é halter mesmo tendo "agachamento".
export function equipamento(nome) {
  const n = chave(nome);
  if (/\b(halter|halteres|dumbbell|goblet|kettlebell|kettle|arnold)\b/.test(n)) return 'halter';
  if (/\b(maquina|cadeira|mesa flexora|leg ?press|leg 45|hack|pendulo|articulad[ao]|quadril 45|peck|voador|graviton|adutora|abdutora|extensora|flexora|panturrilha sentad[ao]|remada baixa|cross ?over)\b/.test(n)) return 'maquina';
  if (/\b(polia|cabo|crossover|corda|puxada|pulldown|pull down|face pull|pallof)\b/.test(n)) return 'polia';
  if (/\bsmith\b/.test(n)) return 'smith';
  if (/\b(barra|terra|sumo|stiff|supino reto|levantamento|remada curvada)\b/.test(n)) return 'barra';
  if (/\b(elastico|mini ?band|band|superband)\b/.test(n)) return 'elastico';
  if (/\b(prancha|abdominal|abs|dead ?bug|flexao|mobilidade|alongamento|ponte|bird ?dog|cossaco|lateral alternado|caminhada|polichinelo|burpee|infra|canivete|hollow)\b/.test(n)) return 'peso_corpo';
  return 'outro';
}
const GUIADO = new Set(['maquina']); // o que conta como "máquina" na regra do bi-set (polia e Smith usados livres não contam)

export function grupo(nome) {
  const n = chave(nome);
  // Cossaco e agachamento lateral alternado o Igor usa como a mobilidade do dia de inferior
  if (/mobilidade|alongamento|90 90|gato|libera|cossaco|lateral alternado|rotacao de quadril/.test(n)) return 'Mobilidade';
  if (/prancha|abdominal|abs|dead ?bug|crunch|infra|obliquo|pallof|canivete|core|hollow/.test(n)) return 'Core';
  if (/quadril|glute|abdu|adu[ct]|coice|ponte|thrust|caminhada lateral|mini ?band|kickback|elevacao pelvica/.test(n)) return 'Glúteo';
  if (/stiff|flexora|flexao de joelho|terra|romeno|posterior|nordic/.test(n)) return 'Posterior';
  if (/panturrilha|gemeos/.test(n)) return 'Panturrilha';
  if (/agacha|goblet|leg|extensora|afundo|bulgaro|passada|avanco|hack|sumo|step|adutora|cossaco/.test(n)) return 'Quadríceps';
  if (/remada|puxada|pulldown|pull down|barra fixa|serrote|face pull/.test(n)) return 'Costas';
  if (/crucifixo inv|face pull/.test(n)) return 'Ombro';
  if (/supino|crucifixo|flexao de bra|peck|crossover|voador/.test(n)) return 'Peito';
  if (/desenvolvimento|elevacao lateral|elevacao frontal|ombro|arnold|remada alta/.test(n)) return 'Ombro';
  if (/rosca|biceps|triceps|testa|frances|mergulho/.test(n)) return 'Braços';
  return 'Outros';
}

// ---------- o que ela pode fazer ----------
// historico: nomes dos exercícios dos últimos 4-5 treinos dela no Mfit (só na memória, na hora de montar)
// autorizados: [{ nome, origem: 'mfit' | 'app' }] (cadastrados pelo Igor no Mfit + biblioteca do app)
// extras: que equipamento pode ser ACRESCENTADO (o Igor disse: halter)
// semAparelho: mobilidade e abdômen sem aparelho também podem entrar novos (Igor, 25/11)
export function contexto({ historico = [], autorizados = [], extras = ['halter'], semAparelho = true } = {}) {
  const hist = new Map(historico.map(n => [chave(n), n]));
  const aut = new Map(autorizados.map(a => [chave(a.nome ?? a), a.nome ?? a]));
  return {
    hist, aut, extras: new Set(extras), semAparelho,
    temNoHistorico: n => hist.has(chave(n)),
    // ok = ela já faz, ou é autorizado e o equipamento pode ser acrescentado (halter)
    pode(n) {
      const k = chave(n);
      if (hist.has(k)) return { ok: true, por: 'historico' };
      if (!aut.has(k)) return { ok: false, por: 'fora da base do Mfit e da biblioteca do app' };
      const eq = equipamento(n);
      if (this.extras.has(eq)) return { ok: true, por: 'acrescimo' };
      // Igor (25/11): mobilidade e abdômen sem aparelho também podem entrar como novidade
      if (eq === 'peso_corpo' && this.semAparelho && ['Mobilidade', 'Core'].includes(grupo(n))) return { ok: true, por: 'acrescimo' };
      return { ok: false, por: eq === 'maquina' ? 'máquina (ela pode não ter)' : `${eq.replace('_', ' ')} (só halter, mobilidade ou abdômen sem aparelho entram novos)` };
    },
  };
}

// ---------- sorteio que se repete (mesma aluna + mesmo mês = mesmo resultado) ----------
export function sorteio(semente) {
  let h = 1779033703 ^ String(semente).length;
  for (const c of String(semente)) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const embaralha = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- montar a versão da aluna ----------
// base: { mes, treinos: [{ letra, nome, duracao_min, vagas: [{ id, opcoes: [nomes], series, reps, descanso_s, metodos: [..], reps_opcoes: [..], biset_com }] }] }
// aluna: { id, dias_semana }
// assinatura (opcional): o que ela recebeu no mês passado { escolhas: { vagaId: nome }, metodos: {..}, reps: {..} }
// evitar (opcional): Set de chaves "treino|exercício|método" que uma amiga já tem
export function montarDaAluna(base, aluna, ctx, { assinatura = null, evitar = new Set() } = {}) {
  const r = sorteio(`${aluna.id}|${base.mes}`);
  const avisos = [], escolhas = {}, metodos = {}, repsEsc = {};
  const treinos = (base.treinos || []).map(t => {
    const exercicios = [];
    const usados = new Set(); // sem repetir no mesmo dia; entre dias pode (o Igor repete stiff, dead bug...)
    const vagasB = new Set((t.vagas || []).map(v => v.biset_com).filter(Boolean)); // vaga que é o B de um bi-set
    for (const v of t.vagas || []) {
      const tk = chave(t.nome);
      const validas = (v.opcoes || []).filter(o => ctx.pode(o).ok && !usados.has(chave(o)));
      // Nenhuma opção da base serve: fica um exercício dela do mesmo grupo, que ela já faz
      let candidatas = validas;
      if (!candidatas.length) {
        const gr = grupo(v.opcoes?.[0] || '');
        candidatas = [...ctx.hist.values()].filter(h => grupo(h) === gr && !usados.has(chave(h)));
        if (candidatas.length) avisos.push(`${t.letra}: nenhuma opção da vaga ${v.id} cabe na academia dela, fica ${candidatas[0]} (que ela já faz)`);
      }
      if (!candidatas.length) { avisos.push(`${t.letra}: vaga ${v.id} ficou vazia (nada da base nem do histórico dela serve)`); continue; }
      // B do bi-set: com halter sempre que der; se não der, pelo menos não máquina
      if (vagasB.has(v.id)) { const h = candidatas.filter(c => equipamento(c) === 'halter'), nm = candidatas.filter(c => !GUIADO.has(equipamento(c))); candidatas = h.length ? h : nm.length ? nm : candidatas; }
      const mets = v.metodos?.length ? v.metodos : ['normal'];
      // ordem de preferência: a escolha do mês passado (manter 70-80%), depois o que ela já faz, depois acréscimo com halter
      const anterior = assinatura?.escolhas?.[v.id];
      const ranqueadas = [
        ...candidatas.filter(c => anterior && chave(c) === chave(anterior)),
        ...embaralha(candidatas.filter(c => ctx.temNoHistorico(c) && !(anterior && chave(c) === chave(anterior))), r),
        ...embaralha(candidatas.filter(c => !ctx.temNoHistorico(c) && !(anterior && chave(c) === chave(anterior))), r),
      ];
      const metOrd = embaralha(mets, r);
      // primeira combinação exercício + método que a amiga não tem
      let nome = ranqueadas[0], metodo = metOrd[0];
      busca: for (const c of ranqueadas) for (const m of metOrd) if (!evitar.has(`${tk}|${chave(c)}|${chave(m)}`)) { nome = c; metodo = m; break busca; }
      const reps = v.reps_opcoes?.length ? v.reps_opcoes[Math.floor(r() * v.reps_opcoes.length)] : v.reps;
      usados.add(chave(nome)); escolhas[v.id] = nome; metodos[v.id] = metodo; repsEsc[v.id] = reps;
      exercicios.push({ vaga: v.id, nome, series: v.series, reps, descanso_s: v.descanso_s, metodo, biset_vaga: v.biset_com || null, novo: !ctx.temNoHistorico(nome) });
    }
    // bi-set: liga pelo nome do exercício escolhido na vaga parceira
    for (const e of exercicios) { const par = e.biset_vaga && exercicios.find(x => x.vaga === e.biset_vaga); e.biset_com = par ? par.nome : null; }
    return { letra: t.letra, nome: t.nome, duracao_min: t.duracao_min || 55, exercicios };
  });
  // ordem dos dias própria (sem mudar quais treinos ela tem)
  const ordem = embaralha(treinos.map(t => t.letra), r);
  for (const t of treinos) for (const p of regrasTreino(t)) avisos.push(p);
  return { treinos, ordem, assinatura: { escolhas, metodos, reps: repsEsc }, avisos };
}

// ---------- regras ----------
export function regrasTreino(t) {
  const prob = [];
  const ex = t.exercicios || [];
  for (const e of ex) {
    if (!e.biset_com) continue;
    const par = ex.find(x => x.nome === e.biset_com);
    if (!par || ex.indexOf(par) < ex.indexOf(e)) continue; // confere cada par uma vez (A antes de B)
    if (GUIADO.has(equipamento(e.nome)) && GUIADO.has(equipamento(par.nome))) prob.push(`${t.letra}: bi-set com duas máquinas (${e.nome} + ${par.nome})`);
    const dosCore = grupo(e.nome) === 'Core' && grupo(par.nome) === 'Core';
    if (!dosCore && equipamento(par.nome) !== 'halter') prob.push(`${t.letra}: o B do bi-set (${par.nome}) não é com halter`);
  }
  const sup = /superior|costas|peito|ombro|tr[ií]ceps|b[ií]ceps|bra[cç]o|mmss/i.test(t.nome);
  if (!sup && /inferior|quadr|gl[uú]t|posterior|perna|mmii/i.test(t.nome) && !ex.some(e => grupo(e.nome) === 'Mobilidade')) prob.push(`${t.letra}: treino de inferior sem mobilidade`);
  if (sup && ex.filter(e => grupo(e.nome) === 'Core').length < 2) prob.push(`${t.letra}: treino de superior com menos de 2 de abdômen/core`);
  if (ex.some(e => /coice.*(triceps|halter)|triceps coice|kickback de triceps/.test(chave(e.nome)))) prob.push(`${t.letra}: tríceps coice (o Igor não usa)`);
  return prob;
}

// Confere se tudo que entrou ela já faz ou é acréscimo permitido (halter autorizado)
export function conferirAcrescimos(treinos, ctx) {
  const fora = [];
  for (const t of treinos) for (const e of t.exercicios) { const p = ctx.pode(e.nome); if (!p.ok) fora.push(`${t.letra}: ${e.nome} (${p.por})`); }
  return fora;
}

// ---------- parecido entre duas alunas ----------
// "Igual" = mesmo exercício, no mesmo treino (pelo foco, não pela letra), com o mesmo método.
export const chaves = treinos => new Set(treinos.flatMap(t => t.exercicios.map(e => `${chave(t.nome)}|${chave(e.nome)}|${chave(e.metodo || 'normal')}`)));
export function parecido(a, b) {
  const A = a instanceof Set ? a : chaves(a), B = b instanceof Set ? b : chaves(b);
  if (!A.size || !B.size) return 0;
  let iguais = 0; for (const k of A) if (B.has(k)) iguais++;
  return Math.round(iguais / Math.max(A.size, B.size) * 100);
}
// rascunhos: [{ aluna_id, nome, treinos }], amigas: [[idA, idB], ...]
export function conferirLote(rascunhos, amigas = []) {
  const par = new Set(amigas.map(([a, b]) => [a, b].sort().join('|')));
  const ks = rascunhos.map(x => chaves(x.treinos));
  const alertas = [];
  const pior = new Map(rascunhos.map(x => [x.aluna_id, { pct: 0, com: null }]));
  for (let i = 0; i < rascunhos.length; i++) for (let j = i + 1; j < rascunhos.length; j++) {
    const a = rascunhos[i], b = rascunhos[j], pct = parecido(ks[i], ks[j]);
    const amiga = par.has([a.aluna_id, b.aluna_id].sort().join('|')), lim = amiga ? LIMITE_AMIGAS : LIMITE_GERAL;
    for (const [x, y] of [[a, b], [b, a]]) if (pct > pior.get(x.aluna_id).pct) pior.set(x.aluna_id, { pct, com: y.aluna_id });
    if (pct > lim) alertas.push({ a: a.aluna_id, b: b.aluna_id, pct, amiga, limite: lim });
  }
  return { alertas, pior };
}

// ---------- datas ----------
const D = s => new Date(String(s).slice(0, 10) + 'T12:00:00');
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mais = (s, n) => { const d = D(s); d.setDate(d.getDate() + n); return iso(d); };
// Fechamento: se o treino atual vence de segunda a sexta, estica até o domingo dessa semana (ninguém perde dia).
// Sábado e domingo ficam como estão.
export function fechamento(fimAtual) { const d = D(fimAtual), w = d.getDay(); return w === 0 || w === 6 ? iso(d) : mais(fimAtual, 7 - w); }
export const inicio = fech => { const w = D(fech).getDay(); return mais(fech, w === 6 ? 2 : 1); }; // sempre segunda
export const fimNovo = (ini, semanas = SEMANAS) => mais(ini, semanas * 7 - 1); // sempre domingo
// Lote da semana: domingo desta semana (ou hoje, se hoje é domingo). Entra quem fecha até esse domingo.
export function loteDaSemana(hoje) { const w = D(hoje).getDay(); const dom = w === 0 ? iso(D(hoje)) : mais(hoje, 7 - w); return { fechamento: dom, inicio: mais(dom, 1), fim: fimNovo(mais(dom, 1)) }; }
export const entraNoLote = (fimAtual, lote) => !fimAtual || fechamento(fimAtual) <= lote.fechamento;
export const diaSemana = s => ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][D(s).getDay()];

// ---------- pagamento (só avisa o Igor, nunca trava ninguém) ----------
// pagoAte: data da última renovação aprovada + o período (vem da Kiwify); pix: nomes da lista de Pix da planilha
export function pagamento(aluna, { pix = [], hoje } = {}) {
  if (aluna.pago_ate && String(aluna.pago_ate).slice(0, 10) >= String(hoje).slice(0, 10)) return { status: 'pago', por: 'Kiwify' };
  const n = chave(aluna.nome);
  if (pix.some(p => { const k = chave(p); return k && (k === n || (k.split(' ')[0] === n.split(' ')[0] && k.split(' ').length > 1 && n.includes(k.split(' ').slice(-1)[0]))); })) return { status: 'pago', por: 'Pix' };
  return aluna.pago_ate ? { status: 'pendente', por: `Kiwify até ${String(aluna.pago_ate).slice(0, 10)}` } : { status: 'nao_achei', por: 'não achei na Kiwify nem no Pix' };
}

// ---------- saída ----------
// Linhas pro app (tabelas treinos/exercicios): o método vai na dica, igual o Igor escreve no Mfit
export function paraApp(treinos, ordem) {
  const pos = new Map((ordem || []).map((l, i) => [l, i]));
  return [...treinos].sort((a, b) => (pos.get(a.letra) ?? 0) - (pos.get(b.letra) ?? 0)).map(t => ({
    letra: t.letra, nome: t.nome, duracao_min: t.duracao_min,
    exercicios: t.exercicios.map(e => ({ nome: e.nome, series: e.series, reps: String(e.reps ?? ''), descanso_s: e.descanso_s ?? 60, dica: e.metodo && e.metodo !== 'normal' ? e.metodo : null, biset_com: e.biset_com || null })),
  }));
}
// Texto no formato do editor do painel (o mesmo que vai pro Mfit, com os mesmos nomes)
export const paraTexto = treinos => treinos.map(t => [`# ${t.letra} | ${t.nome} | ${t.duracao_min}`, ...t.exercicios.map(e => [e.nome, e.series, e.reps, e.descanso_s, '', e.dica || e.metodo || ''].join(' | ').replace(/( \| )+$/, ''))].join('\n')).join('\n\n');
