// Painel do Igor
import { $, $$, esc, toast, overlay, closeOverlay, fmtData } from './ui.js';

const C = window.ISTEAM_CONFIG;
const msgInativa = (nome, dias) => `Oi ${nome.split(' ')[0]}! Vi aqui que faz ${dias} dias que você não treina. Tá acontecendo alguma coisa? Bora voltar hoje? Me fala o que tá precisando 💪`;
const msgAcesso = (nome, email) => `Olá ${nome.split(' ')[0]}! Seu acesso ao app tá pronto 🚀\n\nLink: ${location.origin + location.pathname}\nLogin: ${email}\nSenha: seu número de WhatsApp (só números, com DDD)\n\nNo iPhone: abre no Safari → Compartilhar → Adicionar à Tela de Início. No Android: aparece "Instalar" na hora.\n\nPra gente começar bem: todo domingo me manda um feedback de como foi a semana. Qualquer dúvida é só mandar por aqui!\n\nBem-vinda ao time! 🚀 Me segue no Insta: @igorsousa.personal`;
const wa = (num, txt) => `https://wa.me/55${String(num || '').replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(txt)}`;

let db;
// Precisa da resposta do Igor: comentou, ou deu nota baixa / esforço no limite sem escrever nada
const precisa = f => !f.resposta_igor && !!(String(f.comentario || '').trim() || (f.nota != null && f.nota <= 4) || (f.esforco != null && f.esforco >= 9));
const DOR = /⚠ dor|\bdor(es)?\b|doeu|doendo|les[aã]o|machuc|\bpain|hurt|dolor|duel|doli|douleur|疼|痛|दर्द/i;
const selo = f => DOR.test(f.comentario || '') ? ' <span class="pill warn">dor</span>' : !String(f.comentario || '').trim() && f.nota != null && f.nota <= 4 ? ' <span class="pill warn">nota baixa</span>' : !String(f.comentario || '').trim() && f.esforco >= 9 ? ' <span class="pill warn">esforço no limite</span>' : '';
const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
export async function adminView(S, { render, go, anamneseForm, db: _db }) {
  db = _db;
  let alunas = [], fb = [];
  try { [alunas, fb] = await Promise.all([db.admin.alunas(), db.admin.feedbacks()]); } catch (e) { toast(e.message, true); }
  const ativas = alunas.filter(a => a.ativa);
  const dia = d => { d = new Date(d); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }; // dia no fuso do celular
  const treinaramHoje = ativas.filter(a => a.ultimo_treino && dia(a.ultimo_treino) === dia(Date.now())).length;
  const atencao = ativas.filter(a => a.dias_sem_treinar >= 4).sort((a, b) => b.dias_sem_treinar - a.dias_sem_treinar);
  const semResposta = fb.filter(precisa);
  const semTreino = alunas.filter(a => a.ativa && a.treinos_mes === 0 && a.dias_sem_treinar === 999);

  render(`<div class="view noTabs fx"><div class="topbar"><div class="logo sm">PAINEL DO <b>IGOR</b></div><div class="row"><button class="btn ghost sm" data-go="home">ver como aluna</button><button class="btn ghost sm" id="out">sair</button></div></div>
  <div class="grid2"><div class="card"><h3>Ativas</h3><div class="big">${ativas.length}</div><p class="muted">${alunas.length - ativas.length} pausadas</p></div><div class="card"><h3>Treinaram hoje</h3><div class="big">${treinaramHoje}</div><p class="muted">${Math.round(treinaramHoje / Math.max(1, ativas.length) * 100)}% das ativas</p></div></div>
  <div class="row wrap"><button class="btn sm" id="nova">+ Cadastrar aluna</button><button class="btn ghost sm" id="lote">Cadastro em lote</button><button class="btn ghost sm" id="recado">Recado</button></div>

  <div class="card"><div class="row between"><h3>Precisam de atenção</h3><span class="muted small">${pl(atencao.length, 'aluna', 'alunas')}</span></div>
    ${atencao.length ? atencao.slice(0, 12).map(a => `<div class="r"><div><b>${esc(a.nome)}</b><span>${a.dias_sem_treinar === 999 ? 'nunca treinou no app' : a.dias_sem_treinar + ' dias sem treinar'} · ${a.treinos_mes} no mês</span></div><span class="pill ${a.dias_sem_treinar >= 7 ? 'warn' : ''}">${a.dias_sem_treinar >= 7 ? '7+ dias' : '4-6 dias'}</span><a class="btn wa sm" style="padding:7px 10px;font-size:13px" href="${wa(a.whatsapp, msgInativa(a.nome, a.dias_sem_treinar === 999 ? 'uns' : a.dias_sem_treinar))}" target="_blank" rel="noopener">WhatsApp</a></div>`).join('') : '<p class="muted mt">Todo mundo em dia 🔥</p>'}
    <p class="muted small mt">Toca em WhatsApp e abre a conversa com a mensagem pronta. Você revisa e envia.</p></div>

  <div class="card"><div class="row between"><h3>Feedbacks</h3><span class="muted small">${semResposta.length} sem resposta</span></div>
    ${fb.length ? fb.map(f => `<div class="r" style="grid-template-columns:1fr auto"><div><b>${esc(f.profiles?.nome || '')}${f.profiles?.plano === 'personalizado' ? ' <span class="pill">Personalizado</span>' : ''} · ${esc(f.titulo)}${selo(f)}</b><span>${fmtData(f.finalizada_em)} · esforço ${f.esforco ?? '–'} · nota ${f.nota ?? '–'}${f.comentario ? ' · "' + esc(f.comentario) + '"' : ''}${f.resposta_igor ? '<br>↳ você: ' + esc(f.resposta_igor) : ''}</span></div>${precisa(f) ? `<button class="btn ghost sm" style="padding:7px 10px;font-size:13px" data-resp="${f.id}">Responder</button>` : ''}</div>`).join('') : '<p class="muted mt">Nenhum feedback ainda.</p>'}</div>

  <div class="card"><div class="row between"><h3>Dúvidas na IA</h3><span class="muted small">últimas</span></div><div id="duv"><p class="muted mt">Carregando…</p></div><p class="muted small mt">O que as alunas perguntam pro tira-dúvidas. Bom pra pauta de conteúdo e pra ver quem precisa de você.</p></div>
  <div class="card"><div class="row between"><h3>Alunas</h3><input class="input" id="busca" placeholder="buscar" style="width:140px;min-height:36px;padding:6px 10px"></div>
    <div id="lista">${alunas.map(a => linhaAluna(a)).join('')}</div></div>
  ${semTreino.length ? `<p class="muted small">${pl(semTreino.length, 'aluna ainda sem plano', 'alunas ainda sem plano')} de treino no app.</p>` : ''}</div>`);

  // Botões embaixo do nome (cabe com zoom/fonte grande) e com 44px pra tocar
  function linhaAluna(a) { return `<div class="r" data-nome="${esc(a.nome.toLowerCase())}" style="grid-template-columns:1fr"><div><b>${esc(a.nome)}${a.plano === 'personalizado' ? ' <span class="pill">Personalizado</span>' : ''}${a.ativa ? '' : ' <span class="pill">pausada</span>'}</b><span>${a.pontos} pts · ${pl(a.treinos_mes, 'treino', 'treinos')} no mês</span></div><div class="row" style="gap:8px"><button class="btn ghost sm" data-treino="${a.id}" data-n="${esc(a.nome)}">treino</button><button class="btn ghost sm" data-ac="${a.id}" data-n="${esc(a.nome)}">acesso</button></div></div>`; }

  (db.assistente?.duvidasRecentes?.() || Promise.resolve([])).then(ds => { const el = $('#duv'); if (el) el.innerHTML = ds.length ? ds.map(d => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b style="font-size:13px">${esc(d.profiles?.nome || 'Aluna')}</b>${DOR.test(d.texto || '') ? ' <span class="pill warn">dor</span>' : ''} <span class="muted small">· ${new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span><p class="muted" style="margin-top:2px">${esc(d.texto)}</p></div>`).join('') : '<p class="muted mt">Nenhuma dúvida ainda.</p>'; }).catch(() => { const el = $('#duv'); if (el) el.innerHTML = '<p class="muted mt">Não deu pra carregar agora.</p>'; });
  $('#out').onclick = async () => { await db.logout(); S.perfil = null; go('entrada'); };
  $('#busca').oninput = () => { const q = $('#busca').value.toLowerCase(); $$('#lista .r').forEach(r => r.hidden = !r.dataset.nome.includes(q)); };
  $$('[data-resp]').forEach(b => b.onclick = () => {
    overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>Responder</h2><textarea class="input" id="t" placeholder="No seu jeito..."></textarea><div class="row"><button class="btn ghost sm" id="c" style="flex:1">Cancelar</button><button class="btn sm" id="s" style="flex:1">Enviar</button></div></div></div>`);
    $('#c').onclick = closeOverlay; $('#s').onclick = async () => { const tx = $('#t').value.trim(); if (!tx) { toast('Escreve a resposta antes de enviar.', true); $('#t').focus(); return; } try { await db.admin.responder(b.dataset.resp, tx); closeOverlay(); toast('Respondido ✓ (aparece na tela inicial dela)'); go('admin'); } catch (e) { toast(e.message, true); } };
  });
  $$('[data-ac]').forEach(b => b.onclick = async () => {
    const a = alunas.find(x => x.id === b.dataset.ac);
    const { data } = await db.sb.from('profiles').select('nome,whatsapp,ativa').eq('id', a.id).single();
    const { data: u } = await db.sb.rpc('email_de', { uid: a.id }).catch(() => ({ data: null }));
    overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>${esc(data.nome)}</h2>
      <a class="btn wa sm" href="${wa(data.whatsapp, msgAcesso(data.nome, u || '(e-mail dela)'))}" target="_blank" rel="noopener">Enviar acesso no WhatsApp</a>
      <button class="btn ghost sm" id="pausa">${data.ativa ? 'Pausar acesso' : 'Reativar acesso'}</button>
      <button class="btn ghost sm" id="c">Fechar</button></div></div>`);
    $('#c').onclick = closeOverlay; $('#pausa').onclick = async () => { await db.admin.setAtiva(a.id, !data.ativa); closeOverlay(); toast(data.ativa ? 'Acesso pausado' : 'Acesso liberado'); go('admin'); };
  });
  $$('[data-treino]').forEach(b => b.onclick = () => editorTreino(b.dataset.treino, b.dataset.n, go));
  $('#nova').onclick = () => formAluna(null, go);
  $('#lote').onclick = () => formLote(go);
  $('#recado').onclick = () => { overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>Recado da semana</h2><textarea class="input" id="t" placeholder="Essa semana é de carga. Anota tudo!"></textarea><input class="input" id="u" placeholder="Link de áudio/vídeo (opcional)"><div class="row"><button class="btn ghost sm" id="c" style="flex:1">Cancelar</button><button class="btn sm" id="s" style="flex:1">Publicar</button></div></div></div>`); $('#c').onclick = closeOverlay; $('#s').onclick = async () => { try { await db.admin.publicarRecado($('#t').value.trim(), $('#u').value.trim() || null); closeOverlay(); toast('Publicado pra todas ✓'); } catch (e) { toast(e.message, true); } }; };
}

// Cadastro de aluna: chama a Edge Function (cria usuário no Auth + perfil) ------------
async function criarAlunas(rows) {
  const { data: { session } } = await db.sb.auth.getSession();
  const r = await fetch(`${C.SUPABASE_URL}/functions/v1/criar-aluna`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: C.SUPABASE_ANON_KEY }, body: JSON.stringify({ alunas: rows }) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Falha ao cadastrar'); return j;
}
function formAluna(_, go) {
  overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:10px;margin-top:20px"><h2>Nova aluna</h2>
    <input class="input" id="n" placeholder="Nome completo"><input class="input" id="e" type="email" placeholder="E-mail (vai ser o login)"><input class="input" id="w" inputmode="tel" placeholder="WhatsApp com DDD (vai ser a senha inicial)">
    <div class="grid2"><input class="input" id="d" type="date" placeholder="Nascimento"><select class="input" id="s"><option value="F">Feminino</option><option value="M">Masculino</option></select></div>
    <p class="muted small">Ela entra com e-mail + número do WhatsApp e troca a senha no app.</p>
    <div class="row"><button class="btn ghost sm" id="c" style="flex:1">Cancelar</button><button class="btn sm" id="ok" style="flex:1">Cadastrar</button></div></div></div>`);
  $('#c').onclick = closeOverlay;
  $('#ok').onclick = async () => { $('#ok').disabled = true; try { const r = await criarAlunas([{ nome: $('#n').value.trim(), email: $('#e').value.trim(), whatsapp: $('#w').value.trim(), nascimento: $('#d').value || null, sexo: $('#s').value }]); closeOverlay(); toast(`Cadastrada ✓ (${r.criadas} ok, ${r.erros?.length || 0} erro)`); go('admin'); } catch (e) { toast(e.message, true); $('#ok').disabled = false; } };
}
function formLote(go) {
  overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:10px;margin-top:20px"><h2>Cadastro em lote</h2>
    <p class="muted small">Cola uma linha por aluna: <b>nome; e-mail; whatsapp; nascimento(AAAA-MM-DD); F/M</b>. Pode copiar da planilha do MFIT.</p>
    <textarea class="input" id="t" style="min-height:160px" placeholder="Ana Paula Silva; ana@gmail.com; 62999990000; 1995-03-10; F"></textarea>
    <div class="row"><button class="btn ghost sm" id="c" style="flex:1">Cancelar</button><button class="btn sm" id="ok" style="flex:1">Cadastrar todas</button></div><p class="muted small" id="st"></p></div></div>`);
  $('#c').onclick = closeOverlay;
  $('#ok').onclick = async () => {
    const rows = $('#t').value.split('\n').map(l => l.split(/[;\t]/).map(x => x.trim())).filter(l => l[0] && l[1]).map(([nome, email, whatsapp, nascimento, sexo]) => ({ nome, email, whatsapp, nascimento: nascimento || null, sexo: (sexo || 'F').toUpperCase() }));
    if (!rows.length) return toast('Nenhuma linha válida', true);
    $('#ok').disabled = true; $('#st').textContent = `Cadastrando ${rows.length}...`;
    try { const r = await criarAlunas(rows); $('#st').textContent = `${r.criadas} cadastradas. ${r.erros?.length ? 'Erros: ' + r.erros.map(e => e.email + ' (' + e.erro + ')').join(', ') : ''}`; setTimeout(() => { closeOverlay(); go('admin'); }, 2500); } catch (e) { toast(e.message, true); $('#ok').disabled = false; }
  };
}

// Editor de treino mensal (texto simples, no padrão do PDF) -----------------------------
const EXEMPLO = `# A | Inferior · glúteo e quadríceps | 40
Mobilidade quadril 90/90 | 1 | 1 min cada | 0 | | mobilidade importante
Agachamento no Smith | 4 | 10 | 60 | https://youtu.be/XXXX | pé na largura do quadril | Agachamento livre
Agachamento goblet (calcanhar elevado) | 3 | 12 | 60 | | | | bi 2
Elevação pélvica | 4 | 12 | 60 | | segura 1s em cima
Búlgaro com halter | 3 | 10 cada | 60
Cadeira extensora | 3 | 15 | 45
HIIT na bike | 1 | 10 min | 0 | | 30s forte / 30s leve

# B | Superior · costas e ombro | 40
Puxada alta | 4 | 10 | 60
Remada baixa | 3 | 12 | 60
Elevação lateral | 3 | 15 | 45
Dead bug | 3 | 10 cada | 30
Prancha | 3 | 30s | 30`;

function parseTreinos(txt) {
  const treinos = []; let cur = null;
  txt.split('\n').forEach(l => {
    l = l.trim(); if (!l) return;
    if (l.startsWith('#')) { const [letra, nome, dur] = l.slice(1).split('|').map(x => x.trim()); cur = { letra, nome: nome || '', duracao_min: +dur || 40, exercicios: [] }; treinos.push(cur); return; }
    if (!cur) return;
    const [nome, series, reps, descanso, video, dica, alternativa, bi] = l.split('|').map(x => (x || '').trim());
    // bi-set: 8ª coluna "bi 2" (ou só o número), ou a dica "bi-set com o 2"
    const mb = String(bi || '').match(/\d+/), md = String(dica || '').match(/^bi-?set com (?:o )?(\d+)\.?$/i);
    cur.exercicios.push({ nome, series: +series || 3, reps: reps || '12', descanso_s: descanso === '' ? 60 : +descanso, video_url: video || null, dica: md ? null : (dica || null), alternativa: alternativa || null, biset_com: mb ? +mb[0] : md ? +md[1] : null });
  });
  return treinos;
}
function serializar(plano) {
  return plano.treinos.map(t => `# ${t.letra} | ${t.nome} | ${t.duracao_min || 40}\n` + t.exercicios.sort((a, b) => a.ordem - b.ordem).map(e => [e.nome, e.series, e.reps, e.descanso_s, e.video_url || '', e.dica || '', e.alternativa || '', e.biset_com ? 'bi ' + e.biset_com : ''].join(' | ').replace(/( \| )+$/, '')).join('\n')).join('\n\n');
}
async function editorTreino(alunaId, nome, go) {
  const atual = await db.admin.planoDe(alunaId);
  const mes = new Date(); mes.setDate(1); const mesStr = mes.toISOString().slice(0, 10);
  overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:10px;margin:20px 0;max-width:460px"><h2>Treino de ${esc(nome)}</h2>
    <div class="row between"><input class="input" id="mes" type="month" value="${mesStr.slice(0, 7)}" style="width:160px"><button class="pill" id="ex">colar exemplo</button></div>
    <p class="muted small">Formato: <b># Letra | Nome | minutos</b> e abaixo <b>exercício | séries | reps | descanso s | vídeo | dica | alternativa | bi N</b> (bi 2 = emenda com o exercício 2). Dá pra pedir pra Claudete gerar nesse formato.</p>
    <textarea class="input" id="t" style="min-height:300px;font-family:monospace;font-size:13px">${esc(atual ? serializar(atual) : '')}</textarea>
    <div class="row"><button class="btn ghost sm" id="c" style="flex:1">Cancelar</button><button class="btn sm" id="s" style="flex:1">Publicar pra aluna</button></div></div></div>`);
  $('#ex').onclick = () => { $('#t').value = EXEMPLO; };
  $('#c').onclick = closeOverlay;
  $('#s').onclick = async () => { const treinos = parseTreinos($('#t').value); if (!treinos.length) return toast('Nenhum treino reconhecido', true); $('#s').disabled = true; try { await db.admin.salvarPlano(alunaId, $('#mes').value + '-01', treinos); closeOverlay(); toast(`Publicado ✓ ${treinos.length} treinos, ${treinos.reduce((n, t) => n + t.exercicios.length, 0)} exercícios`); go('admin'); } catch (e) { toast(e.message, true); $('#s').disabled = false; } };
}
