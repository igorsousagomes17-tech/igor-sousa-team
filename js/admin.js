// Painel do Igor
import { $, $$, esc, toast, overlay, closeOverlay, fmtData } from './ui.js';
import { construtor, montarExercicios, montarModelos, hojeStr as hojeIso, somaFim, somaDias, brDia, camposDatas, ligarDatas } from './biblioteca.js';

const C = window.ISTEAM_CONFIG;
const msgInativa = (nome, dias) => `Oi ${nome.split(' ')[0]}! Vi aqui que faz ${dias} dias que você não treina. Tá acontecendo alguma coisa? Bora voltar hoje? Me fala o que tá precisando 💪`;
const msgAcesso = (nome, email) => `Olá ${nome.split(' ')[0]}! Seu acesso ao app tá pronto 🚀\n\nLink: ${location.origin + location.pathname}\nLogin: ${email}\nSenha: seu número de WhatsApp (só números, com DDD)\n\nPra deixar o app na tela do celular (1 minuto): igorsousa.com.br/instalar\n\nPra gente começar bem: todo domingo me manda um feedback de como foi a semana. Qualquer dúvida é só mandar por aqui!\n\nBem-vinda ao time! 🚀 Me segue no Insta: @igorsousa.personal`;
const wa = (num, txt) => `https://wa.me/55${String(num || '').replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(txt)}`;

let db;
// Precisa da resposta do Igor: comentou, ou deu nota baixa / esforço no limite sem escrever nada
const precisa = f => !f.resposta_igor && !!(String(f.comentario || '').trim() || (f.nota != null && f.nota <= 4) || (f.esforco != null && f.esforco >= 9));
const DOR = /⚠ dor|\bdor(es)?\b|doeu|doendo|les[aã]o|machuc|\bpain|hurt|dolor|duel|doli|douleur|疼|痛|दर्द/i;
const parou = f => f.exercicios_total > 0 && (f.exercicios_feitos ?? 0) / f.exercicios_total < 0.6;
const selo = f => (parou(f) ? ' <span class="pill warn">parou no meio</span>' : '') + seloDor(f);
const seloDor = f => DOR.test(f.comentario || '') ? ' <span class="pill warn">dor</span>' : !String(f.comentario || '').trim() && f.nota != null && f.nota <= 4 ? ' <span class="pill warn">nota baixa</span>' : !String(f.comentario || '').trim() && f.esforco >= 9 ? ' <span class="pill warn">esforço no limite</span>' : '';
const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
// Ícones do painel (traço simples, herdam a cor)
const ic = {
  fb: '<path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M19 9h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v3l-4-3h-4"/>',
  duv: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><circle cx="12" cy="17.5" r=".6" fill="currentColor"/>',
  rec: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  ver: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  add: '<circle cx="10" cy="8" r="4"/><path d="M3 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
  lote: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20a6 6 0 0 1 12 0M10 20a6 6 0 0 1 12 0"/>',
  alunas: '<circle cx="12" cy="7" r="3.5"/><circle cx="5" cy="9" r="2.5"/><circle cx="19" cy="9" r="2.5"/><path d="M6 21a6 6 0 0 1 12 0M1 19a4 4 0 0 1 5-3.9M23 19a4 4 0 0 0-5-3.9"/>',
  treino: '<path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/>',
  anam: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v3H9zM8.5 12l2 2 4-4M8 17h8"/>',
  post: '<circle cx="12" cy="4" r="2"/><path d="M12 6v8M8 9h8M12 14l-3 7M12 14l3 7"/><path d="M4 2v20" stroke-dasharray="2 2"/>',
  alerta: '<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  libT: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 3.5-1 3 15.5-3.5 1z"/>',
  libE: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M10 12.5v5l4-2.5z"/>',
  seta: '<path d="m9 5 7 7-7 7"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic[k]}</svg>`;
let secao = 'inicio', modo = null, vtab = 'pend', filtroA = 'todas'; // seção aberta do painel; modo = o que acontece ao tocar numa aluna da lista; filtroA = pílula da lista de alunas

export async function adminView(S, { render, go, anamneseForm, db: _db }) {
  db = _db;
  let alunas = [], fb = [], venc = [], vencOk = true;
  let anam = [];
  try { [alunas, fb, anam, venc] = await Promise.all([db.admin.alunas(), db.admin.feedbacks(), db.admin.anamneses().catch(() => []), db.admin.vencimentos().catch(() => { vencOk = false; return []; })]); } catch (e) { toast(e.message, true); }
  const fichas = new Map(anam.map(x => [x.id, x]));
  const ativas = alunas.filter(a => a.ativa);
  const dia = d => { d = new Date(d); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }; // dia no fuso do celular
  const treinaramHoje = ativas.filter(a => a.ultimo_treino && dia(a.ultimo_treino) === dia(Date.now())).length;
  const atencao = ativas.filter(a => a.dias_sem_treinar >= 4).sort((a, b) => b.dias_sem_treinar - a.dias_sem_treinar);
  const semResposta = fb.filter(precisa), delasNovas = fb.filter(f => f.resposta_aluna && !f.resposta_aluna_lida_em); // ela respondeu a resposta dele (migração 020)
  // Atualizações (igual ao Mfit): treino vencido ou vencendo em até 3 dias. Pendentes = ainda não marcou como lida.
  const hojeD = new Date(); hojeD.setHours(12, 0, 0, 0);
  let pendentes = [], resolvidas = [];
  const recalcUpd = () => { const u = venc.filter(v => v.fim && alunas.find(a => a.id === v.aluna_id)?.ativa).map(v => ({ ...v, nome: alunas.find(a => a.id === v.aluna_id).nome, dias: Math.round((new Date(v.fim + 'T12:00') - hojeD) / 86400000) })).filter(v => v.dias <= 3).sort((a, b) => a.dias - b.dias); pendentes = u.filter(v => !v.visto_em); resolvidas = u.filter(v => v.visto_em); };
  recalcUpd();
  // Plano de cada aluna (o último, com o vencimento). Sem a lista de planos (erro), cai no jeito antigo: nunca treinou e nada no mês
  const planoDa = new Map(venc.map(v => [v.aluna_id, v]));
  const diasPraVencer = a => { const f = planoDa.get(a.id)?.fim; return f ? Math.round((new Date(f + 'T12:00') - hojeD) / 86400000) : null; };
  const semPlano = a => vencOk ? !planoDa.has(a.id) : a.treinos_mes === 0 && a.dias_sem_treinar === 999;
  const semTreino = alunas.filter(a => a.ativa && semPlano(a));
  // Filtros da lista (pra 130 alunas não ficar só na ordem alfabética). Personalizado só aparece se alguma tiver esse plano.
  const FILTROS = [['todas', 'Todas', () => true], ['vencendo', 'Vencendo', a => a.ativa && diasPraVencer(a) != null && diasPraVencer(a) <= 7], ['parada', 'Sem treinar 7+ dias', a => a.ativa && a.dias_sem_treinar >= 7], ['semplano', 'Sem plano', a => a.ativa && semPlano(a)], ...(alunas.some(a => a.plano === 'personalizado') ? [['personalizado', 'Personalizado', a => a.plano === 'personalizado']] : [])];
  const comSaude = alunas.filter(a => alertaSaude(fichas.get(a.id)));
  let duvidas = null; // carrega quando abre
  let recarregar = false;

  const badge = n => n ? `<span class="badge">${n > 99 ? '99+' : n}</span>` : '';
  const topo = titulo => `<div class="topbar"><button class="back" id="volta" aria-label="Voltar pro início do painel">‹ ${titulo}</button></div>`;
  const MODOS = { treino: ['Montar treino', 'Toca na aluna pra abrir o treino dela'], ficha: ['Anamneses', 'Toca na aluna pra ver a anamnese'], postural: ['Avaliação postural', 'Toca na aluna pra avaliar pelas fotos'] };

  function telaInicio() {
    return `<div class="topbar"><div class="logo sm">PAINEL DO <b>IGOR</b></div></div>
    <div class="atalhos">
      <button class="atalho" id="a-upd"><span class="ico">${svg('treino')}${badge(pendentes.length)}</span>Atualizações</button>
      <button class="atalho" id="a-fb"><span class="ico">${svg('fb')}${badge(semResposta.length + delasNovas.length)}</span>Feedbacks</button>
      <button class="atalho" id="a-duv"><span class="ico">${svg('duv')}</span>Dúvidas</button>
      <button class="atalho" id="recado"><span class="ico">${svg('rec')}</span>Recado</button>
      <button class="atalho" data-go="home"><span class="ico">${svg('ver')}</span>Ver como aluna</button>
    </div>
    <section class="bloco"><h3>Suas alunas</h3>
      <div class="grid2"><button class="tile cheio" id="nova">${svg('add')}<b>Cadastrar aluna</b></button><button class="tile cheio" id="lote">${svg('lote')}<b>Cadastro em lote</b></button></div>
      <button class="bigcard" id="ir-alunas">${svg('alunas')}<span><b>Alunas</b><span class="row wrap" style="gap:6px;margin-top:6px"><span class="pill good">Ativas: ${ativas.length}</span><span class="pill warn">Pausadas: ${alunas.length - ativas.length}</span></span></span>${svg('seta')}</button>
      <button class="linhacard" id="ir-atencao"><span>${svg('alerta')}<b>Precisam de atenção</b></span><span class="muted">${atencao.length ? pl(atencao.length, 'aluna', 'alunas') : 'ninguém 🔥'} ${svg('seta')}</span></button>
      <div class="linhacard est"><span><b>Treinaram hoje</b></span><span class="muted">${treinaramHoje} de ${ativas.length} · ${Math.round(treinaramHoje / Math.max(1, ativas.length) * 100)}%</span></div>
    </section>
    <section class="bloco"><h3>Treinos e avaliação</h3>
      <div class="grid2">
        <button class="tile" id="t-modelos"><span class="ico">${svg('libT')}</span><b>Biblioteca de treinos</b></button>
        <button class="tile" id="t-exercicios"><span class="ico">${svg('libE')}</span><b>Biblioteca de exercícios</b></button>
        <button class="tile" id="t-treino"><span class="ico">${svg('treino')}</span><b>Montar treino da aluna</b></button>
        <button class="tile" id="t-ficha"><span class="ico">${svg('anam')}</span><b>Anamneses</b>${comSaude.length ? `<span class="pill warn" style="align-self:flex-start">${comSaude.length} ⚠ saúde</span>` : ''}</button>
        <button class="tile" id="t-postural"><span class="ico">${svg('post')}</span><b>Avaliação postural</b></button>
        <button class="tile" id="t-fb"><span class="ico">${svg('fb')}</span><b>Feedbacks dos treinos</b>${semResposta.length ? `<span class="pill warn quebra" style="align-self:flex-start;max-width:100%">${semResposta.length} pra responder</span>` : ''}${delasNovas.length ? `<span class="pill on quebra" style="align-self:flex-start;max-width:100%">${pl(delasNovas.length, 'resposta nova', 'respostas novas')}</span>` : ''}</button>
      </div>
      ${semTreino.length ? `<button class="linhacard mt" id="ir-semplano"><span>${svg('alerta')}<b>${pl(semTreino.length, 'aluna ainda sem plano', 'alunas ainda sem plano')} de treino</b></span><span class="muted">montar ${svg('seta')}</span></button>` : ''}
    </section>
    <button class="btn ghost sm" id="out" style="margin:8px 0 24px">Sair do painel</button>`;
  }

  function linhaAluna(a) {
    const fi = fichas.get(a.id), attr = modo === 'treino' ? `data-treino="${a.id}" data-n="${esc(a.nome)}"` : modo === 'ficha' ? (fi ? `data-ficha="${a.id}"` : `data-semficha="${a.id}"`) : modo === 'postural' ? `data-postural="${a.id}"` : `data-aluna="${a.id}"`;
    const dv = diasPraVencer(a), fim = planoDa.get(a.id)?.fim, venceTxt = !vencOk ? '' : semPlano(a) ? ' · sem plano' : fim ? ` · ${dv < 0 ? 'venceu' : 'vence'} ${brDia(fim).slice(0, 5)}` : '';
    const sub = modo === 'ficha' && !fi ? 'ainda não respondeu a anamnese' : `${a.dias_sem_treinar === 999 ? 'nunca treinou no app' : a.dias_sem_treinar === 0 ? 'treinou hoje' : pl(a.dias_sem_treinar, 'dia', 'dias') + ' sem treinar'} · ${pl(a.treinos_mes, 'treino', 'treinos')} no mês${venceTxt}`;
    return `<button class="aluna" ${attr} data-nome="${esc(a.nome.toLowerCase())}"><span class="av">${esc(a.nome.trim()[0] || '?').toUpperCase()}</span><span class="t"><b>${esc(a.nome)}</b><span>${sub}</span><span class="row wrap" style="gap:4px">${a.plano === 'personalizado' ? '<span class="pill">Personalizado</span>' : ''}${a.ativa ? '' : '<span class="pill">pausada</span>'}${a.ativa && dv != null && dv <= 7 ? `<span class="pill warn">${dv < 0 ? 'vencido' : dv === 0 ? 'vence hoje' : 'vencendo'}</span>` : ''}${alertaSaude(fi) ? '<span class="pill warn">⚠ saúde</span>' : ''}</span></span>${svg('seta')}</button>`;
  }
  function telaAlunas() {
    const [tit, dica] = MODOS[modo] || ['Alunas', ''];
    const [, , fn] = FILTROS.find(f => f[0] === filtroA) || FILTROS[0];
    // Vencendo: quem vence primeiro em cima. Os outros: ativas primeiro, alfabética
    const lista = alunas.filter(fn).sort((a, b) => (filtroA === 'vencendo' ? diasPraVencer(a) - diasPraVencer(b) : 0) || (b.ativa - a.ativa) || a.nome.localeCompare(b.nome, 'pt-BR'));
    return `${topo(tit)}${dica ? `<p class="muted">${dica}</p>` : ''}
    <input class="input" id="busca" placeholder="Buscar aluna" autocomplete="off">
    <div class="chips" role="group" aria-label="Filtrar alunas">${FILTROS.map(([k, txt, f]) => `<button class="pill big-pill ${k === filtroA ? 'on' : ''}" style="min-height:44px" data-fa="${k}" aria-pressed="${k === filtroA}">${txt} (${alunas.filter(f).length})</button>`).join('')}</div>
    <div id="lista" class="lista">${lista.map(linhaAluna).join('') || `<p class="muted mt">${alunas.length ? 'Nenhuma aluna nesse filtro.' : 'Nenhuma aluna ainda.'}</p>`}</div>`;
  }
  function telaAtencao() {
    return `${topo('Precisam de atenção')}<p class="muted">Ativas há 4 dias ou mais sem treinar. Toca em WhatsApp e a conversa abre com a mensagem pronta. Você revisa e envia.</p>
    <div class="card">${atencao.length ? atencao.map(a => `<div class="r"><div><b>${esc(a.nome)}</b><span>${a.dias_sem_treinar === 999 ? 'nunca treinou no app' : pl(a.dias_sem_treinar, 'dia', 'dias') + ' sem treinar'} · ${a.treinos_mes} no mês</span></div><span class="pill ${a.dias_sem_treinar >= 7 ? 'warn' : ''}">${a.dias_sem_treinar >= 7 ? '7+ dias' : '4-6 dias'}</span><a class="btn wa sm" style="padding:7px 10px;font-size:13px" href="${wa(a.whatsapp, msgInativa(a.nome, a.dias_sem_treinar === 999 ? 'uns' : a.dias_sem_treinar))}" target="_blank" rel="noopener">WhatsApp</a></div>`).join('') : '<p class="muted">Todo mundo em dia 🔥</p>'}</div>`;
  }
  function telaFeedbacks() {
    const ord = [...semResposta, ...delasNovas.filter(f => !precisa(f)), ...fb.filter(f => !precisa(f) && !delasNovas.includes(f))];
    return `${topo('Feedbacks')}<p class="muted">${semResposta.length ? pl(semResposta.length, 'feedback esperando sua resposta', 'feedbacks esperando sua resposta') + ' (em cima).' : 'Tudo respondido ✓'}${delasNovas.length ? ' ' + pl(delasNovas.length, 'aluna te respondeu', 'alunas te responderam') + '.' : ''}</p>
    <div class="card">${ord.length ? ord.map(f => `<div class="r" style="grid-template-columns:1fr auto"><div><b>${esc(f.profiles?.nome || '')}${f.profiles?.plano === 'personalizado' ? ' <span class="pill">Personalizado</span>' : ''} · ${esc(f.titulo)}${selo(f)}</b><span>${fmtData(f.finalizada_em)} · esforço ${f.esforco ?? '–'} · nota ${f.nota ?? '–'}${f.exercicios_total ? ` · ${f.exercicios_feitos ?? 0} de ${f.exercicios_total} exercícios` : ''}${f.duracao_s ? ` · ${f.duracao_s < 60 ? "&lt;1" : Math.round(f.duracao_s / 60)} min` : ''}${f.comentario ? ' · "' + esc(f.comentario) + '"' : ''}${f.resposta_igor ? `<br>↳ você: ${esc(f.resposta_igor)} <button class="back small" data-edita="${f.id}" style="color:var(--accent);padding:6px 4px">editar</button>` : ''}${f.resposta_aluna ? `<br>↳ ${esc(String(f.profiles?.nome || 'ela').split(' ')[0])}: "${esc(f.resposta_aluna)}"${f.resposta_aluna_lida_em ? '' : ` <span class="pill on">nova</span> <button class="back small" data-lida="${f.id}" style="color:var(--accent);padding:6px 4px;min-height:40px">já vi</button>`} <button class="back small" data-resp2="${f.id}" style="color:var(--accent);padding:6px 4px;min-height:40px">responder ela</button>` : ''}</span></div>${precisa(f) ? `<button class="btn ghost sm" style="padding:7px 10px;font-size:13px" data-resp="${f.id}">Responder</button>` : ''}</div>`).join('') : '<p class="muted">Nenhum feedback ainda.</p>'}</div>`;
  }
  function telaAtualizacoes() {
    const lista = vtab === 'pend' ? pendentes : resolvidas, dd = v => new Date(v.fim + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const quando = v => v.dias < 0 ? `venceu em ${dd(v)} (há ${pl(-v.dias, 'dia', 'dias')})` : v.dias === 0 ? `vence hoje (${dd(v)})` : `vence em ${dd(v)} (${v.dias === 1 ? 'falta 1 dia' : `faltam ${v.dias} dias`})`;
    return `${topo('Atualizações')}<p class="muted">Treinos vencidos ou que vencem em até 3 dias. Toca em Renovar: o novo treino começa no dia seguinte ao vencimento e já sai da lista.</p>
    <div class="row" style="gap:8px"><button class="pill big-pill ${vtab === 'pend' ? 'on' : ''}" data-vtab="pend">Pendentes (${pendentes.length})</button><button class="pill big-pill ${vtab === 'res' ? 'on' : ''}" data-vtab="res">Resolvidas (${resolvidas.length})</button></div>
    <div class="card">${lista.length ? lista.map(v => `<div class="r" style="grid-template-columns:1fr"><div><b>${esc(v.nome)}</b><span>${esc(v.titulo || 'Treino')} · ${quando(v)}</span></div><div class="row" style="gap:8px;margin-top:8px"><button class="btn sm" style="flex:1;white-space:nowrap" data-treino="${v.aluna_id}" data-n="${esc(v.nome)}" data-renova="1">Renovar</button><button class="btn ghost sm" style="flex:1;white-space:nowrap" data-visto="${v.id}" data-v="${v.visto_em ? 0 : 1}">${v.visto_em ? 'Reabrir' : 'Já resolvi'}</button></div></div>`).join('') : `<p class="muted">${vtab === 'pend' ? 'Nenhum treino vencendo agora ✓' : 'Nada resolvido ainda.'}</p>`}</div>`;
  }
  const telaExercicios = () => `${topo('Biblioteca de exercícios')}<div id="bib" class="painel-sec"><p class="muted">Carregando…</p></div>`;
  const telaModelos = () => `${topo('Biblioteca de treinos')}<div id="bib" class="painel-sec"><p class="muted">Carregando…</p></div>`;
  function telaDuvidas() {
    return `${topo('Dúvidas na IA')}<p class="muted">O que as alunas perguntam pro tira-dúvidas. Bom pra pauta de conteúdo e pra ver quem precisa de você.</p><div class="card" id="duv"><p class="muted">Carregando…</p></div>`;
  }

  function desenhar() {
    const corpo = { inicio: telaInicio, alunas: telaAlunas, atencao: telaAtencao, feedbacks: telaFeedbacks, duvidas: telaDuvidas, atualizacoes: telaAtualizacoes, exercicios: telaExercicios, modelos: telaModelos }[secao] || telaInicio;
    render(`<div class="view noTabs fx painel">${corpo()}</div>`);
    window.scrollTo(0, 0); ligar();
  }
  const abrir = (s, m = null) => { secao = s; modo = m; desenhar(); };

  function ligar() {
    const on = (sel, fn) => { const e = $(sel); if (e) e.onclick = fn; };
    on('#volta', () => { if (recarregar) { recarregar = false; secao = 'inicio'; modo = null; go('admin'); } else abrir('inicio'); }); // mandou treino pra várias: recarrega os vencimentos
    $$('[data-fa]').forEach(b => b.onclick = () => { filtroA = b.dataset.fa; const q = $('#busca')?.value || ''; desenhar(); const bu = $('#busca'); if (bu && q) { bu.value = q; bu.oninput(); } });
    on('#ir-semplano', () => { filtroA = 'semplano'; abrir('alunas', 'treino'); });
    on('#out', async () => { await db.logout(); S.perfil = null; secao = 'inicio'; go('entrada'); });
    on('#a-fb', () => abrir('feedbacks')); on('#t-fb', () => abrir('feedbacks'));
    on('#a-duv', () => abrir('duvidas')); on('#a-upd', () => abrir('atualizacoes'));
    $$('[data-vtab]').forEach(b => b.onclick = () => { vtab = b.dataset.vtab; desenhar(); });
    $$('[data-visto]').forEach(b => b.onclick = async () => { try { await db.admin.marcarVisto(b.dataset.visto, b.dataset.v === '1'); const v = venc.find(x => x.id === b.dataset.visto); if (v) v.visto_em = b.dataset.v === '1' ? new Date().toISOString() : null; recalcUpd(); desenhar(); } catch (e) { toast(e.message, true); } });
    on('#ir-alunas', () => { filtroA = 'todas'; abrir('alunas'); }); on('#ir-atencao', () => abrir('atencao'));
    on('#t-treino', () => { filtroA = 'todas'; abrir('alunas', 'treino'); }); on('#t-ficha', () => { filtroA = 'todas'; abrir('alunas', 'ficha'); }); on('#t-postural', () => { filtroA = 'todas'; abrir('alunas', 'postural'); });
    on('#nova', () => formAluna(null, go)); on('#lote', () => formLote(go)); on('#recado', recado);
    const bu = $('#busca'); if (bu) bu.oninput = () => { const q = bu.value.toLowerCase().trim(); $$('#lista .aluna').forEach(r => r.hidden = !r.dataset.nome.includes(q)); };
    $$('[data-aluna]').forEach(b => b.onclick = () => fichaAluna(alunas.find(x => x.id === b.dataset.aluna)));
    $$('[data-ficha]').forEach(b => b.onclick = () => fichaAnamnese(fichas.get(b.dataset.ficha)));
    $$('[data-semficha]').forEach(b => b.onclick = () => toast('Ela ainda não respondeu a anamnese. Ela vê o aviso quando entra no app.'));
    $$('[data-postural]').forEach(b => b.onclick = () => avaliacaoPostural(alunas.find(x => x.id === b.dataset.postural)));
    $$('[data-treino]').forEach(b => b.onclick = () => editorTreino(b.dataset.treino, b.dataset.n, go, { renovar: b.dataset.renova === '1' }));
    $$('[data-resp],[data-edita],[data-resp2]').forEach(b => b.onclick = () => responder(b));
    $$('[data-lida]').forEach(b => b.onclick = async () => { const f = fb.find(x => String(x.id) === b.dataset.lida); try { await db.admin.marcarRespostaLida(b.dataset.lida); if (f) f.resposta_aluna_lida_em = new Date().toISOString(); const i = delasNovas.indexOf(f); if (i >= 0) delasNovas.splice(i, 1); desenhar(); } catch (e) { toast(e.message, true); } });
    if (secao === 'duvidas') carregarDuvidas();
    on('#t-exercicios', () => abrir('exercicios')); on('#t-modelos', () => abrir('modelos'));
    if (secao === 'exercicios') montarExercicios($('#bib'), db);
    if (secao === 'modelos') montarModelos($('#bib'), db, { aoEnviar: () => { recarregar = true; } });
  }

  async function carregarDuvidas() {
    try { duvidas = duvidas || await (db.assistente?.duvidasRecentes?.() || Promise.resolve([])); } catch { const el = $('#duv'); if (el) el.innerHTML = '<p class="muted">Não deu pra carregar agora.</p>'; return; }
    const el = $('#duv'); if (el) el.innerHTML = duvidas.length ? duvidas.map(d => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b style="font-size:13px">${esc(d.profiles?.nome || 'Aluna')}</b>${DOR.test(d.texto || '') ? ' <span class="pill warn">dor</span>' : ''} <span class="muted small">· ${new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span><p class="muted" style="margin-top:2px">${esc(d.texto)}</p></div>`).join('') : '<p class="muted">Nenhuma dúvida ainda.</p>';
  }

  // Ficha da aluna: tudo dela num lugar só (no lugar dos 4 botões em cada nome)
  function fichaAluna(a) {
    if (!a) return; const fi = fichas.get(a.id);
    const linha = (id, icone, txt, sub = '') => `<button class="linhacard" ${id}><span>${svg(icone)}<b>${txt}</b></span><span class="muted">${sub} ${svg('seta')}</span></button>`;
    overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:10px;margin-top:20px">
      <div class="row between"><h2>${esc(a.nome)}</h2><button class="btn ghost sm" id="c" style="width:auto">Fechar</button></div>
      <p class="muted">${a.dias_sem_treinar === 999 ? 'Nunca treinou no app' : a.dias_sem_treinar === 0 ? 'Treinou hoje' : pl(a.dias_sem_treinar, 'dia', 'dias') + ' sem treinar'} · ${pl(a.treinos_mes, 'treino', 'treinos')} no mês · ${a.pontos} pts${a.ativa ? '' : ' · <b>pausada</b>'}</p>
      ${alertaSaude(fi) ? '<p class="pill warn" style="align-self:flex-start">⚠ pede liberação médica antes de HIIT/carga alta</p>' : ''}
      ${linha(`data-treino="${a.id}" data-n="${esc(a.nome)}"`, 'treino', 'Treino')}
      ${linha(fi ? `data-ficha="${a.id}"` : `data-semficha="${a.id}"`, 'anam', 'Anamnese', fi ? '' : 'não respondeu')}
      ${linha(`data-postural="${a.id}"`, 'post', 'Avaliação postural')}
      ${linha(`data-ac="${a.id}"`, 'ver', 'Acesso ao app', a.ativa ? '' : 'pausado')}
      ${a.whatsapp ? `<a class="btn wa sm" href="${wa(a.whatsapp, `Oi ${a.nome.split(' ')[0]}! `)}" target="_blank" rel="noopener">Chamar no WhatsApp</a>` : ''}
    </div></div>`);
    $('#c').onclick = closeOverlay;
    const box = $('#m');
    box.querySelector('[data-treino]').onclick = () => { closeOverlay(); editorTreino(a.id, a.nome, go); };
    box.querySelector('[data-ficha],[data-semficha]').onclick = () => { if (fi) { closeOverlay(); fichaAnamnese(fi); } else toast('Ela ainda não respondeu a anamnese.'); };
    box.querySelector('[data-postural]').onclick = () => { closeOverlay(); avaliacaoPostural(a); };
    box.querySelector('[data-ac]').onclick = () => { closeOverlay(); acesso(a); };
  }

  async function acesso(a) {
    const { data } = await db.sb.from('profiles').select('nome,whatsapp,ativa').eq('id', a.id).single();
    const { data: u } = await db.sb.rpc('email_de', { uid: a.id }).catch(() => ({ data: null }));
    overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>${esc(data.nome)}</h2>
      <a class="btn wa sm" href="${wa(data.whatsapp, msgAcesso(data.nome, u || '(e-mail dela)'))}" target="_blank" rel="noopener">Enviar acesso no WhatsApp</a>
      <button class="btn ghost sm" id="pausa">${data.ativa ? 'Pausar acesso' : 'Reativar acesso'}</button>
      <button class="btn ghost sm" id="c">Fechar</button></div></div>`);
    $('#c').onclick = closeOverlay; $('#pausa').onclick = async () => { await db.admin.setAtiva(a.id, !data.ativa); closeOverlay(); toast(data.ativa ? 'Acesso pausado' : 'Acesso liberado'); go('admin'); };
  }

  // Responder (ou editar a resposta) vendo o que ela escreveu
  function responder(b) {
    const id = b.dataset.resp || b.dataset.edita || b.dataset.resp2, f = fb.find(x => String(x.id) === String(id)) || {}, de2 = !!b.dataset.resp2, nomeA = String(f.profiles?.nome || 'Ela').split(' ')[0];
    // Conversa sem coluna nova: a resposta nova vai embaixo da anterior, com o que ela escreveu no meio (ela vê tudo e pode responder de novo)
    overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>${de2 ? 'Responder ' + esc(nomeA) : b.dataset.edita ? 'Editar resposta' : 'Responder'}</h2><div class="card" style="background:#101012"><b>${esc(f.profiles?.nome || '')} · ${esc(f.titulo || '')} · ${fmtData(f.finalizada_em)}</b><p class="muted">esforço ${f.esforco ?? '–'} · nota ${f.nota ?? '–'}${f.exercicios_total ? ` · ${f.exercicios_feitos ?? 0} de ${f.exercicios_total} exercícios` : ''}${f.duracao_s ? ` · ${f.duracao_s < 60 ? "&lt;1" : Math.round(f.duracao_s / 60)} min` : ''}</p>${f.comentario ? `<p style="margin-top:6px">"${esc(f.comentario)}"</p>` : ''}${f.resposta_igor && (de2 || f.resposta_aluna) ? `<p class="muted small" style="margin-top:6px;white-space:pre-line">↳ você: ${esc(f.resposta_igor)}</p>` : ''}${f.resposta_aluna ? `<p style="margin-top:6px">↳ ${esc(nomeA)}: "${esc(f.resposta_aluna)}"</p>` : ''}</div><textarea class="input" id="t" placeholder="No seu jeito...">${esc(b.dataset.edita ? f.resposta_igor || '' : '')}</textarea><div class="row"><button class="btn ghost sm" id="c" style="flex:1">Cancelar</button><button class="btn sm" id="s" style="flex:1">Enviar</button></div></div></div>`);
    $('#c').onclick = closeOverlay; $('#s').onclick = async () => { const tx = $('#t').value.trim(); if (!tx) { toast('Escreve a resposta antes de enviar.', true); $('#t').focus(); return; } try { await db.admin.responder(id, de2 ? `${f.resposta_igor}\n\n${nomeA}: "${f.resposta_aluna}"\n\n${tx}` : tx); if (de2) await db.admin.marcarRespostaLida(id).catch(() => {}); closeOverlay(); toast('Respondido ✓ (aparece na tela inicial dela)'); go('admin'); } catch (e) { toast(e.message, true); } };
  }
  function recado() { overlay(`<div class="modal" id="m"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px"><h2>Recado da semana</h2><p class="muted small">Aparece na tela inicial de todas as alunas.</p><textarea class="input" id="t" placeholder="Essa semana é de carga. Anota tudo!"></textarea><input class="input" id="u" placeholder="Link de áudio/vídeo (opcional)"><div class="row"><button class="btn ghost sm" id="c" style="flex:1">Cancelar</button><button class="btn sm" id="s" style="flex:1">Publicar</button></div></div></div>`); $('#c').onclick = closeOverlay; $('#s').onclick = async () => { try { await db.admin.publicarRecado($('#t').value.trim(), $('#u').value.trim() || null); closeOverlay(); toast('Publicado pra todas ✓'); } catch (e) { toast(e.message, true); } }; }

  desenhar();
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
async function editorTreino(alunaId, nome, go, { renovar = false } = {}) {
  const atual = await db.admin.planoDe(alunaId);
  const hojeStr = hojeIso();
  // Igual ao Mfit: início + duração = vencimento. Treino já vencido ou sem datas começa hoje; senão mantém as datas dela.
  // Vindo das Atualizações (renovar): começa no dia seguinte ao vencimento, com a mesma duração do anterior.
  // (Se venceu há mais de 7 dias, começa hoje: não faz sentido um treino novo que já nasce com uma semana gasta.)
  const venceu = !atual?.fim || atual.fim < hojeStr;
  const durAnt = atual?.inicio && atual?.fim ? Math.max(1, Math.round((new Date(atual.fim) - new Date(atual.inicio)) / 604800000)) : 4;
  const depois = atual?.fim ? somaDias(atual.fim, 1) : null;
  const ini0 = renovar && depois ? (depois < somaDias(hojeStr, -7) ? hojeStr : depois) : !atual?.inicio || venceu ? hojeStr : atual.inicio;
  const sem0 = [1, 2, 3, 4, 5, 6, 8, 12].reduce((m, n) => Math.abs(n - durAnt) < Math.abs(m - durAnt) ? n : m, 4); // o select só tem essas durações
  const sem0b = renovar || !venceu ? sem0 : 4;
  construtor({
    db, titulo: `Treino de ${nome.split(' ')[0]}`, treinos: atual?.treinos || [], salvarTxt: 'Publicar pra aluna',
    cabecalho: camposDatas(ini0, sem0b) + (renovar && depois ? `<p class="muted small">Renovação: o anterior vence em ${brDia(atual.fim)}.</p>` : ''),
    textoParaTreinos: parseTreinos, treinosParaTexto: tr => serializar({ treinos: tr.map(t => ({ ...t, exercicios: t.exercicios.map((e, j) => ({ ...e, ordem: j + 1 })) })) }),
    extras: [
      { id: 'usarLib', txt: '📚 usar da biblioteca', fn: est => escolherModelo(est) },
      { id: 'pAlib', txt: '💾 salvar na biblioteca', fn: est => salvarComoModelo(est.get(), nome) }
    ],
    onSalvar: async treinos => { const ini = $('#ini').value || hojeStr, fim = somaFim(ini, +$('#sem').value || 4); await db.admin.salvarPlano(alunaId, ini.slice(0, 7) + '-01', treinos, { inicio: ini, fim }); toast(`Publicado ✓ ${treinos.length} treinos, ${treinos.reduce((n, t) => n + t.exercicios.length, 0)} exercícios · vence em ${brDia(fim)}`); go('admin'); }
  });
  ligarDatas($('#mt')); // escuta no pop-up do editor (antes somava um listener no document a cada abertura)
}
async function escolherModelo(est) {
  let ms = []; try { ms = await db.admin.modelos(); } catch (e) { return toast(e.message, true); }
  if (!ms.length) return toast('Ainda não tem treino na biblioteca. Salva um primeiro (Biblioteca de treinos).', true);
  const c = document.createElement('div'); c.className = 'modal camada'; c.style.cssText = 'align-items:flex-start;overflow:auto;z-index:55';
  c.innerHTML = `<div class="box" style="padding:16px;display:flex;flex-direction:column;gap:10px;margin:20px 0;max-width:460px;width:100%"><div class="row between"><h2>Usar da biblioteca</h2><button class="btn ghost sm" id="emC" style="width:auto">Voltar</button></div><p class="muted small">Substitui o que está no editor. Depois você ajusta o que quiser antes de publicar.</p><div class="lista">${ms.map(m => `<button class="aluna" data-em="${m.id}"><span class="av">${(m.treinos || []).length}</span><span class="t"><b>${esc(m.nome)}</b><span>${(m.treinos || []).map(t => t.letra + (t.nome ? ' ' + esc(t.nome) : '')).join(' · ')}</span></span></button>`).join('')}</div></div>`;
  $('#overlay').appendChild(c); $('#emC', c).onclick = () => c.remove();
  $$('[data-em]', c).forEach(b => b.onclick = () => { const m = ms.find(x => x.id === b.dataset.em); c.remove(); est.set(m.treinos); toast(`"${m.nome}" carregado. Ajusta e publica.`); });
}
async function salvarComoModelo(treinos, nomeAluna) {
  const pronto = treinos.filter(t => t.exercicios.length).map((t, i) => ({ letra: 'ABCDEFGH'[i], nome: t.nome, duracao_min: t.duracao_min, exercicios: t.exercicios.map((e, j, a) => ({ nome: e.nome, series: e.series, reps: String(e.reps), descanso_s: e.descanso_s, video_url: e.video_url || null, dica: e.dica || null, alternativa: e.alternativa || null, biset_com: e.bi ? j + 2 : a[j - 1]?.bi ? j : null })) }));
  if (!pronto.length) return toast('Monta pelo menos um exercício antes.', true);
  const c = document.createElement('div'); c.className = 'modal camada'; c.style.cssText = 'z-index:55';
  c.innerHTML = `<div class="box" style="padding:16px;display:flex;flex-direction:column;gap:10px;max-width:420px;width:100%"><h2>Salvar na biblioteca</h2><label class="campo">Nome do treino<input class="input" id="smN" placeholder="Ex.: Full Body 3x · iniciante" value="${esc(`Treino ${pronto.length}x (de ${nomeAluna.split(' ')[0]})`)}"></label><div class="row"><button class="btn ghost sm" id="smC" style="flex:1">Cancelar</button><button class="btn sm" id="smS" style="flex:1">Salvar</button></div></div>`;
  $('#overlay').appendChild(c); $('#smC', c).onclick = () => c.remove(); $('#smN', c).select();
  $('#smS', c).onclick = async () => { const n = $('#smN', c).value.trim(); if (!n) return toast('Dá um nome.', true); try { await db.admin.salvarModelo({ nome: n, treinos: pronto }); c.remove(); toast('Salvo na biblioteca de treinos ✓'); } catch (e) { toast(e.message, true); } };
}

// Anamnese com problema de saúde ou gestação: o Igor precisa ver antes de passar HIIT/carga
const SAUDE_ALERTA = /press[aã]o|card[ií]ac|diabet|cirurgia|medica[cç][aã]o|asma|peito|desmai|acompanhamento/i;
const alertaSaude = fi => !!fi && (((fi.saude || []).some(x => x !== 'Nenhuma' && SAUDE_ALERTA.test(x))) || (fi.gestacao && fi.gestacao !== 'nao'));
function fichaAnamnese(fi) {
  if (!fi) return;
  const linhas = [['Objetivo', fi.objetivo], ['Dias por semana', fi.dias_semana], ['Tempo por treino', fi.tempo_treino_min && fi.tempo_treino_min + ' min'], ['Sexo', { F: 'mulher', M: 'homem' }[fi.sexo]], ['Horário', { cedo: 'manhã cedo', manha: 'manhã', almoco: 'almoço', tarde: 'tarde', noite: 'noite', varia: 'varia' }[fi.horario]], ['Onde treina', fi.local_treino], ['Academia', { rede: 'grande, de rede', bairro: 'de bairro', condominio: 'de prédio/condomínio' }[fi.academia_tipo]], ['Tem em casa', (fi.equipamento || []).join(', ')], ['Experiência', fi.experiencia], ['Foco', (fi.foco || []).join(', ')], ['Mais incomoda', fi.incomoda], ['Cardio no fim', { sim: 'topa sempre', as_vezes: 'às vezes', nao: 'prefere não' }[fi.cardio]], ['Dor / lesão', fi.limitacoes], ['Não gosta / não consegue', fi.evita], ['Saúde', (fi.saude || []).join(', ')], ['Gestação', { nao: 'não', gravida: 'grávida', pos_parto: 'pós-parto' }[fi.gestacao] || fi.gestacao], ['Ciclo', { regular: 'regular', irregular: 'irregular', anticoncepcional: 'anticoncepcional', nao: 'não menstrua', nd: 'prefere não dizer' }[fi.ciclo]], ['Sono e estresse (1-5)', fi.sono_estresse], ['Dia a dia', fi.atividade], ['Nascimento', fi.nascimento && fmtData(fi.nascimento)], ['Nutricionista', fi.nutri], ['Já desistiu por', fi.desistiu], ['Peso / altura', [fi.peso_kg && fi.peso_kg + ' kg', fi.altura_m && fi.altura_m + ' m'].filter(Boolean).join(' · ')], ['Respondeu em', fi.anamnese_em && fmtData(fi.anamnese_em)]].filter(([, v]) => v != null && v !== '');
  overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:8px;margin-top:20px"><h2>${esc(fi.nome || 'Anamnese')}</h2>${alertaSaude(fi) ? '<p class="pill warn" style="align-self:flex-start">⚠ pede liberação médica antes de HIIT/carga alta</p>' : ''}${linhas.map(([k, v]) => `<div class="r" style="grid-template-columns:1fr"><div><span>${esc(k)}</span><b style="font-weight:600">${esc(v)}</b></div></div>`).join('')}<button class="btn ghost sm" id="c">Fechar</button></div></div>`);
  $('#c').onclick = closeOverlay;
}

// AVALIAÇÃO POSTURAL (só o Igor): as fotos da evolução dela com grade e linha de prumo por cima,
// uma lista de achados de um toque e observação. Fica no perfil dela pra montar o treino; ela não vê.
const ACHADOS = [
  ['Cabeça e ombros', ['Cabeça projetada à frente', 'Ombros desnivelados', 'Ombros projetados à frente', 'Escápula alada']],
  ['Coluna', ['Costas curvadas (hipercifose)', 'Lombar acentuada (hiperlordose)', 'Lombar reta (retificação)', 'Escoliose aparente']],
  ['Quadril', ['Quadril desnivelado', 'Quadril pra frente (anteversão)', 'Quadril pra trás (retroversão)']],
  ['Joelhos e pés', ['Joelho pra dentro (valgo)', 'Joelho pra fora (varo)', 'Joelho estendido demais (hiperextensão)', 'Pé chato / pisada pra dentro', 'Pé cavo / pisada pra fora']]
];
const ANGULOS = [['foto_path', 'Frente'], ['foto_lado', 'Lado'], ['foto_costas', 'Costas']];
async function avaliacaoPostural(a) {
  if (!a) return;
  overlay(`<div class="modal" id="m" style="align-items:flex-start;overflow:auto"><div class="box" style="padding:16px;display:flex;flex-direction:column;gap:12px;margin-top:20px"><h2>Postural · ${esc(a.nome)}</h2><p class="muted" id="pst">Carregando as fotos…</p></div></div>`);
  let ev = [], hist = [];
  try { [ev, hist] = await Promise.all([db.admin.evolucaoDe(a.id), db.admin.posturais(a.id)]); } catch (e) { if ($('#pst')) $('#pst').textContent = 'Não deu pra carregar agora: ' + e.message; return; }
  const comFoto = ev.filter(e => e.foto_path || e.foto_lado || e.foto_costas).reverse(); // mais recente primeiro
  let reg = comFoto[0], ang = 'foto_path', grade = true;
  const marcados = new Set(hist[0]?.achados || []); // começa do que ele marcou da última vez
  const box = $('#m .box'); if (!box) return;
  box.innerHTML = `<div class="row between"><h2>Postural · ${esc(a.nome.split(' ')[0])}</h2><button class="btn ghost sm" id="c">Fechar</button></div>
    ${comFoto.length ? `<div class="row wrap" style="gap:6px">${comFoto.length > 1 ? `<select class="input" id="dt" style="width:auto;min-height:40px">${comFoto.map((e, i) => `<option value="${i}">${fmtData(e.data)}</option>`).join('')}</select>` : `<span class="muted small">Fotos de ${fmtData(reg.data)}</span>`}
      ${ANGULOS.map(([k, l]) => `<button class="pill big-pill ${k === ang ? 'on' : ''}" data-ang="${k}">${l}</button>`).join('')}<button class="pill big-pill on" id="gr">Grade</button></div>
      <div id="ft" style="position:relative;aspect-ratio:3/4;border-radius:14px;overflow:hidden;background:#101012"></div>`
    : `<p class="muted">Ela ainda não mandou as fotos. Dá pra marcar o que você observou pessoalmente ou pelo vídeo.</p>`}
    ${hist.length ? `<p class="small muted">Última avaliação: ${fmtData(hist[0].created_at)}. Os achados dela já vêm marcados abaixo.</p>` : ''}
    ${ACHADOS.map(([g, l]) => `<div><p class="small" style="color:var(--accent);font-weight:600;margin-bottom:6px">${g}</p><div class="opcoes multi">${l.map(x => `<button type="button" class="opc ${marcados.has(x) ? 'on' : ''}" data-ach="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`).join('')}
    <div class="field"><label class="l" for="obs">Observação (o que considerar no treino)</label><textarea class="input" id="obs" rows="3" placeholder="ex. reforçar glúteo médio, mobilidade de tornozelo, cuidado com carga axial">${esc(hist[0]?.obs || '')}</textarea></div>
    <button class="btn sm" id="s">Salvar avaliação</button>
    ${hist.length ? `<details><summary class="linha" style="cursor:pointer;color:var(--muted)"><span>Avaliações anteriores (${hist.length})</span><span class="seta">▾</span></summary>${hist.map(h => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b style="font-size:13px">${fmtData(h.created_at)}</b><p class="muted">${esc((h.achados || []).join(', ') || 'sem achados')}${h.obs ? ' · ' + esc(h.obs) : ''}</p></div>`).join('')}</details>` : ''}`;
  const foto = async () => {
    const el = $('#ft'); if (!el || !reg) return;
    const path = reg[ang]; const url = path ? await db.fotoUrl(path).catch(() => null) : null; if (!$('#ft')) return;
    // grade de 8 colunas x 10 linhas + linha de prumo no meio (laranja), como no papel quadriculado da avaliação
    el.innerHTML = url ? `<img src="${url}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">${grade ? `<div aria-hidden="true" style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.28) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.28) 1px,transparent 1px);background-size:12.5% 10%"></div><div aria-hidden="true" style="position:absolute;top:0;bottom:0;left:50%;width:2px;margin-left:-1px;background:#ff6a00"></div>` : ''}`
      : `<p class="muted" style="position:absolute;inset:0;display:grid;place-items:center;padding:16px;text-align:center">${path ? 'Sem internet pra mostrar a foto' : 'Sem foto desse ângulo nesse dia'}</p>`;
  };
  foto();
  $('#c').onclick = closeOverlay;
  if ($('#dt')) $('#dt').onchange = () => { reg = comFoto[+$('#dt').value]; foto(); };
  $$('[data-ang]').forEach(b => b.onclick = () => { ang = b.dataset.ang; $$('[data-ang]').forEach(x => x.classList.toggle('on', x === b)); foto(); });
  if ($('#gr')) $('#gr').onclick = () => { grade = !grade; $('#gr').classList.toggle('on', grade); foto(); };
  $$('[data-ach]').forEach(b => b.onclick = () => { const x = b.dataset.ach; marcados.has(x) ? marcados.delete(x) : marcados.add(x); b.classList.toggle('on', marcados.has(x)); });
  $('#s').onclick = async () => {
    $('#s').disabled = true; $('#s').textContent = 'Salvando…';
    try { await db.admin.salvarPostural({ aluna_id: a.id, achados: [...marcados], obs: $('#obs').value.trim() || null, foto_data: reg?.data || null }); closeOverlay(); toast('Avaliação postural salva ✓'); }
    catch (e) { toast(e.message, true); if ($('#s')) { $('#s').disabled = false; $('#s').textContent = 'Salvar avaliação'; } }
  };
}
