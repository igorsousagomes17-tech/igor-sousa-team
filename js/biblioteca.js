// Bibliotecas do Igor: exercícios (nome, grupo, vídeo, dica, alternativa) e treinos-modelo,
// e o montador visual de treino (o mesmo pra modelo e pro plano da aluna). Tudo em português: é só pro Igor.
import { $, $$, esc, toast, overlay, closeOverlay } from './ui.js';
import { aqDe, semAq, comAq } from './conteudo.js';

export const GRUPOS = ['Glúteo', 'Quadríceps', 'Posterior', 'Panturrilha', 'Costas', 'Peito', 'Ombro', 'Braços', 'Core', 'Cardio', 'Mobilidade', 'Outros'];
const REGRAS = [
  ['Glúteo', /caminhada lateral|mini ?band/], ['Cardio', /hiit|esteira|bike|bicicleta|escada|eliptico|corrida|caminhada|polichinelo|burpee|pular corda/],
  ['Mobilidade', /mobilidade|alongamento|90\/90|gato|libera/], ['Core', /prancha|abdominal|dead ?bug|crunch|infra|obliquo|pallof|canivete|core/],
  ['Glúteo', /quadril|glute|abdu|coice|ponte|thrust|kickback/], ['Posterior', /stiff|flexora|terra|romeno|good ?morning|posterior|nordic/],
  ['Panturrilha', /panturrilha|gemeos/], ['Quadríceps', /agacha|leg|extensora|afundo|bulgaro|passada|avanco|hack|sumo|step|adutora|cossaco/],
  ['Costas', /remada(?! alta)|puxada|pull ?down|barra fixa|serrote|pullover|face pull/], ['Peito', /supino|crucifixo|flexao de bra|peck|crossover|voador/],
  ['Ombro', /desenvolvimento|elevacao lateral|elevacao frontal|ombro|arnold|remada alta/], ['Braços', /rosca|biceps|triceps|testa|frances|corda|mergulho/]
];
const sem = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const grupoDe = nome => (REGRAS.find(([, r]) => r.test(sem(nome))) || ['Outros'])[0];
const LETRAS = 'ABCDEFGH';

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
    const row = { nome: $('#fxN', camada).value.trim(), grupo: $('#fxG', camada).value, video_url: $('#fxV', camada).value.trim() || null, dica: $('#fxD', camada).value.trim() || null, alternativa: $('#fxA', camada).value.trim() || null };
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
export async function montarModelos(el, db) {
  let ms = [];
  try { ms = await db.admin.modelos(); } catch (e) { el.innerHTML = `<p class="muted">Não deu pra abrir a biblioteca (${esc(e.message)}).</p>`; return; }
  function desenha() {
    el.innerHTML = `<p class="muted">Treinos prontos pra reaproveitar. Na hora de montar o treino de uma aluna, toca em "Usar da biblioteca".</p>
      <button class="btn sm" id="novoM">+ Novo treino</button>
      <div class="lista">${ms.map(m => `<button class="aluna" data-m="${m.id}"><span class="av">${(m.treinos || []).length}</span><span class="t"><b>${esc(m.nome)}</b><span>${(m.treinos || []).map(t => t.letra).join(' · ')} · ${(m.treinos || []).reduce((n, t) => n + (t.exercicios || []).length, 0)} exercícios${m.descricao ? ' · ' + esc(m.descricao) : ''}</span></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 5 7 7-7 7"/></svg></button>`).join('') || '<p class="muted">Nenhum treino salvo ainda.</p>'}</div>`;
    $('#novoM', el).onclick = () => editarModelo({ nome: '', descricao: '', treinos: [] });
    $$('[data-m]', el).forEach(b => b.onclick = () => editarModelo(ms.find(m => m.id === b.dataset.m)));
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

  function desenha() {
    const cab = {}; $$('.cab input,.cab select', box).forEach(i => cab[i.id] = i.value); // não perde o que já foi digitado no cabeçalho
    if (modoTexto) { desenhaTexto(); restaura(cab); return; }
    const tr = T[at];
    box.innerHTML = `<div class="row between"><h2>${esc(titulo)}</h2><button class="btn ghost sm" id="mtC" style="width:auto">Fechar</button></div>
      <div class="cab">${cabecalho}</div>
      ${extras.length || textoParaTreinos ? `<div class="row wrap" style="gap:8px">${extras.map(x => `<button class="pill" id="${x.id}">${x.txt}</button>`).join('')}${textoParaTreinos ? '<button class="pill" id="modoTexto">modo texto</button>' : ''}</div>` : ''}
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
      <div class="tres"><label>séries<input class="input" data-f="series" data-j="${j}" type="number" inputmode="numeric" value="${e.series}"></label><label>reps<input class="input" data-f="reps" data-j="${j}" value="${esc(e.reps)}"></label><label>descanso (s)<input class="input" data-f="descanso_s" data-j="${j}" type="number" inputmode="numeric" value="${e.descanso_s}"></label></div>
      <label class="campo">Série de reconhecimento (reps, vazio = sem)<input class="input" data-f="aq" data-j="${j}" value="${esc(aqDe(e.dica) || '')}" placeholder="Ex.: 15 (leve, descanso 45s)"></label>
      <details ${e.dica || e.alternativa ? '' : ''}><summary>dica, alternativa e vídeo${e.video_url ? ' · ▶' : ''}${semAq(e.dica) ? ' · dica' : ''}</summary>
        <label class="campo">Dica<input class="input" data-f="dica" data-j="${j}" value="${esc(semAq(e.dica) || '')}"></label>
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
    $('#mtC').onclick = closeOverlay;
    $$('[data-at]', box).forEach(b => b.onclick = () => { lerCampos(); at = +b.dataset.at; desenha(); });
    $('#addT').onclick = () => { lerCampos(); if (T.length >= LETRAS.length) return toast('Máximo de 8 treinos.', true); T.push(novoTreino(T.length)); at = T.length - 1; desenha(); };
    $('#dupT').onclick = () => { lerCampos(); if (T.length >= LETRAS.length) return toast('Máximo de 8 treinos.', true); const c = clona([T[at]])[0]; c.letra = LETRAS[T.length]; T.push(c); at = T.length - 1; desenha(); toast(`Treino ${c.letra} criado igual ao anterior`); };
    const dt = $('#delT'); if (dt) dt.onclick = () => { if (dt.dataset.ok !== '1') { dt.dataset.ok = '1'; dt.textContent = 'toca de novo pra apagar'; return; } T.splice(at, 1); T.forEach((t, i) => t.letra = LETRAS[i]); at = Math.max(0, at - 1); desenha(); };
    const dx = $('#delTudo'); if (dx) dx.onclick = async () => { if (dx.dataset.ok !== '1') { dx.dataset.ok = '1'; dx.textContent = 'toca de novo pra apagar'; return; } try { await apagar(); closeOverlay(); } catch (e) { toast(e.message, true); } };
    $('#trN').onchange = lerCampos;
    $$('[data-up],[data-dn]', box).forEach(b => b.onclick = () => { lerCampos(); const j = +(b.dataset.up ?? b.dataset.dn), k = b.dataset.up != null ? j - 1 : j + 1, ex = T[at].exercicios; [ex[j], ex[k]] = [ex[k], ex[j]]; ex.forEach(e => e.bi = false); desenha(); });
    $$('[data-del]', box).forEach(b => b.onclick = () => { lerCampos(); const ex = T[at].exercicios, j = +b.dataset.del; if (j > 0) ex[j - 1].bi = false; ex.splice(j, 1); desenha(); });
    $$('[data-bi]', box).forEach(c => c.onchange = () => { lerCampos(); const ex = T[at].exercicios, j = +c.dataset.bi; ex[j].bi = c.checked; if (c.checked) { if (ex[j - 1]) ex[j - 1].bi = false; if (ex[j + 1]) ex[j + 1].bi = false; } desenha(); });
    $('#addE').onclick = () => { lerCampos(); seletor(); };
    extras.forEach(x => { const b = $('#' + x.id); if (b) b.onclick = () => { lerCampos(); x.fn(estado); }; });
    const mtx = $('#modoTexto'); if (mtx) mtx.onclick = () => { lerCampos(); modoTexto = true; desenha(); };
    $('#mtS').onclick = salvar;
  }
  function desenhaTexto() {
    box.innerHTML = `<div class="row between"><h2>${esc(titulo)}</h2><button class="btn ghost sm" id="mtC" style="width:auto">Fechar</button></div><div class="cab">${cabecalho}</div>
      <p class="muted small">Formato: <b># Letra | Nome | minutos</b> e abaixo <b>exercício | séries | reps | descanso s | vídeo | dica | alternativa | bi N</b>. Bom pra colar o que a Claudete gerar.</p>
      <textarea class="input" id="t" style="min-height:320px;font-family:monospace;font-size:13px">${esc(treinosParaTexto(paraSalvar()))}</textarea>
      <div class="row"><button class="btn ghost sm" id="vis" style="flex:1">Voltar pro visual</button><button class="btn sm" id="mtS" style="flex:1">${esc(salvarTxt)}</button></div>`;
    $('#mtC').onclick = closeOverlay;
    const doTexto = () => { const n = textoParaTreinos($('#t').value); if (!n.length) { toast('Nenhum treino reconhecido no texto.', true); return false; } T = deSalvo(n); at = 0; return true; };
    $('#vis').onclick = () => { if (doTexto()) { modoTexto = false; desenha(); } };
    $('#mtS').onclick = () => { if (doTexto()) salvar(); };
  }
  async function salvar() {
    lerCampos();
    const pronto = paraSalvar();
    if (!pronto.some(t => t.exercicios.length)) return toast('Adiciona pelo menos um exercício.', true);
    const b = $('#mtS'); b.disabled = true;
    try { const r = await onSalvar(pronto); if (r === false) { b.disabled = false; return; } closeOverlay(); }
    catch (e) { b.disabled = false; toast(e.message, true); }
  }
  function paraSalvar() {
    return T.filter(t => t.exercicios.length || T.length === 1).map((t, i) => ({ letra: LETRAS[i], nome: t.nome || `Treino ${LETRAS[i]}`, duracao_min: t.duracao_min || 40, exercicios: t.exercicios.map((e, j, ex) => ({ nome: e.nome, series: e.series || 3, reps: String(e.reps || '12'), descanso_s: e.descanso_s ?? 60, video_url: e.video_url || null, dica: e.dica || null, alternativa: e.alternativa || null, biset_com: e.bi ? j + 2 : ex[j - 1]?.bi ? j : null })) }));
  }

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
        const row = { nome: q.trim(), grupo: grupoDe(q) };
        try { const salvo = await db.admin.salvarExercicioLib(row); lib.push(salvo || row); } catch { /* sem biblioteca: entra só no treino */ }
        poe(row); q = ''; $('#sxQ', camada).value = ''; lista();
      };
    }
    $('#sxQ', camada).oninput = e => { q = e.target.value; lista(); };
    lista(); setTimeout(() => $('#sxQ', camada)?.focus(), 50);
  }
  desenha();
  return estado;
}

const novoTreino = i => ({ letra: LETRAS[i], nome: '', duracao_min: 40, exercicios: [] });
function deSalvo(treinos) { // do banco/modelo pro editor: biset_com vira "bi com o próximo"
  return (treinos || []).map((t, i) => {
    const ex = [...(t.exercicios || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map((e, j) => ({ ...e, ordem: j + 1 }));
    return { letra: LETRAS[i], nome: t.nome || '', duracao_min: t.duracao_min || 40, exercicios: ex.map((e, j) => ({ nome: e.nome, series: e.series ?? 3, reps: e.reps ?? '12', descanso_s: e.descanso_s ?? 60, video_url: e.video_url || null, dica: e.dica || null, alternativa: e.alternativa || null, bi: !!(e.biset_com && e.biset_com === j + 2 && ex[j + 1]) })) };
  });
}
const clona = t => deSalvo(JSON.parse(JSON.stringify(t || [])).map(x => ({ ...x, exercicios: (x.exercicios || []).map((e, j, a) => ('bi' in e ? { ...e, ordem: j + 1, biset_com: e.bi ? j + 2 : a[j - 1]?.bi ? j : null } : e)) })));
