// Bibliotecas do Igor: exercícios (nome, grupo, vídeo, dica, alternativa) e treinos-modelo,
// e o montador visual de treino (o mesmo pra modelo e pro plano da aluna). Tudo em português: é só pro Igor.
import { $, $$, esc, toast, overlay, closeOverlay } from './ui.js';
import { aqDe, semAq, comAq } from './conteudo.js';

export const GRUPOS = ['Glúteo', 'Quadríceps', 'Posterior', 'Panturrilha', 'Costas', 'Peito', 'Ombro', 'Braços', 'Core', 'Cardio', 'Mobilidade', 'Outros'];
const REGRAS = [
  ['Glúteo', /caminhada lateral|mini ?band/], ['Cardio', /hiit|esteira|bike|bicicleta|escada|eliptico|corrida|caminhada|polichinelo|burpee|pular corda/],
  ['Mobilidade', /mobilidade|alongamento|90\/90|gato|libera/], ['Core', /prancha|abdominal|dead ?bug|crunch|infra|obliquo|pallof|canivete|core/],
  ['Glúteo', /quadril|glute|abdu|coice|ponte|thrust|kickback/], ['Posterior', /stiff|flexora|terra|romeno|good ?morning|posterior|nordic/],
  ['Panturrilha', /panturrilha|gemeos/], ['Quadríceps', /agacha|goblet|leg|extensora|afundo|bulgaro|passada|avanco|hack|sumo|step|adutora|cossaco/],
  ['Costas', /remada(?! alta)|puxada|pull ?down|barra fixa|serrote|pullover|face pull/], ['Peito', /supino|crucifixo|flexao de bra|peck|crossover|voador/],
  ['Ombro', /desenvolvimento|elevacao lateral|elevacao frontal|ombro|arnold|remada alta/], ['Braços', /rosca|biceps|triceps|testa|frances|corda|mergulho/]
];
const sem = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const sem_ = sem;
export const grupoDe = nome => (REGRAS.find(([, r]) => r.test(sem(nome))) || ['Outros'])[0];
const LETRAS = 'ABCDEFGH';
// Acentos que costumam faltar quando ele digita rápido ("maquina", "Elevaçao"). Só no nome novo/editado da biblioteca:
// o nome dentro do treino da aluna fica como está (o histórico de carga dela é pelo nome).
const ACENTOS = { maquina: 'máquina', maquinas: 'máquinas', elevacao: 'elevação', abducao: 'abdução', aducao: 'adução', flexao: 'flexão', extensao: 'extensão', rotacao: 'rotação', triceps: 'tríceps', biceps: 'bíceps', gluteo: 'glúteo', gluteos: 'glúteos', bulgaro: 'búlgaro', obliquo: 'oblíquo', obliquos: 'oblíquos', frances: 'francês', pelvica: 'pélvica', abdomen: 'abdômen', posicao: 'posição', inclinacao: 'inclinação' };
export const acentua = s => String(s || '').replace(/[A-Za-zÀ-ÿ]+/g, w => { const k = sem(w).replace(/ç/g, 'c'), c = ACENTOS[k]; if (!c || w.toLowerCase() === c) return w; return w[0] === w[0].toUpperCase() ? c[0].toUpperCase() + c.slice(1) : c; }).replace(/çao\b/g, 'ção').replace(/ÇAO\b/g, 'ÇÃO');
// Datas do plano (igual ao Mfit: início + duração = vencimento). Usado no editor da aluna e no "Enviar para alunas"
export const isoDia = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hojeStr = () => isoDia(new Date());
export const somaDias = (ini, n) => { const d = new Date(ini + 'T12:00'); d.setDate(d.getDate() + n); return isoDia(d); };
export const somaFim = (ini, sem) => somaDias(ini, sem * 7 - 1);
export const brDia = iso => iso ? iso.split('-').reverse().join('/') : '';
export const SEMANAS = [1, 2, 3, 4, 5, 6, 8, 12];
export const camposDatas = (ini0, sem0) => `<div class="grid2"><label class="campo">Início<input class="input" id="ini" type="date" value="${ini0}"></label><label class="campo">Duração<select class="input" id="sem">${SEMANAS.map(n => `<option value="${n}" ${n === sem0 ? 'selected' : ''}>${n} ${n === 1 ? 'semana' : 'semanas'}</option>`).join('')}</select></label></div><p class="muted small" id="venceEm">Vence em ${brDia(somaFim(ini0, sem0))}</p>`;
// Atualiza o "Vence em" quando muda início/duração. Escuta só dentro do pop-up (some junto com ele, não acumula no document)
export const ligarDatas = raiz => { const f = () => { const e = $('#venceEm', raiz), i = $('#ini', raiz), s = $('#sem', raiz); if (e && i && s) e.textContent = 'Vence em ' + brDia(somaFim(i.value || hojeStr(), +s.value || 4)); }; raiz.addEventListener('input', f); raiz.addEventListener('change', f); };

// ---------- Biblioteca de exercícios ----------
export async function montarExercicios(el, db) {
  let lib = [], filtro = '', grupo = '';
  try { lib = await db.admin.libExercicios(); } catch (e) { el.innerHTML = `<p class="muted">Não deu pra abrir a biblioteca (${esc(e.message)}).</p>`; return; }
  lib.forEach(x => { x.grupo = x.grupo || grupoDe(x.nome); });
  function desenha() {
    const q = sem(filtro), lista = lib.filter(x => (!grupo || x.grupo === grupo) && (!q || sem(x.nome).includes(q)));
    const comVideo = lib.filter(x => x.video_url).length;
    el.innerHTML = `<p class="muted">${lib.length} exercícios · ${comVideo} com vídeo seu (${Math.round(comVideo / Math.max(1, lib.length) * 100)}%)</p>
      <button class="btn sm" id="novoEx">+ Novo exercício</button>
      <input class="input" id="bq" placeholder="Buscar exercício" value="${esc(filtro)}" autocomplete="off">
      <div class="chips">${['', ...GRUPOS].map(g => `<button class="pill ${g === grupo ? 'on' : ''}" data-g="${g}">${g || 'Todos'}</button>`).join('')}</div>
      <div class="lista">${lista.map(x => `<button class="aluna" data-ex="${x.id}"><span class="av">${x.video_url ? '▶' : '·'}</span><span class="t"><b>${esc(x.nome)}</b><span>${esc(x.grupo)}${x.video_url ? ' · com vídeo' : ' · sem vídeo'}${x.alternativa ? ' · alt: ' + esc(x.alternativa) : ''}</span></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 5 7 7-7 7"/></svg></button>`).join('') || `<p class="muted">Nada com esse nome. Toca em "+ Novo exercício" pra criar.</p>`}</div>`;
    $('#bq', el).oninput = e => { filtro = e.target.value; const pos = e.target.selectionStart; desenha(); const i = $('#bq', el); i.focus(); i.setSelectionRange(pos, pos); };
    $$('[data-g]', el).forEach(b => b.onclick = () => { grupo = b.dataset.g; desenha(); });
    $('#novoEx', el).onclick = () => formExercicio({ nome: filtro }, db, async salvo => { lib.push(salvo); desenha(); });
    $$('[data-ex]', el).forEach(b => b.onclick = () => { const x = lib.find(y => y.id === b.dataset.ex); formExercicio(x, db, salvo => { if (salvo === null) lib = lib.filter(y => y.id !== x.id); else Object.assign(x, salvo); desenha(); }); });
  }
  desenha();
}

// Cadastro/edição de um exercício da biblioteca. onFim(salvo) — salvo null = apagado
export function formExercicio(x, db, onFim, { empilhado = false } = {}) {
  const novo = !x?.id, antes = x?.video_url || '';
  const html = `<div class="box" style="padding:16px;display:flex;flex-direction:column;gap:10px;margin:20px 0;max-width:460px"><h2>${novo ? 'Novo exercício' : 'Editar exercício'}</h2>
    <label class="campo">Nome<input class="input" id="fxN" value="${esc(x?.nome || '')}" placeholder="Ex.: Agachamento livre"></label>
    <label class="campo">Grupo<select class="input" id="fxG">${GRUPOS.map(g => `<option ${g === (x?.grupo || grupoDe(x?.nome)) ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
    <label class="campo">Link do vídeo (YouTube não listado)<input class="input" id="fxV" value="${esc(x?.video_url || '')}" placeholder="https://youtube.com/shorts/..." inputmode="url"></label>
    <label class="campo">Dica de execução<textarea class="input" id="fxD" rows="3" placeholder="Ex.: joelho acompanha a ponta do pé">${esc(x?.dica || '')}</textarea></label>
    <label class="campo">Alternativa (se não tiver o aparelho)<input class="input" id="fxA" value="${esc(x?.alternativa || '')}" placeholder="Ex.: Agachamento com halter"></label>
    <div class="row"><button class="btn ghost sm" id="fxC" style="flex:1">Cancelar</button><button class="btn sm" id="fxS" style="flex:1">Salvar</button></div>
    ${novo ? '' : '<button class="back small" id="fxX" style="color:var(--bad)">Apagar da biblioteca</button>'}</div>`;
  const camada = document.createElement('div'); camada.className = 'modal camada'; camada.id = 'fx'; camada.style.cssText = 'align-items:flex-start;overflow:auto;z-index:60'; camada.innerHTML = html;
  const fecha = () => camada.remove();
  (empilhado ? document.body : ($('#overlay') || document.body)).appendChild(camada);
  $('#fxN', camada).oninput = e => { if (novo) $('#fxG', camada).value = grupoDe(e.target.value); };
  $('#fxC', camada).onclick = fecha;
  $('#fxS', camada).onclick = async () => {
    const row = { nome: acentua($('#fxN', camada).value.trim()), grupo: $('#fxG', camada).value, video_url: $('#fxV', camada).value.trim() || null, dica: $('#fxD', camada).value.trim() || null, alternativa: acentua($('#fxA', camada).value.trim()) || null };
    if (!row.nome) { toast('Coloca o nome do exercício.', true); return; }
    if (!novo) row.id = x.id;
    $('#fxS', camada).disabled = true;
    try {
      const salvo = await db.admin.salvarExercicioLib(row); fecha();
      let extra = '';
      if (row.video_url && row.video_url !== antes) { try { const n = await db.admin.videoNosTreinos(row.nome, row.video_url); if (n) extra = ` e o vídeo entrou em ${n} ${n === 1 ? 'treino' : 'treinos'} das alunas`; } catch {} }
      toast(`Salvo ✓${extra}`); onFim?.(salvo || row);
    } catch (e) { $('#fxS', camada).disabled = false; toast(/duplicate|unique|existe/i.test(e.message) ? 'Já tem um exercício com esse nome na biblioteca.' : e.message, true); }
  };
  const bx = $('#fxX', camada); if (bx) bx.onclick = async () => { if (bx.dataset.ok !== '1') { bx.dataset.ok = '1'; bx.textContent = 'Toca de novo pra confirmar'; return; } try { await db.admin.apagarExercicioLib(x.id); fecha(); toast('Apagado da biblioteca (os treinos das alunas não mudam)'); onFim?.(null); } catch (e) { toast(e.message, true); } };
  setTimeout(() => $('#fxN', camada)?.focus(), 50);
}

// ---------- Biblioteca de treinos (modelos) ----------
export async function montarModelos(el, db, { aoEnviar } = {}) {
  let ms = [];
  try { ms = await db.admin.modelos(); } catch (e) { el.innerHTML = `<p class="muted">Não deu pra abrir a biblioteca (${esc(e.message)}).</p>`; return; }
  function desenha() {
    el.innerHTML = `<p class="muted">Treinos prontos pra reaproveitar. Na hora de montar o treino de uma aluna, toca em "Usar da biblioteca".</p>
      <button class="btn sm" id="novoM">+ Novo treino</button>
      <div class="lista">${ms.map(m => `<div style="display:flex;flex-direction:column;gap:6px"><button class="aluna" data-m="${m.id}"><span class="av">${(m.treinos || []).length}</span><span class="t"><b>${esc(m.nome)}</b><span>${(m.treinos || []).map(t => t.letra).join(' · ')} · ${(m.treinos || []).reduce((n, t) => n + (t.exercicios || []).length, 0)} exercícios${m.descricao ? ' · ' + esc(m.descricao) : ''}</span></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 5 7 7-7 7"/></svg></button><button class="btn ghost sm" data-env="${m.id}" style="min-height:44px">Enviar para alunas…</button></div>`).join('') || '<p class="muted">Nenhum treino salvo ainda.</p>'}</div>`;
    $('#novoM', el).onclick = () => editarModelo({ nome: '', descricao: '', treinos: [] });
    $$('[data-m]', el).forEach(b => b.onclick = () => editarModelo(ms.find(m => m.id === b.dataset.m)));
    $$('[data-env]', el).forEach(b => b.onclick = () => enviarParaAlunas(ms.find(m => m.id === b.dataset.env), db, aoEnviar));
  }
  function editarModelo(m) {
    construtor({
      db, titulo: m.id ? 'Editar treino da biblioteca' : 'Novo treino da biblioteca', treinos: m.treinos, cabecalho: `<label class="campo">Nome do treino<input class="input" id="mNome" value="${esc(m.nome)}" placeholder="Ex.: Full Body 3x · iniciante"></label><label class="campo">Observação (opcional)<input class="input" id="mDesc" value="${esc(m.descricao || '')}" placeholder="Ex.: pra quem treina em casa"></label>`,
      salvarTxt: 'Salvar na biblioteca',
      apagar: m.id ? async () => { await db.admin.apagarModelo(m.id); ms = ms.filter(x => x.id !== m.id); desenha(); toast('Treino apagado da biblioteca'); } : null,
      onSalvar: async treinos => {
        const nome = $('#mNome').value.trim(); if (!nome) { toast('Dá um nome pro treino.', true); $('#mNome').focus(); return false; }
        const salvo = await db.admin.salvarModelo({ ...(m.id ? { id: m.id } : {}), nome, descricao: $('#mDesc').value.trim() || null, treinos });
        if (m.id) Object.assign(m, salvo, { nome, treinos }); else ms.unshift({ ...salvo, nome, treinos });
        desenha(); toast('Salvo na biblioteca ✓');
      }
    });
  }
  desenha();
}

// Mandar um treino da biblioteca pra várias alunas de uma vez (o Mfit tem): escolhe quem, início e duração,
// confirma e publica um plano pra cada uma (uma de cada vez: mostra o progresso e diz exatamente quem falhou).
async function enviarParaAlunas(m, db, aoEnviar) {
  if (!m) return;
  const treinos = paraPlano(deSalvo(m.treinos));
  if (!treinos.length) return toast('Esse treino está vazio. Abre e coloca os exercícios antes.', true);
  overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" id="ea" style="padding:16px;display:flex;flex-direction:column;gap:10px;margin:20px 0;max-width:460px"><p class="muted">Carregando as alunas…</p></div></div>`);
  const box = $('#ea');
  let alunas = [], venc = [];
  try { [alunas, venc] = await Promise.all([db.admin.alunas(), db.admin.vencimentos().catch(() => [])]); } catch (e) { box.innerHTML = `<p class="muted">Não deu pra carregar as alunas (${esc(e.message)}).</p><button class="btn ghost sm" id="eaC">Fechar</button>`; $('#eaC').onclick = closeOverlay; return; }
  const fimDe = new Map(venc.map(v => [v.aluna_id, v.fim]));
  const lista = alunas.filter(a => a.ativa).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const sel = new Set(); let q = '', ini = hojeStr(), sem = 4;
  const situacao = a => { const f = fimDe.get(a.id); return !fimDe.has(a.id) ? 'sem treino no app' : !f ? 'tem treino (sem vencimento)' : f < hojeStr() ? `treino venceu em ${brDia(f)}` : `tem treino até ${brDia(f)}`; };
  const cab = () => `<div class="row between"><h2>Enviar para alunas</h2><button class="btn ghost sm" id="eaC" style="width:auto">Fechar</button></div>`;
  const nomes = ids => { const ns = lista.filter(a => ids.has(a.id)).map(a => a.nome); return ns.length > 8 ? ns.slice(0, 8).join(', ') + ` e mais ${ns.length - 8}` : ns.join(', '); };

  function escolher() {
    box.innerHTML = `${cab()}<p class="muted small"><b>${esc(m.nome)}</b> · ${treinos.length} ${treinos.length === 1 ? 'treino' : 'treinos'}. Cada aluna recebe uma cópia como treino dela (dá pra ajustar uma por uma depois).</p>
      <div class="cab">${camposDatas(ini, sem)}</div>
      <input class="input" id="eaQ" placeholder="Buscar aluna" autocomplete="off" value="${esc(q)}">
      <div class="row between" style="gap:8px"><span class="muted small" id="eaN"></span><button class="btn ghost sm" id="eaT" style="width:auto;min-height:44px;white-space:nowrap">Marcar todas</button></div>
      <div class="lista" id="eaL">${lista.map(a => `<label class="aluna" data-ea="${a.id}" data-nome="${esc(sem_(a.nome))}" style="cursor:pointer"><input type="checkbox" ${sel.has(a.id) ? 'checked' : ''} style="width:24px;height:24px;accent-color:var(--accent);margin:8px"><span class="t"><b>${esc(a.nome)}</b><span>${situacao(a)}</span></span><span></span></label>`).join('') || '<p class="muted">Nenhuma aluna ativa.</p>'}</div>
      <div class="rodape"><button class="btn sm" id="eaS"></button></div>`;
    ligarDatas(box);
    const lerDatas = () => { ini = $('#ini', box).value || hojeStr(); sem = +$('#sem', box).value || 4; };
    const conta = () => { $('#eaN', box).textContent = `${sel.size} ${sel.size === 1 ? 'selecionada' : 'selecionadas'}`; const b = $('#eaS', box); b.disabled = !sel.size; b.textContent = sel.size ? `Enviar pra ${sel.size} ${sel.size === 1 ? 'aluna' : 'alunas'}` : 'Escolhe as alunas'; };
    const filtra = () => { const s = sem_(q); $$('[data-ea]', box).forEach(r => r.hidden = !!s && !r.dataset.nome.includes(s)); };
    $('#eaC', box).onclick = closeOverlay;
    $('#eaQ', box).oninput = e => { q = e.target.value; filtra(); };
    $$('[data-ea] input', box).forEach(c => c.onchange = () => { const id = c.closest('[data-ea]').dataset.ea; c.checked ? sel.add(id) : sel.delete(id); conta(); });
    // "Marcar todas" marca/desmarca só as que a busca está mostrando (ex.: busca "ana" e marca todas as Anas)
    $('#eaT', box).onclick = () => { const vis = $$('[data-ea]', box).filter(r => !r.hidden), todas = vis.every(r => sel.has(r.dataset.ea)); vis.forEach(r => { todas ? sel.delete(r.dataset.ea) : sel.add(r.dataset.ea); $('input', r).checked = !todas; }); conta(); };
    $('#eaS', box).onclick = () => { lerDatas(); if (sel.size) confirmar(); };
    filtra(); conta();
  }
  function confirmar() {
    const fim = somaFim(ini, sem), comTreino = lista.filter(a => sel.has(a.id) && fimDe.get(a.id) && fimDe.get(a.id) >= ini).length;
    box.innerHTML = `${cab()}<h2 style="font-size:1.3rem">Enviar pra ${sel.size} ${sel.size === 1 ? 'aluna' : 'alunas'}?</h2>
      <p><b>${esc(m.nome)}</b> · começa em ${brDia(ini)} · vence em ${brDia(fim)}</p>
      <p class="muted small">${esc(nomes(sel))}</p>
      ${comTreino ? `<p class="pill warn quebra" style="align-self:flex-start;text-transform:none;letter-spacing:0">${comTreino === 1 ? '1 delas ainda tem treino valendo' : comTreino + ' delas ainda têm treino valendo'}: o novo entra no lugar.</p>` : ''}
      <div class="row" style="gap:8px"><button class="btn ghost sm" id="eaV" style="flex:1">Voltar</button><button class="btn sm" id="eaOk" style="flex:1">Enviar</button></div>`;
    $('#eaC', box).onclick = closeOverlay; $('#eaV', box).onclick = escolher; $('#eaOk', box).onclick = () => enviar([...sel]);
  }
  async function enviar(ids) {
    const fim = somaFim(ini, sem), ok = [], falhas = [];
    box.innerHTML = `<h2>Enviando…</h2><p id="eaP" class="muted">0 de ${ids.length}</p><div style="height:8px;border-radius:99px;background:#2a2a2e;overflow:hidden"><i id="eaB" style="display:block;height:100%;width:0;background:var(--accent);transition:width .2s"></i></div><p class="muted small">Não fecha o app até terminar.</p>`;
    for (const [i, id] of ids.entries()) {
      const a = lista.find(x => x.id === id); if ($('#eaP')) $('#eaP').textContent = `${i + 1} de ${ids.length} · ${a?.nome || ''}`;
      try { await db.admin.salvarPlano(id, ini.slice(0, 7) + '-01', treinos, { inicio: ini, fim }); ok.push(id); fimDe.set(id, fim); }
      catch (e) { falhas.push({ id, nome: a?.nome || id, erro: e.message }); }
      if ($('#eaB')) $('#eaB').style.width = Math.round((i + 1) / ids.length * 100) + '%';
    }
    if (ok.length) aoEnviar?.(ok.length);
    sel.clear(); falhas.forEach(f => sel.add(f.id)); // se der "tentar de novo", vão só as que falharam
    box.innerHTML = `<h2>${ok.length ? `✓ Enviado pra ${ok.length} ${ok.length === 1 ? 'aluna' : 'alunas'}` : 'Não foi enviado'}</h2>
      <p class="muted">${esc(m.nome)} · ${brDia(ini)} a ${brDia(fim)}</p>
      ${falhas.length ? `<div class="card"><b style="color:var(--bad)">${falhas.length} ${falhas.length === 1 ? 'falhou' : 'falharam'}:</b>${falhas.map(f => `<p class="muted small">${esc(f.nome)} (${esc(f.erro)})</p>`).join('')}</div><button class="btn ghost sm" id="eaR">Tentar de novo as que falharam</button>` : ''}
      <button class="btn sm" id="eaF">Pronto</button>`;
    $('#eaF', box).onclick = closeOverlay;
    const r = $('#eaR', box); if (r) r.onclick = () => enviar([...sel]);
  }
  escolher();
}

// ---------- Montador de treino ----------
// treinos: [{letra,nome,duracao_min,exercicios:[{nome,series,reps,descanso_s,video_url,dica,alternativa,biset_com,ordem}]}]
// onSalvar(treinos) -> false pra não fechar. extras: [{id, txt, fn(estado)}] botões no topo.
export function construtor({ db, titulo, treinos, cabecalho = '', salvarTxt = 'Salvar', onSalvar, apagar = null, extras = [], textoParaTreinos, treinosParaTexto }) {
  let T = clona(treinos), at = 0, lib = null, modoTexto = false;
  if (!T.length) T = [novoTreino(0)];
  db.admin.libExercicios().then(l => { lib = l; }).catch(() => { lib = []; });
  overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box montador" id="mt"></div></div>`);
  const box = $('#mt');
  const estado = { get: () => T, set: n => { T = clona(n); at = 0; if (!T.length) T = [novoTreino(0)]; desenha(); } };
  // "Fechar" com algo mudado pergunta antes (antes descartava sem avisar). Compara o conteúdo, não o jeito de escrever.
  const canon = () => JSON.stringify(T.map(t => [String(t.nome || '').trim(), +t.duracao_min || 40, t.exercicios.map(e => [e.nome, +e.series || 0, String(e.reps ?? '').trim() || '12', +e.descanso_s || 0, e.video_url || '', semAq(e.dica) || '', aqDe(e.dica) || '', e.alternativa || '', !!e.bi])]));
  const cabVals = () => JSON.stringify($$('.cab input,.cab select', box).map(i => i.value));
  let base = null, cabBase = null, textoIni = null;
  const mudou = () => { if (modoTexto && $('#t', box)?.value !== textoIni) return true; lerCampos(); return canon() !== base || cabVals() !== cabBase; };
  function fechar() {
    if (!mudou()) return closeOverlay();
    const c = document.createElement('div'); c.className = 'modal camada'; c.style.cssText = 'z-index:65';
    c.innerHTML = `<div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px;max-width:400px;width:100%"><h2>Descartar alterações?</h2><p class="muted">O que você mudou nesse treino ainda não foi salvo.</p><div class="row" style="gap:8px"><button class="btn ghost sm" id="dsN" style="flex:1">Continuar editando</button><button class="btn sm" id="dsS" style="flex:1;background:var(--bad);color:#fff">Descartar</button></div></div>`;
    $('#overlay').appendChild(c); $('#dsN', c).onclick = () => c.remove(); $('#dsS', c).onclick = closeOverlay;
  }
  // ✕ do exercício: tira na hora e dá 6 s pra desfazer (antes apagava sem volta)
  let tiraDesfazer = null;
  function avisoDesfazer(txt, desfaz) {
    tiraDesfazer?.(); const d = document.createElement('div'); d.id = 'desfazer'; d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:16px;right:16px;bottom:calc(96px + env(safe-area-inset-bottom,0px));max-width:448px;margin:0 auto;z-index:70;background:var(--fg);color:#0b0b0c;border-radius:12px;padding:6px 6px 6px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:600;box-shadow:0 6px 24px rgba(0,0,0,.5)';
    d.innerHTML = `<span>${esc(txt)}</span><button style="min-height:44px;padding:0 14px;border:0;border-radius:10px;background:transparent;color:#c2410c;font-weight:800;font-size:1rem">Desfazer</button>`;
    const fora = () => { clearTimeout(tm); d.remove(); if (tiraDesfazer === fora) tiraDesfazer = null; }, tm = setTimeout(fora, 6000);
    $('button', d).onclick = () => { fora(); desfaz(); };
    ($('#overlay') || document.body).appendChild(d); tiraDesfazer = fora;
  }

  function desenha() {
    const cab = {}; $$('.cab input,.cab select', box).forEach(i => cab[i.id] = i.value); // não perde o que já foi digitado no cabeçalho
    if (modoTexto) { desenhaTexto(); restaura(cab); return; }
    const tr = T[at];
    box.innerHTML = `<div class="row between"><h2>${esc(titulo)}</h2><button class="btn ghost sm" id="mtC" style="width:auto">Fechar</button></div>
      <div class="cab">${cabecalho}</div>
      ${extras.length || textoParaTreinos ? `<div class="row wrap" style="gap:8px">${extras.map(x => `<button class="pill big-pill" id="${x.id}">${x.txt}</button>`).join('')}${textoParaTreinos ? '<button class="pill big-pill" id="modoTexto">modo texto</button>' : ''}</div>` : ''}
      <div class="letras">${T.map((t, i) => `<button class="letra ${i === at ? 'on' : ''}" data-at="${i}">${esc(t.letra)}<small>${t.exercicios.length}</small></button>`).join('')}<button class="letra mais" id="addT" aria-label="Adicionar treino">+</button></div>
      <div class="grid2"><label class="campo">Nome do treino ${esc(tr.letra)}<input class="input" id="trN" value="${esc(tr.nome)}" placeholder="Ex.: Inferior · glúteo"></label><label class="campo">Duração (min)<input class="input" id="trD" type="number" inputmode="numeric" value="${tr.duracao_min || 40}"></label></div>
      <div class="exs">${tr.exercicios.map((e, j) => cartaoEx(e, j, tr.exercicios.length)).join('') || '<p class="muted center">Nenhum exercício ainda.</p>'}</div>
      <button class="btn ghost sm" id="addE">+ Adicionar exercício</button>
      <div class="row wrap" style="gap:8px;justify-content:center"><button class="back small" id="dupT">duplicar treino ${esc(tr.letra)}</button>${T.length > 1 ? `<button class="back small" id="delT" style="color:var(--bad)">apagar treino ${esc(tr.letra)}</button>` : ''}${apagar ? '<button class="back small" id="delTudo" style="color:var(--bad)">apagar da biblioteca</button>' : ''}</div>
      <div class="rodape"><button class="btn sm" id="mtS">${esc(salvarTxt)}</button></div>`;
    ligar(); restaura(cab);
  }
  const restaura = cab => Object.entries(cab).forEach(([id, v]) => { const i = box.querySelector('#' + id); if (i) i.value = v; });
  function cartaoEx(e, j, n) {
    const bi = !!e.bi, doBi = j > 0 && T[at].exercicios[j - 1].bi;
    return `<div class="exc ${bi || doBi ? 'bi' : ''}" data-j="${j}">
      <div class="row between" style="gap:8px"><b class="exn"><span class="num">${j + 1}</span>${esc(e.nome)}</b><div class="row" style="gap:2px"><button class="ib" data-up="${j}" ${j ? '' : 'disabled'} aria-label="Subir">↑</button><button class="ib" data-dn="${j}" ${j < n - 1 ? '' : 'disabled'} aria-label="Descer">↓</button><button class="ib" data-del="${j}" aria-label="Tirar">✕</button></div></div>
      <div class="tres" style="grid-template-columns:repeat(2,minmax(0,1fr))"><label>séries<input class="input" data-f="series" data-j="${j}" type="number" inputmode="numeric" value="${e.series}"></label><label>descanso (s)<input class="input" data-f="descanso_s" data-j="${j}" type="number" inputmode="numeric" value="${e.descanso_s}"></label><label style="grid-column:1/-1">reps<input class="input" data-f="reps" data-j="${j}" value="${esc(e.reps)}" style="text-align:left"></label></div>
      <details><summary>dica, alternativa e vídeo${e.video_url ? ' · ▶' : ''}${semAq(e.dica) ? ' · dica' : ''}${aqDe(e.dica) ? ' · reconhecimento' : ''}</summary>
        <label class="campo">Dica<input class="input" data-f="dica" data-j="${j}" value="${esc(semAq(e.dica) || '')}"></label>
        <label class="campo">Série de reconhecimento (reps, vazio = sem)<input class="input" data-f="aq" data-j="${j}" value="${esc(aqDe(e.dica) || '')}" placeholder="Ex.: 15 (leve, descanso 45s)"></label>
        <label class="campo">Alternativa<input class="input" data-f="alternativa" data-j="${j}" value="${esc(e.alternativa || '')}"></label>
        <label class="campo">Vídeo<input class="input" data-f="video_url" data-j="${j}" value="${esc(e.video_url || '')}" inputmode="url"></label></details>
      ${j < n - 1 ? `<label class="biset"><input type="checkbox" data-bi="${j}" ${bi ? 'checked' : ''}> bi-set com o próximo (${esc(T[at].exercicios[j + 1].nome)})</label>` : ''}</div>`;
  }
  function lerCampos() {
    const tr = T[at]; if (!tr || modoTexto) return;
    const n = $('#trN'), d = $('#trD'); if (n) tr.nome = n.value.trim(); if (d) tr.duracao_min = +d.value || 40;
    $$('[data-f]', box).forEach(i => { const e = tr.exercicios[+i.dataset.j]; if (!e) return; const f = i.dataset.f; if (f === 'aq' || f === 'dica') return; e[f] = ['series', 'descanso_s'].includes(f) ? Math.max(0, +i.value || 0) : (i.value.trim() || (f === 'reps' ? '12' : null)); });
    $$('[data-f="dica"]', box).forEach(i => { const e = tr.exercicios[+i.dataset.j]; const aq = $('[data-f="aq"][data-j="' + i.dataset.j + '"]', box); if (e) e.dica = comAq(i.value, aq ? aq.value : aqDe(e.dica)); });
  }
  function ligar() {
    $('#mtC').onclick = fechar;
    $$('[data-at]', box).forEach(b => b.onclick = () => { lerCampos(); at = +b.dataset.at; desenha(); });
    $('#addT').onclick = () => { lerCampos(); if (T.length >= LETRAS.length) return toast('Máximo de 8 treinos.', true); T.push(novoTreino(T.length)); at = T.length - 1; desenha(); };
    $('#dupT').onclick = () => { lerCampos(); if (T.length >= LETRAS.length) return toast('Máximo de 8 treinos.', true); const c = clona([T[at]])[0]; c.letra = LETRAS[T.length]; T.push(c); at = T.length - 1; desenha(); toast(`Treino ${c.letra} criado igual ao anterior`); };
    const dt = $('#delT'); if (dt) dt.onclick = () => { if (dt.dataset.ok !== '1') { dt.dataset.ok = '1'; dt.textContent = 'toca de novo pra apagar'; return; } T.splice(at, 1); T.forEach((t, i) => t.letra = LETRAS[i]); at = Math.max(0, at - 1); desenha(); };
    const dx = $('#delTudo'); if (dx) dx.onclick = async () => { if (dx.dataset.ok !== '1') { dx.dataset.ok = '1'; dx.textContent = 'toca de novo pra apagar'; return; } try { await apagar(); closeOverlay(); } catch (e) { toast(e.message, true); } };
    $('#trN').onchange = lerCampos;
    $$('[data-up],[data-dn]', box).forEach(b => b.onclick = () => { lerCampos(); const j = +(b.dataset.up ?? b.dataset.dn), k = b.dataset.up != null ? j - 1 : j + 1, ex = T[at].exercicios; [ex[j], ex[k]] = [ex[k], ex[j]]; ex.forEach(e => e.bi = false); desenha(); });
    $$('[data-del]', box).forEach(b => b.onclick = () => {
      lerCampos(); const tr = T[at], ex = tr.exercicios, j = +b.dataset.del, biAnt = j > 0 && ex[j - 1].bi, [tirado] = ex.splice(j, 1); if (j > 0) ex[j - 1].bi = false; desenha();
      avisoDesfazer('Exercício removido', () => { if (!T.includes(tr)) return; lerCampos(); tr.exercicios.splice(Math.min(j, tr.exercicios.length), 0, tirado); if (j > 0 && tr.exercicios[j - 1]) tr.exercicios[j - 1].bi = biAnt; at = T.indexOf(tr); desenha(); });
    });
    $$('[data-bi]', box).forEach(c => c.onchange = () => { lerCampos(); const ex = T[at].exercicios, j = +c.dataset.bi; ex[j].bi = c.checked; if (c.checked) { if (ex[j - 1]) ex[j - 1].bi = false; if (ex[j + 1]) ex[j + 1].bi = false; } desenha(); });
    $('#addE').onclick = () => { lerCampos(); seletor(); };
    extras.forEach(x => { const b = $('#' + x.id); if (b) b.onclick = () => { lerCampos(); x.fn(estado); }; });
    const mtx = $('#modoTexto'); if (mtx) mtx.onclick = () => { lerCampos(); modoTexto = true; desenha(); textoIni = $('#t', box)?.value ?? null; };
    $('#mtS').onclick = salvar;
  }
  function desenhaTexto() {
    box.innerHTML = `<div class="row between"><h2>${esc(titulo)}</h2><button class="btn ghost sm" id="mtC" style="width:auto">Fechar</button></div><div class="cab">${cabecalho}</div>
      <p class="muted small">Formato: <b># Letra | Nome | minutos</b> e abaixo <b>exercício | séries | reps | descanso s | vídeo | dica | alternativa | bi N</b>. Bom pra colar o que a Claudete gerar.</p>
      <textarea class="input" id="t" style="min-height:320px;font-family:monospace;font-size:13px">${esc(treinosParaTexto(paraSalvar()))}</textarea>
      <div class="row"><button class="btn ghost sm" id="vis" style="flex:1">Voltar pro visual</button><button class="btn sm" id="mtS" style="flex:1">${esc(salvarTxt)}</button></div>`;
    $('#mtC').onclick = fechar;
    const doTexto = () => { const n = textoParaTreinos($('#t').value); if (!n.length) { toast('Nenhum treino reconhecido no texto.', true); return false; } T = deSalvo(n); at = 0; return true; };
    $('#vis').onclick = () => { if (doTexto()) { modoTexto = false; desenha(); } };
    $('#mtS').onclick = () => { if (doTexto()) salvar(); };
  }
  async function salvar() {
    lerCampos();
    const pronto = paraSalvar();
    if (!pronto.some(t => t.exercicios.length)) return toast('Adiciona pelo menos um exercício.', true);
    const b = $('#mtS'); b.disabled = true;
    try { const r = await onSalvar(pronto); if (r === false) { b.disabled = false; return; } tiraDesfazer?.(); closeOverlay(); }
    catch (e) { b.disabled = false; toast(e.message, true); }
  }
  const paraSalvar = () => paraPlano(T, T.length === 1);

  // Escolher exercício: busca na biblioteca; se não tiver, cria na hora (e já guarda na biblioteca)
  function seletor() {
    let q = '', g = '';
    const camada = document.createElement('div'); camada.className = 'modal camada'; camada.style.cssText = 'align-items:flex-start;overflow:auto;z-index:55';
    camada.innerHTML = `<div class="box" style="padding:16px;display:flex;flex-direction:column;gap:10px;margin:20px 0;max-width:460px;width:100%"><div class="row between"><h2>Adicionar exercício</h2><button class="btn ghost sm" id="sxC" style="width:auto">Pronto</button></div><p class="muted small" id="sxN">Toca pra colocar no treino ${esc(T[at].letra)}. Dá pra escolher vários.</p>
      <input class="input" id="sxQ" placeholder="Buscar ou digitar um novo" autocomplete="off"><div class="chips" id="sxG"></div><div class="lista" id="sxL"><p class="muted">Carregando…</p></div></div>`;
    $('#overlay').appendChild(camada);
    const fecha = () => { camada.remove(); desenha(); };
    $('#sxC', camada).onclick = fecha;
    let add = 0;
    const poe = x => { T[at].exercicios.push({ nome: x.nome, series: 3, reps: x.grupo === 'Cardio' ? '10 min' : x.grupo === 'Core' && /prancha/i.test(x.nome) ? '30s' : '12', descanso_s: 60, video_url: x.video_url || null, dica: x.dica || null, alternativa: x.alternativa || null, bi: false }); add++; $('#sxN', camada).textContent = `✓ ${x.nome} no treino ${T[at].letra} (${add} ${add === 1 ? 'adicionado' : 'adicionados'}). Toca em Pronto quando terminar.`; };
    function lista() {
      if (!lib) { setTimeout(lista, 150); return; }
      lib.forEach(x => { x.grupo = x.grupo || grupoDe(x.nome); });
      const s = sem(q), ls = lib.filter(x => (!g || x.grupo === g) && (!s || sem(x.nome).includes(s))).slice(0, 80);
      const exato = lib.some(x => sem(x.nome) === s);
      $('#sxG', camada).innerHTML = ['', ...GRUPOS].map(x => `<button class="pill ${x === g ? 'on' : ''}" data-g="${x}">${x || 'Todos'}</button>`).join('');
      $('#sxL', camada).innerHTML = (q.trim() && !exato ? `<button class="aluna novo" id="sxNovo"><span class="av">+</span><span class="t"><b>Criar "${esc(q.trim())}"</b><span>novo exercício · vai pra biblioteca também</span></span></button>` : '') + ls.map(x => `<button class="aluna" data-lx="${x.id}"><span class="av">${x.video_url ? '▶' : '+'}</span><span class="t"><b>${esc(x.nome)}</b><span>${esc(x.grupo)}</span></span></button>`).join('') + (!ls.length && !q.trim() ? '<p class="muted">Biblioteca vazia. Digita o nome pra criar.</p>' : '');
      $$('[data-g]', camada).forEach(b => b.onclick = () => { g = b.dataset.g; lista(); });
      $$('[data-lx]', camada).forEach(b => b.onclick = () => { poe(lib.find(x => x.id === b.dataset.lx)); b.classList.add('feito'); });
      const nv = $('#sxNovo', camada); if (nv) nv.onclick = async () => {
        const row = { nome: acentua(q.trim()), grupo: grupoDe(q) };
        try { const salvo = await db.admin.salvarExercicioLib(row); lib.push(salvo || row); } catch { /* sem biblioteca: entra só no treino */ }
        poe(row); q = ''; $('#sxQ', camada).value = ''; lista();
      };
    }
    $('#sxQ', camada).oninput = e => { q = e.target.value; lista(); };
    lista(); setTimeout(() => $('#sxQ', camada)?.focus(), 50);
  }
  desenha(); base = canon(); cabBase = cabVals();
  return estado;
}
// do editor pro formato do banco (o mesmo que salvarPlano/salvarModelo recebem). bi = "bi-set com o próximo" vira biset_com dos dois lados
function paraPlano(T, todos = false) {
  return T.filter(t => t.exercicios.length || todos).map((t, i) => ({ letra: LETRAS[i], nome: t.nome || `Treino ${LETRAS[i]}`, duracao_min: t.duracao_min || 40, exercicios: t.exercicios.map((e, j, ex) => ({ nome: e.nome, series: e.series || 3, reps: String(e.reps || '12'), descanso_s: e.descanso_s ?? 60, video_url: e.video_url || null, dica: e.dica || null, alternativa: e.alternativa || null, biset_com: e.bi ? j + 2 : ex[j - 1]?.bi ? j : null })) }));
}

const novoTreino = i => ({ letra: LETRAS[i], nome: '', duracao_min: 40, exercicios: [] });
function deSalvo(treinos) { // do banco/modelo pro editor: biset_com vira "bi com o próximo"
  return (treinos || []).map((t, i) => {
    const ex = [...(t.exercicios || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map((e, j) => ({ ...e, ordem: j + 1 }));
    return { letra: LETRAS[i], nome: t.nome || '', duracao_min: t.duracao_min || 40, exercicios: ex.map((e, j) => ({ nome: e.nome, series: e.series ?? 3, reps: e.reps ?? '12', descanso_s: e.descanso_s ?? 60, video_url: e.video_url || null, dica: e.dica || null, alternativa: e.alternativa || null, bi: !!(e.biset_com && e.biset_com === j + 2 && ex[j + 1]) })) };
  });
}
const clona = t => deSalvo(JSON.parse(JSON.stringify(t || [])).map(x => ({ ...x, exercicios: (x.exercicios || []).map((e, j, a) => ('bi' in e ? { ...e, ordem: j + 1, biset_com: e.bi ? j + 2 : a[j - 1]?.bi ? j : null } : e)) })));
