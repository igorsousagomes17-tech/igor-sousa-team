// Acolhimento e aderência: boas-vindas animada, passeio guiado, resumo da semana, lembretes e o cantinho do time.
// Princípio do Igor: o app tem que acolher e vender pra quem tá chegando e continuar encantando quem já tá dentro.
import { $, $$, esc, toast, primeiroNome } from './ui.js';
import { t, tp, num, dataLocal, loc } from './i18n.js';

// Vídeo de boas-vindas do Igor (quando ele gravar): coloca o link do arquivo .mp4 aqui e ele substitui a foto.
export const VIDEO_BOAS_VINDAS = '';

const LSget = (k, d = null) => { try { const v = localStorage.getItem('acolhe:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const LSset = (k, v) => { try { localStorage.setItem('acolhe:' + k, JSON.stringify(v)); } catch {} };
const semMovimento = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
// Demo: só aparece com ?boasvindas (os testes e a demonstração entram direto no Início).
const demoPula = () => { const q = new URLSearchParams(location.search); return q.has('demo') && !q.has('boasvindas'); };

// 1) BOAS-VINDAS -------------------------------------------------------------------------
export const boasVindasPendente = perfil => !demoPula() && !LSget('bv@' + perfil.id);
export function boasVindas(perfil) {
  return new Promise(ok => {
    LSset('bv@' + perfil.id, Date.now());
    const nome = esc(primeiroNome(perfil.nome) || '');
    const el = document.createElement('div');
    el.className = 'bv' + (semMovimento() ? ' parado' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', t('Boas-vindas'));
    el.innerHTML = `<div class="bv-glow"></div>${Array.from({ length: 14 }, (_, i) => `<i class="bv-p" style="--i:${i}"></i>`).join('')}
      <div class="bv-in">
        <div class="bv-logo"><span>IGOR</span> <span>SOUSA</span> <b>TEAM</b></div>
        <div class="bv-ring">${VIDEO_BOAS_VINDAS ? `<video src="${esc(VIDEO_BOAS_VINDAS)}" playsinline muted autoplay loop></video>` : `<img src="icons/igor_s.jpg" alt="Igor Sousa">`}</div>
        <h1 class="bv-oi">${nome ? t('Oi, {nome}!', { nome }) : t('Oi!')} 🧡</h1>
        <p class="bv-txt">${t('Que bom ter você no time! A partir de hoje a gente treina junto: eu monto seu treino, você só segue o passo a passo. Qualquer dúvida, tô aqui. Bora?')}</p>
        <p class="bv-ass">— Igor Sousa</p>
        <button class="btn bv-btn" id="bvOk">${t('Bora começar')}</button>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    const fechar = () => { el.classList.add('sai'); setTimeout(() => { el.remove(); ok(); }, semMovimento() ? 0 : 380); };
    el.querySelector('#bvOk').onclick = fechar;
    setTimeout(() => el.querySelector('#bvOk')?.focus(), 1600);
  });
}

// 2) PASSEIO GUIADO ------------------------------------------------------------------------
const PASSOS = [
  ['#semana', 'Começo da semana', 'Toda segunda você escolhe por qual treino começar a semana. Na dúvida, toca em "seguir a ordem normal" e eu mostro o treino do dia.'],
  ['.card.hero', 'Treino de hoje', 'Aqui aparece o treino do dia. Toca em abrir e é só seguir: o app mostra o exercício, a sua última carga e o cronômetro do descanso.'],
  ['.home-ia', 'Tira-dúvidas 24h', 'Ficou com dúvida no meio do treino? Pergunta aqui. A IA do time responde na hora, com base no seu treino.'],
  ['.home-time', 'O time', 'Você não treina sozinha: aqui você vê quem do time já treinou hoje e o ranking do mês.'],
  ['.tabs [data-go="perfil"]', 'Perfil', 'Pontos, evolução e prêmios ficam nas abas aqui embaixo. No Perfil tem sua anamnese, as respostas do Igor e este passeio, se quiser ver de novo.'],
];
export const passeioPendente = perfil => !demoPula() && !LSget('tour@' + perfil.id) && !!perfil.objetivo;
export function passeio(perfil) {
  LSset('tour@' + perfil.id, Date.now());
  const passos = PASSOS.filter(([sel]) => document.querySelector(sel));
  if (!passos.length) return;
  const el = document.createElement('div'); el.className = 'tour'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="tour-hole"></div><div class="tour-box" aria-live="polite"><b class="tour-t"></b><p class="tour-x"></p><div class="row between tour-acoes"><button class="back tour-pula">${t('Pular')}</button><span class="tour-dots"></span><button class="btn sm tour-ok"></button></div></div>`;
  document.body.appendChild(el); document.documentElement.style.overflow = 'hidden';
  let i = 0; const hole = el.querySelector('.tour-hole'), box = el.querySelector('.tour-box');
  const fim = () => { if (!el.isConnected) return; el.remove(); document.documentElement.style.overflow = ''; window.removeEventListener('resize', mostra); scrollTo({ top: 0, behavior: semMovimento() ? 'instant' : 'smooth' }); setTimeout(() => { toast(t('Tudo pronto! Bora pro primeiro treino? 💪')); $('#toast')?.classList.add('topo'); }, 350); };
  function mostra() {
    const [sel, tit, txt] = passos[i]; const alvo = document.querySelector(sel);
    if (!alvo) { if (++i < passos.length) return mostra(); return fim(); }
    alvo.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = alvo.getBoundingClientRect(), pad = alvo.closest('.tabs') ? 2 : 6;
    const L = Math.max(4, r.left - pad), R = Math.min(innerWidth - 4, r.right + pad);
    Object.assign(hole.style, { left: L + 'px', top: r.top - pad + 'px', width: R - L + 'px', height: r.height + pad * 2 + 'px' });
    el.querySelector('.tour-t').textContent = t(tit); el.querySelector('.tour-x').textContent = t(txt);
    el.querySelector('.tour-dots').innerHTML = passos.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    el.querySelector('.tour-ok').textContent = i === passos.length - 1 ? t('Entendi') : t('Próximo');
    el.querySelector('.tour-pula').style.visibility = i === passos.length - 1 ? 'hidden' : '';
    // balão embaixo do destaque; se não couber, em cima
    const H = innerHeight, bh = box.offsetHeight || 170, emBaixo = r.bottom + pad + 14 + bh < H - 8;
    box.style.top = (emBaixo ? r.bottom + pad + 12 : Math.max(8, r.top - pad - 12 - bh)) + 'px';
    box.classList.toggle('cima', !emBaixo);
  }
  el.querySelector('.tour-ok').onclick = () => { if (++i < passos.length) mostra(); else fim(); };
  el.querySelector('.tour-pula').onclick = fim;
  window.addEventListener('resize', mostra); el._fim = fim;
  mostra();
}
// Mudou de tela (voltar do Android, toque numa aba): o passeio fecha sem deixar o destaque perdido
export function fecharPasseio() { const el = document.querySelector('.tour'); if (el) { el.remove(); document.documentElement.style.overflow = ''; } }
export const refazerPasseio = perfil => { try { localStorage.removeItem('acolhe:tour@' + perfil.id); } catch {} };

// 3) RESUMO DA SEMANA ----------------------------------------------------------------------
// Semana de segunda a domingo (igual à "Meta da semana"). sessoes: as finalizadas dela (treino do mês + programas).
export function resumoSemana({ sessoes, cargas, perfil, semanaKey, isoWeek, semanasSeguidas, kcalDe }) {
  const da = sessoes.filter(s => s.finalizada_em && isoWeek(new Date(s.finalizada_em)) === semanaKey && (s.exercicios_feitos ?? 1) > 0);
  const minutos = Math.round(da.reduce((a, s) => a + (s.duracao_s || 0), 0) / 60);
  const exercicios = da.reduce((a, s) => a + (s.exercicios_feitos || 0), 0);
  const subiu = Object.entries(cargas || {}).filter(([, c]) => c?.kg && c.ant && +c.kg > +c.ant && c.data && isoWeek(new Date(c.data)) === semanaKey)
    .map(([nome, c]) => ({ nome, de: +c.ant, para: +c.kg })).sort((a, b) => (b.para - b.de) - (a.para - a.de));
  const meta = perfil.dias_semana || 4, kcal = kcalDe ? da.reduce((a, s) => a + (kcalDe(s) || 0), 0) : 0;
  return { semanaKey, treinos: da.length, meta, minutos, exercicios, subiu, titulos: da.map(s => s.titulo), semanas: semanasSeguidas, bateu: da.length >= meta, kcal };
}
export const fraseSemana = r => r.bateu ? t('Semana fechada! Você fez {n} de {m} treinos 🔥', { n: r.treinos, m: r.meta })
  : r.treinos ? tp(r.treinos, '{n} treino na semana. Cada um conta: a próxima a gente busca os {m}!', '{n} treinos na semana. Cada um conta: a próxima a gente busca os {m}!', { m: r.meta })
  : t('Semana sem treino registrado. Sem culpa: a próxima começa agora.');
// Card do Início: aparece de segunda a quarta sobre a semana passada (se ela treinou), até ela abrir ou fechar.
export function cardResumoHome(r) {
  if (!r?.treinos || LSget('resumoVisto') === r.semanaKey) return '';
  return `<button class="card resumo-home" id="resumoSem" style="width:100%;text-align:left;color:var(--fg)"><div class="row between"><b style="font-size:1rem">📊 ${t('Sua semana passada')}</b><span class="pill on">${r.treinos}/${r.meta}</span></div><p class="muted">${fraseSemana(r)}</p><p class="small mt" style="color:var(--accent)">${t('ver o resumo')} ›</p></button>`;
}
export const resumoVisto = key => LSset('resumoVisto', key);
export function htmlResumo(r, { nome, titulo }) {
  const pct = Math.min(100, Math.round(r.treinos / r.meta * 100));
  return `<div class="resumo">
    <div class="row between"><div class="logo sm">IGOR SOUSA <b>TEAM</b></div><span class="pill">${esc(titulo)}</span></div>
    <h1 style="font-size:2.25rem;margin-top:6px">${t('MINHA|SEMANA').replace('|', ' ')}</h1>
    <p class="muted">${fraseSemana(r)}</p>
    <div class="resumo-anel" style="--p:${pct}%"><div><b>${r.treinos}</b><span>${t('de {m} treinos', { m: r.meta })}</span></div></div>
    <div class="grid2" style="margin-top:4px">
      <div class="card"><div class="big">${num(r.minutos)}<small> ${t('min')}</small></div><p class="muted">${t('treinando')}${r.kcal ? ` · ~${num(r.kcal)} kcal` : ''}</p></div>
      <div class="card"><div class="big" style="color:var(--accent)"><span style="font-size:.6em;vertical-align:.25em">🔥</span>${r.semanas}</div><p class="muted">${tp(r.semanas, 'semana seguida', 'semanas seguidas')}</p></div>
    </div>
    ${r.subiu.length ? `<div class="card"><b>💪 ${tp(r.subiu.length, 'Subiu a carga em {n} exercício', 'Subiu a carga em {n} exercícios')}</b>${r.subiu.slice(0, 4).map(s => `<div class="row between" style="font-size:0.875rem;padding-top:6px;gap:8px"><span>${esc(s.nome)}</span><b style="color:var(--accent);white-space:nowrap">${num(s.de)} → ${num(s.para)} kg</b></div>`).join('')}</div>` : ''}
    ${nome ? `<p class="muted small center">${esc(nome)}</p>` : ''}
  </div>`;
}
// "19–25 de out." / "Oct 19–25" / "26 de out. – 1 de nov." no idioma dela
export function periodoSemana(atual) {
  const seg = new Date(); seg.setHours(12, 0, 0, 0); seg.setDate(seg.getDate() - (seg.getDay() + 6) % 7 - (atual ? 0 : 7)); const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  try { return new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'short' }).formatRange(seg, dom); } catch { return `${dataLocal(seg, { day: 'numeric', month: 'short' })} – ${dataLocal(dom, { day: 'numeric', month: 'short' })}`; }
}
// Imagem do resumo pro story (1080x1920), no mesmo estilo do card de treino feito.
export async function imagemResumo(r, { nome, titulo, insta }) {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#0b0b0c'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W - 140, 140, 20, W - 140, 140, 700); g.addColorStop(0, 'rgba(255,106,0,.55)'); g.addColorStop(1, 'rgba(255,106,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const DISP = '"Barlow Condensed", Impact, "Noto Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans Devanagari", system-ui, sans-serif', BODY = 'Barlow, Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans Devanagari", system-ui, sans-serif';
  x.fillStyle = '#f4f2ee'; x.font = `800 54px ${DISP}`; x.fillText('IGOR SOUSA', 70, 120); x.fillStyle = '#ff6a00'; x.fillText('TEAM', 70 + x.measureText('IGOR SOUSA ').width, 120);
  x.fillStyle = '#9a968f'; x.font = `500 30px ${BODY}`; x.fillText(titulo, W - 70 - x.measureText(titulo).width, 118);
  const [l1, l2] = t('MINHA|SEMANA').split('|'); let fs = 200; x.font = `800 ${fs}px ${DISP}`;
  while (fs > 90 && Math.max(x.measureText(l1).width, x.measureText(l2).width) > W - 140) { fs -= 10; x.font = `800 ${fs}px ${DISP}`; }
  x.fillStyle = '#f4f2ee'; x.fillText(l1, 70, 520); x.fillStyle = '#ff6a00'; x.fillText(l2, 70, 520 + fs * 0.95);
  // anel de treinos
  const cx = W / 2, cy = 1050, rr = 230; x.lineWidth = 44; x.strokeStyle = '#26262a'; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = '#ff6a00'; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, r.treinos / r.meta)); x.stroke();
  x.fillStyle = '#f4f2ee'; x.textAlign = 'center'; x.font = `800 190px ${DISP}`; x.fillText(String(r.treinos), cx, cy + 60);
  x.fillStyle = '#9a968f'; x.font = `500 40px ${BODY}`; x.fillText(t('de {m} treinos', { m: r.meta }), cx, cy + 120); x.textAlign = 'left';
  const stats = [[`${num(r.minutos)}`, t('min treinando')], [`🔥${r.semanas}`, tp(r.semanas, 'semana seguida', 'semanas seguidas')]];
  if (r.subiu.length) stats.push([`💪${r.subiu.length}`, tp(r.subiu.length, 'carga subiu', 'cargas subiram')]);
  stats.forEach(([v, l], j) => { const yy = 1440 + j * 110; x.fillStyle = j === 1 ? '#ff6a00' : '#f4f2ee'; x.font = `800 86px ${DISP}`; x.fillText(v, 70, yy); const wv = x.measureText(v).width; x.fillStyle = '#9a968f'; let fz = 40; x.font = `500 ${fz}px ${BODY}`; while (fz > 26 && x.measureText(l).width > W - 160 - wv) { fz -= 2; x.font = `500 ${fz}px ${BODY}`; } x.fillText(l, 70 + wv + 20, yy); });
  x.fillStyle = '#9a968f'; x.font = `500 36px ${BODY}`; x.fillText(nome + ' · ' + t('treino com'), 70, 1790); x.fillStyle = '#ff6a00'; x.font = `700 46px ${BODY}`; x.fillText(insta, 70, 1850);
  const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
  const file = new File([blob], 'minha-semana.jpg', { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: t('Minha semana') }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancel'; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'minha-semana.jpg'; a.click(); return 'download';
}

// 4) LEMBRETES ----------------------------------------------------------------------------
// Android (app instalado na tela inicial, Chrome): o celular acorda o app de tempos em tempos e, se ela estiver
// há 3+ dias sem treinar, aparece um aviso carinhoso. iPhone: precisa de aviso enviado pelo servidor (próxima fase).
export const lembreteSuportado = () => 'Notification' in window && 'serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype;
export const lembreteLigado = () => LSget('lembrete') === 'sim' && 'Notification' in window && Notification.permission === 'granted';
// 'ok' só quando o celular aceitou acordar o app sozinho; 'instalar' = falta pôr o app na tela inicial.
export async function ligarLembrete({ silencioso = false } = {}) {
  if (!lembreteSuportado()) return 'sem';
  const r = silencioso ? Notification.permission : await Notification.requestPermission(); if (r !== 'granted') return 'negado';
  try {
    const st = await navigator.permissions?.query({ name: 'periodic-background-sync' }).catch(() => null);
    if (st && st.state !== 'granted') { if (!silencioso) LSset('lembrete', 'sim'); return 'instalar'; }
    const reg = await navigator.serviceWorker.ready; await reg.periodicSync.register('lembrete', { minInterval: 12 * 3600000 });
    LSset('lembrete', 'sim'); return 'ok';
  } catch { if (!silencioso) LSset('lembrete', 'sim'); return 'instalar'; }
}
export async function desligarLembrete() {
  LSset('lembrete', 'nao');
  try { const reg = await navigator.serviceWorker.ready; await reg.periodicSync?.unregister('lembrete'); } catch {}
  limparLembrete();
}
// Saiu da conta / acesso pausado / desligou: o celular para de avisar e esquece o nome dela
export function limparLembrete() { try { navigator.serviceWorker?.controller?.postMessage({ tipo: 'lembreteDados', ultimo: null }); } catch {} }
// O app avisa o SW do último treino e do próximo (ele guarda pra usar quando acordar sozinho).
export function avisarSW({ ultimo, nome, proximo }) {
  if (!lembreteLigado()) return;
  try { navigator.serviceWorker?.controller?.postMessage({ tipo: 'lembreteDados', ultimo, nome, proximo, textos: { titulo: t('Saudade de você no treino, {nome} 🧡', { nome }), corpo: t('Faz {n} dias. Bora 20 minutinhos hoje? O {x} tá te esperando.') } }); } catch {}
}
// Card do Início pra quem voltou depois de uns dias (sem culpa, só acolhimento).
export function cardVolta(perfil, sessoes, prox) {
  const ult = sessoes.find(s => s.finalizada_em); if (!ult) return '';
  const dias = Math.floor((Date.now() - new Date(ult.finalizada_em)) / 86400000);
  const hoje = new Date().toDateString(); if (dias < 3 || LSget('volta') === hoje) return '';
  return `<div class="card volta" id="volta"><b style="font-size:1rem">${t('Que bom te ver de volta, {nome}! 🧡', { nome: esc(primeiroNome(perfil.nome)) })}</b><p class="muted">${t('Faz {n} dias desde o último treino. Sem culpa, sem recomeçar do zero: é só continuar.', { n: dias })}</p><div class="row mt" style="gap:8px">${prox ? `<button class="btn sm" style="flex:1" data-go="treino" data-arg="${esc(prox.letra)}">${t('Bora pro {x}', { x: esc(t('Treino {l}', { l: prox.letra })) })}</button>` : ''}<button class="btn ghost sm volta-x" aria-label="${t('Fechar')}" style="${prox ? 'width:48px;padding:0' : 'flex:1'}">${prox ? '✕' : t('ok, bora')}</button></div></div>`;
}
export const voltaVisto = () => LSset('volta', new Date().toDateString());

// 5) O TIME (comunidade) -----------------------------------------------------------------
const quanto = d => { const m = Math.max(1, Math.round((Date.now() - new Date(d)) / 60000)); return m < 60 ? t('há {n} min', { n: m }) : m < 1440 ? tp(Math.round(m / 60), 'há {n} hora', 'há {n} horas') : tp(Math.round(m / 1440), 'há {n} dia', 'há {n} dias'); };
const iniciais = n => String(n || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const nomeSessao = x => /^Treino [A-Z]$/.test(x || '') ? t('o Treino {l}', { l: x.slice(-1) }) : (String(x || '').split(' · ')[0] || t('um treino'));
// Empate = mesma posição; mostra o top 5 e, se ela estiver mais pra baixo, a linha dela.
function rankComEmpate(d) {
  const lista = d.ranking || []; let pos = 0, ant = null;
  const comPos = lista.map((r, k) => { if (r.n !== ant) { pos = k; ant = r.n; } return { r, i: pos }; });
  const top = comPos.filter(x => x.i < 5); const eu = comPos.find(x => x.r.eu && x.i >= 5) || (d.minha && !comPos.some(x => x.r.eu) ? { r: { nome: t('você'), n: d.minha.n, eu: true }, i: d.minha.pos - 1 } : null);
  return eu && !top.includes(eu) ? [...top, eu] : top;
}
const resto = d => Math.max(0, (d.ativas_mes || 0) - rankComEmpate(d).length);
export function htmlTime(d) {
  const medalha = i => ['🥇', '🥈', '🥉'][i] || `<span class="pos">${i + 1}º</span>`;
  return `<div class="card hero" style="color:#1a0d00"><span class="pill" style="background:rgba(0,0,0,.18);color:#1a0d00">${t('Hoje no time')}</span>
      <div class="logo" style="font-size:2.5rem;margin:8px 0 2px;color:#1a0d00">${num(d.hoje || 0)} 🔥</div>
      <p style="font-weight:600">${tp(d.hoje || 0, 'menina do time já treinou hoje', 'meninas do time já treinaram hoje')}</p>
      <p class="small" style="margin-top:6px;font-weight:600;opacity:.8">${t('Juntas: {n} treinos esse mês', { n: num(d.mes || 0) })}</p></div>
    <div class="card"><h3>${t('Ranking do mês')}</h3><p class="muted small">${t('Quem mais treinou no mês. Vale presença, não carga.')}</p>
      ${(d.ranking || []).length ? `<div class="rank">${rankComEmpate(d).map(({ r, i }) => `<div class="rk ${r.eu ? 'eu' : ''}"><span class="md">${medalha(i)}</span><span class="av">${esc(iniciais(r.nome))}</span><b>${esc(r.nome)}${r.eu ? ` <span class="pill on" style="font-size:0.6875rem">${t('você')}</span>` : ''}</b><span class="n">${tp(r.n, '{n} treino', '{n} treinos')}</span></div>`).join('')}</div>${resto(d) ? `<p class="muted small mt">${tp(resto(d), '+ {n} menina treinando firme 💪', '+ {n} meninas treinando firme 💪')}</p>` : ''}` : `<p class="muted mt">${t('O ranking começa com o primeiro treino do mês.')}</p>`}</div>
    <div class="card"><h3>${t('Quem treinou hoje')}</h3>
      ${(d.feed || []).length ? `<div class="feed">${d.feed.slice(0, 20).map(f => `<div class="fd"><span class="av">${esc(iniciais(f.nome))}</span><div><b>${esc(f.nome)}</b> ${t('fez {x}', { x: esc(nomeSessao(f.titulo)) })} 💪<span class="muted small" style="display:block">${quanto(f.finalizada_em)}</span></div></div>`).join('')}</div>` : `<p class="muted mt">${t('Ninguém treinou ainda hoje. Bora ser a primeira? 😉')}</p>`}</div>
    <p class="muted small center">${t('No time aparece só o primeiro nome e a inicial. Dá pra sair do ranking no seu Perfil.')}</p>`;
}
