// Camada de dados: Supabase + cache local do treino (pra abrir sem sinal).
import { createClient } from './vendor/supabase.js'; // empacotado no app: abre sem internet
import { idioma } from './i18n.js';

const C = window.ISTEAM_CONFIG;
export const sb = createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const LS = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
export { LS };

export async function sessionUser() {
  const { data } = await sb.auth.getSession();
  return data.session?.user || null;
}
export async function login(email, senha) {
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
  if (error) throw error;
  return data.user;
}
// scope local: limpa a sessão do celular mesmo sem sinal (o signOut normal precisa de internet e deixava ela logada)
export async function logout() { try { await sb.auth.signOut({ scope: 'local' }); } catch {} LS.del('plano'); LS.del('perfil'); try { await caches.delete('isteam-fotos'); } catch {} for (const k in blobs) delete blobs[k]; } // fotos dela não ficam pra quem entrar depois
// Confere a senha de agora antes de trocar (quem pegar o celular dela aberto não troca a senha)
export async function conferirSenha(senha) { const { data } = await sb.auth.getUser(); const email = data?.user?.email; if (!email) return true; const { error } = await sb.auth.signInWithPassword({ email, password: senha }); if (error) { if (/invalid|credentials/i.test(error.message)) return false; throw error; } return true; }
export async function trocarSenha(nova) { const { error } = await sb.auth.updateUser({ password: nova }); if (error) throw error; }
export async function esqueciSenha(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: location.origin + location.pathname });
  if (error) throw error;
}

export async function perfil() {
  const u = await sessionUser(); if (!u) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', u.id).single();
  if (error) { const c = LS.get('perfil'); if (!c && /fetch|network|Failed|load failed/i.test(String(error.message))) throw new Error('offline'); return c; } // sem sinal e sem nada guardado: quem chamou avisa "sem internet" (não "conta sem perfil")
  LS.set('perfil', data); return data;
}
export async function salvarPerfil(patch) {
  const u = await sessionUser();
  const { data, error } = await sb.from('profiles').update(patch).eq('id', u.id).select().single();
  if (error) throw error; LS.set('perfil', data); return data;
}

// Plano do mês com treinos e exercícios (uma consulta, cacheada).
const mesLocal1 = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
export async function planoAtual(alunaId) {
  const mesStr = mesLocal1();
  const { data, error } = await sb.from('planos')
    .select('id,mes,titulo,obs,treinos(id,letra,nome,duracao_min,ordem,exercicios(id,ordem,nome,series,reps,descanso_s,video_url,dica,alternativa,biset_com))')
    .eq('aluna_id', alunaId).lte('mes', mesStr).order('mes', { ascending: false }).limit(1);
  if (error || !data?.length) return LS.get('plano');
  const p = data[0];
  p.treinos.sort((a, b) => a.ordem - b.ordem || a.letra.localeCompare(b.letra));
  p.treinos.forEach(t => t.exercicios.sort((a, b) => a.ordem - b.ordem));
  LS.set('plano', p); return p;
}

export async function programas() {
  const { data } = await sb.from('programas').select('*,programa_treinos(id,nome,duracao_min,ordem,exercicios)').eq('ativo', true).order('ordem');
  if (data) { data.forEach(p => p.programa_treinos?.sort((a, b) => a.ordem - b.ordem)); LS.set('programas', data); return data; }
  return LS.get('programas', []);
}

export async function recadoAtual() {
  const { data } = await sb.from('recados').select('*').eq('ativo', true).order('publicado_em', { ascending: false }).limit(1);
  return data?.[0] || null;
}
export async function desafioAtual() {
  const { data } = await sb.from('desafios').select('*').eq('mes', mesLocal1()).maybeSingle();
  return data;
}

// Sessões -------------------------------------------------------------
export async function iniciarSessao(alunaId, { treino_id = null, programa_treino_id = null, titulo, total }) {
  const { data, error } = await sb.from('sessoes').insert({ aluna_id: alunaId, treino_id, programa_treino_id, titulo, exercicios_total: total }).select().single();
  if (error) throw error; return data;
}
// Substitui as séries da sessão: se a 1ª tentativa chegou no banco mas a resposta não voltou (4G travado),
// o reenvio da fila não duplica.
export async function salvarSeries(sessaoId, rows) {
  const del = await sb.from('series').delete().eq('sessao_id', sessaoId);
  if (del.error) throw del.error;
  if (!rows.length) return;
  const { error } = await sb.from('series').insert(rows.map(r => ({ ...r, sessao_id: sessaoId })));
  if (error) throw error;
}
// Apaga um registro de carga errado (ex.: digitou 1122 no lugar de 12)
export async function apagarCarga(sessaoId, exercicioNome) {
  const { error } = await sb.from('series').delete().eq('sessao_id', sessaoId).eq('exercicio_nome', exercicioNome);
  if (error) throw error;
}
// Treino pausado de propósito: o aviso "Terminou o treino?" do servidor não vai pra ela (usa a marca do próprio aviso)
export async function marcarPausa(sessaoId) { if (!sessaoId) return; try { await sb.from('sessoes').update({ lembrete_aberto_em: new Date().toISOString() }).eq('id', sessaoId).is('finalizada_em', null); } catch {} }
export async function finalizarSessao(sessaoId, patch) {
  // finalizada_em vem do celular (hora em que ela terminou), assim treino enviado depois cai no dia certo
  const { data, error } = await sb.from('sessoes').update({ finalizada_em: new Date().toISOString(), ...patch }).eq('id', sessaoId).select().single();
  if (error) throw error; return data;
}
// Histórico de carga por NOME do exercício: vale entre treinos e meses diferentes.
export async function historicoCarga(alunaId, exercicioNome, limit = 5) {
  const { data, error } = await sb.from('series').select('kg,reps,n,sessao_id,sessoes!inner(aluna_id,finalizada_em,comentario)')
    .eq('exercicio_nome', exercicioNome).eq('sessoes.aluna_id', alunaId).not('sessoes.finalizada_em', 'is', null).not('kg', 'is', null)
    .order('sessoes(finalizada_em)', { ascending: false }).limit(limit * 6);
  if (error) throw error; // sem sinal: quem chamou mostra o que tem no celular
  if (!data?.length) return [];
  // agrupa por sessão: maior carga da sessão + todas as séries (pirâmide 22/25/28)
  const por = {};
  data.forEach(r => { const k = r.sessoes.finalizada_em; const a = por[k] || (por[k] = { kg: r.kg, reps: r.reps, data: k, sessao_id: r.sessao_id, sets: [], express: /^⚡ Express/.test(r.sessoes.comentario || '') }); a.sets.push({ n: r.n, kg: +r.kg, reps: r.reps }); if (+r.kg > +a.kg) { a.kg = r.kg; a.reps = r.reps; } });
  Object.values(por).forEach(a => a.sets.sort((x, y) => x.n - y.n));
  return Object.values(por).sort((a, b) => b.data.localeCompare(a.data)).slice(0, limit);
}
// Última carga: busca no banco e guarda no celular; sem internet usa a guardada.
// Dia em que ela parou no meio (1 de 3 séries) não vira a "Última"; "ant" = treino anterior (pro +/− kg).
export const escolheUltima = h => { const mx = Math.max(0, ...h.filter(x => !x.express).map(x => x.sets?.length || 0)), j = Math.max(0, h.findIndex(x => !x.sets || x.express || x.sets.length >= mx)); return h[j] ? { ...h[j], ant: h[j + 1]?.kg ?? null } : null; };
export async function ultimaCarga(alunaId, exercicioNome) {
  const cache = LS.get('cargas', {});
  try { const u = escolheUltima(await historicoCarga(alunaId, exercicioNome, 3)); if (u) { cache[exercicioNome] = u; LS.set('cargas', cache); } return u || cache[exercicioNome] || null; }
  catch { return cache[exercicioNome] || null; }
}
// Minhas cargas: a carga mais pesada do último treino de cada exercício + a do anterior, direto do banco.
export async function cargasRecentes(alunaId) {
  const { data, error } = await sb.from('series').select('exercicio_nome,kg,reps,sessao_id,sessoes!inner(aluna_id,finalizada_em)')
    .eq('sessoes.aluna_id', alunaId).not('sessoes.finalizada_em', 'is', null).not('kg', 'is', null)
    .order('sessoes(finalizada_em)', { ascending: false }).limit(1500);
  if (error) throw error;
  const por = {};
  (data || []).forEach(r => { const l = por[r.exercicio_nome] || (por[r.exercicio_nome] = []); let a = l.find(x => x.sessao_id === r.sessao_id); if (!a) { if (l.length >= 2) return; a = { sessao_id: r.sessao_id, kg: +r.kg, reps: r.reps, data: r.sessoes.finalizada_em }; l.push(a); } else if (+r.kg > a.kg) { a.kg = +r.kg; a.reps = r.reps; } });
  const out = {}; Object.entries(por).forEach(([n, l]) => { out[n] = { kg: l[0].kg, reps: l[0].reps, data: l[0].data, ant: l[1]?.kg ?? null }; });
  return out;
}
// Séries do último treino desse exercício, uma por número de série (pra sugerir a carga certa na pirâmide).
export async function ultimasSeries(alunaId, exercicioNome) {
  const { data } = await sb.from('series').select('kg,reps,n,sessao_id,sessoes!inner(aluna_id,finalizada_em)')
    .eq('exercicio_nome', exercicioNome).eq('sessoes.aluna_id', alunaId).not('sessoes.finalizada_em', 'is', null).not('kg', 'is', null)
    .order('sessoes(finalizada_em)', { ascending: false }).limit(12);
  if (!data?.length) return null;
  // Último dia em que ela fez todas as séries (dia que parou no meio não apaga a sugestão das séries 2 e 3)
  const cont = {}; data.forEach(r => { cont[r.sessao_id] = (cont[r.sessao_id] || 0) + 1; }); const mx = Math.max(...Object.values(cont));
  const sid = (data.find(r => cont[r.sessao_id] >= mx) || data[0]).sessao_id, por = {}; data.filter(r => r.sessao_id === sid).forEach(r => { por[r.n] = +r.kg; });
  return por;
}
// Guarda a última carga no celular; "ant" = a carga do treino anterior (pra mostrar ↑/↓ em Minhas cargas)
export function guardarCarga(exercicioNome, kg, reps, sessao) { if (!kg) return; const c = LS.get('cargas', {}), v = c[exercicioNome]; const mesma = v && v.sessao && v.sessao === sessao, ant = mesma ? v.ant : v?.kg, prev = mesma ? v.prev ?? null : v ? { ...v, prev: undefined } : null; c[exercicioNome] = { kg, reps, prev, data: new Date().toISOString(), sessao: sessao || null, ant: ant ?? null }; LS.set('cargas', c); }
// Treino descartado: a carga que ele gravou no celular volta pra de antes (não fica "Última: 80 kg" de um treino que não existiu)
export function desfazerCargas(sessao) { if (!sessao) return; const c = LS.get('cargas', {}); let mudou = false; for (const [n, v] of Object.entries(c)) if (v?.sessao === sessao) { mudou = true; if (v.prev) { const { prev, ...r } = v.prev; c[n] = r; } else delete c[n]; } if (mudou) LS.set('cargas', c); }
// Séries de um treino (Evolução › Meus treinos)
export async function editarSerie(id, patch) { const { error } = await sb.from('series').update(patch).eq('id', id); if (error) throw error; }
export async function seriesDe(sessaoId) { const { data, error } = await sb.from('series').select('id,exercicio_nome,n,kg,reps').eq('sessao_id', sessaoId).order('n'); if (error) throw error; return data || []; }
export async function minhasSessoes(alunaId, limit = 60) {
  const { data, error } = await sb.from('sessoes').select('id,titulo,finalizada_em,duracao_s,exercicios_feitos,exercicios_total,esforco,nota,comentario,resposta_igor,respondida_em')
    .eq('aluna_id', alunaId).not('finalizada_em', 'is', null).order('finalizada_em', { ascending: false }).limit(limit);
  if (error || !data) return LS.get('sessoes', []); // sem sinal: mostra o que tinha (sequência e metas não zeram)
  if (limit >= 60) LS.set('sessoes', data);
  return data;
}
export async function registrarPontos(alunaId, motivo, pontos, ref) {
  const { error } = await sb.from('pontos_log').insert({ aluna_id: alunaId, motivo, pontos, ref });
  if (error && !String(error.message).includes('duplicate')) throw error;
  return !error;
}
export async function meusPontos(alunaId) {
  const { data, error } = await sb.from('pontos_log').select('*').eq('aluna_id', alunaId).order('created_at', { ascending: false }).limit(50);
  if (error || !data) return LS.get('pontos', []);
  LS.set('pontos', data); return data;
}

// Evolução -------------------------------------------------------------
export async function evolucao(alunaId) {
  const { data, error } = await sb.from('evolucao').select('*').eq('aluna_id', alunaId).order('data');
  if (error || !data) return LS.get('evolucao', []);
  LS.set('evolucao', data); return data;
}
export async function salvarEvolucao(alunaId, row, fotos = {}) {
  // fotos: { frente: File, lado: File, costas: File }
  const paths = {};
  for (const [k, file] of Object.entries(fotos)) {
    if (!file) continue;
    const path = `${alunaId}/${row.data}-${k}.jpg`;
    const { error } = await sb.storage.from('evolucao').upload(path, file, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    paths[k === 'frente' ? 'foto_path' : 'foto_' + k] = path;
    delete blobs[path]; caches.open(FOTOS).then(c => c.delete('./_foto/' + path)).catch(() => {}); // foto trocada no mesmo dia: não mostra a velha guardada
  }
  const { data, error } = await sb.from('evolucao').upsert({ aluna_id: alunaId, ...row, ...paths }, { onConflict: 'aluna_id,data' }).select().single();
  if (error) throw error; return data;
}
// Foto da evolução: baixa uma vez e guarda no celular (abrir de novo não gasta dados e funciona sem sinal)
const FOTOS = 'isteam-fotos', blobs = {};
export async function fotoUrl(path) {
  if (!path) return null;
  if (blobs[path]) return blobs[path];
  try { const c = await caches.open(FOTOS), r = await c.match('./_foto/' + path); if (r) return (blobs[path] = URL.createObjectURL(await r.blob())); } catch {}
  const { data } = await sb.storage.from('evolucao').createSignedUrl(path, 3600);
  const url = data?.signedUrl || null; if (!url) return null;
  try { const res = await fetch(url); if (res.ok) { const b = await res.blob(); caches.open(FOTOS).then(c => c.put('./_foto/' + path, new Response(b, { headers: { 'content-type': b.type || 'image/jpeg' } }))).catch(() => {}); return (blobs[path] = URL.createObjectURL(b)); } } catch {}
  return url;
}

// Admin ----------------------------------------------------------------
// O time: quem treinou hoje, ranking do mês (só primeiro nome + inicial). Função no banco (migração 009).
export async function comunidade() { const { data, error } = await sb.rpc('fn_comunidade'); if (error) throw error; return data; }
// Avisos com o app fechado (função push, migração 011)
export const push = {
  async chave() { const r = await fetch(C.SUPABASE_URL + '/functions/v1/push', { headers: { apikey: C.SUPABASE_ANON_KEY } }); if (!r.ok) throw new Error('push ' + r.status); return (await r.json()).chave; },
  // Alarme do descanso pelo servidor (iPhone com a tela apagada). Só se este celular está inscrito nos avisos.
  async descanso(d) { const reg = await navigator.serviceWorker?.ready; if (!(await reg?.pushManager?.getSubscription())) return false; const { data: { session } } = await sb.auth.getSession(); if (!session) return false; const r = await fetch(C.SUPABASE_URL + '/functions/v1/push', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json', apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ acao: 'descanso', ...d }) }); return r.ok; },
  async cancelarDescanso(id) { const { data: { session } } = await sb.auth.getSession(); if (!session) return; await fetch(C.SUPABASE_URL + '/functions/v1/push', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json', apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ acao: 'cancelar_descanso', id }) }).catch(() => {}); },
  async inscrever(sub) { const { data: { session } } = await sb.auth.getSession(); const r = await fetch(C.SUPABASE_URL + '/functions/v1/push', { method: 'POST', headers: { 'content-type': 'application/json', apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (session?.access_token || '') }, body: JSON.stringify({ acao: 'inscrever', sub }) }); if (!r.ok) throw new Error('push ' + r.status); },
};
export const precisaVer = f => !!(String(f.comentario || '').trim() || (f.nota != null && f.nota <= 4) || (f.esforco != null && f.esforco >= 9));
export const admin = {
  // Avaliação postural (só o Igor vê): fotos da evolução dela + achados marcados por ele
  async evolucaoDe(alunaId) { const { data, error } = await sb.from('evolucao').select('*').eq('aluna_id', alunaId).order('data'); if (error) throw error; return data || []; },
  async posturais(alunaId) { const { data, error } = await sb.from('postural').select('*').eq('aluna_id', alunaId).order('created_at', { ascending: false }).limit(20); if (error) throw error; return data || []; },
  async salvarPostural(row) { const { data, error } = await sb.from('postural').insert(row).select().single(); if (error) throw error; return data; },
  async alunas() { const { data, error } = await sb.from('v_alunas_status').select('*').order('nome'); if (error) throw error; return data; },
  // Treinos com comentário dela OU nota baixa (≤ 4) / esforço no limite (≥ 9) sem texto: sem tempo de escrever,
  // a nota é o sinal. Os sem resposta vêm primeiro (nenhum some da lista por ser antigo).
  async feedbacks() {
    const sel = 'id,titulo,finalizada_em,esforco,nota,comentario,resposta_igor,exercicios_feitos,exercicios_total,duracao_s,profiles!sessoes_aluna_id_fkey(nome,plano)';
    const sinal = 'comentario.not.is.null,nota.lte.4,esforco.gte.9';
    const [abertos, respondidos] = await Promise.all([
      sb.from('sessoes').select(sel).not('finalizada_em', 'is', null).or(sinal).is('resposta_igor', null).order('finalizada_em', { ascending: true }).limit(200),
      sb.from('sessoes').select(sel).not('finalizada_em', 'is', null).or(sinal).not('resposta_igor', 'is', null).order('finalizada_em', { ascending: false }).limit(10)]);
    if (abertos.error) throw abertos.error;
    return [...(abertos.data || []), ...(respondidos.data || [])].filter(precisaVer);
  },
  async responder(sessaoId, texto) { const { error } = await sb.from('sessoes').update({ resposta_igor: texto, respondida_em: new Date().toISOString() }).eq('id', sessaoId); if (error) throw error; },
  async anamneses() { const { data } = await sb.from('profiles').select('id,nome,whatsapp,objetivo,sexo,horario,academia_tipo,equipamento,cardio,evita,ciclo,dias_semana,tempo_treino_min,local_treino,experiencia,foco,incomoda,limitacoes,saude,gestacao,sono_estresse,atividade,nascimento,nutri,desistiu,peso_kg,altura_m,anamnese_em,created_at').eq('role', 'aluna').order('created_at', { ascending: false }).limit(500); return data || []; },
  async planoDe(alunaId) {
    const { data } = await sb.from('planos').select('id,mes,titulo,treinos(id,letra,nome,ordem,exercicios(*))').eq('aluna_id', alunaId).order('mes', { ascending: false }).limit(1);
    return data?.[0] || null;
  },
  async salvarPlano(alunaId, mesStr, treinos) {
    // treinos: [{letra,nome,duracao_min,exercicios:[{nome,series,reps,descanso_s,video_url,dica,alternativa}]}]
    const { data: plano, error } = await sb.from('planos').upsert({ aluna_id: alunaId, mes: mesStr }, { onConflict: 'aluna_id,mes' }).select().single();
    if (error) throw error;
    await sb.from('treinos').delete().eq('plano_id', plano.id);
    for (const [i, t] of treinos.entries()) {
      const { data: tr, error: e2 } = await sb.from('treinos').insert({ plano_id: plano.id, letra: t.letra, nome: t.nome, duracao_min: t.duracao_min || 40, ordem: i }).select().single();
      if (e2) throw e2;
      const exs = t.exercicios.map((e, j) => ({ treino_id: tr.id, ordem: j + 1, ...e }));
      if (exs.length) { const { error: e3 } = await sb.from('exercicios').insert(exs); if (e3) throw e3; }
    }
    return plano;
  },
  async publicarRecado(texto, midia_url) { const { error } = await sb.from('recados').insert({ texto, midia_url }); if (error) throw error; },
  async setAtiva(id, ativa) { const { error } = await sb.from('profiles').update({ ativa }).eq('id', id); if (error) throw error; },
  // Bibliotecas do Igor (exercícios e treinos-modelo)
  async libExercicios() { const { data, error } = await sb.from('biblioteca_exercicios').select('*').order('nome'); if (error) throw error; return data || []; },
  async salvarExercicioLib(row) { row = { ...row, updated_at: new Date().toISOString() }; const q = row.id ? sb.from('biblioteca_exercicios').update(row).eq('id', row.id) : sb.from('biblioteca_exercicios').insert(row); const { data, error } = await q.select().single(); if (error) throw error; return data; },
  async apagarExercicioLib(id) { const { error } = await sb.from('biblioteca_exercicios').delete().eq('id', id); if (error) throw error; },
  // vídeo novo na biblioteca: entra nos treinos das alunas que ainda estão sem vídeo nesse exercício
  async videoNosTreinos(nome, video_url) { const { data, error } = await sb.from('exercicios').update({ video_url }).ilike('nome', nome).is('video_url', null).select('id'); if (error) throw error; return (data || []).length; },
  async modelos() { const { data, error } = await sb.from('modelos_treino').select('*').order('updated_at', { ascending: false }); if (error) throw error; return data || []; },
  async salvarModelo(row) { row = { ...row, updated_at: new Date().toISOString() }; const q = row.id ? sb.from('modelos_treino').update(row).eq('id', row.id) : sb.from('modelos_treino').insert(row); const { data, error } = await q.select().single(); if (error) throw error; return data; },
  async apagarModelo(id) { const { error } = await sb.from('modelos_treino').delete().eq('id', id); if (error) throw error; }
};

// Tira-dúvidas (IA). A conversa com a IA acontece na função do servidor "assistente".
// Tradução do conteúdo do Igor pra outra língua (IA no servidor, guardada no banco). Só logada.
export async function traduzir(id, textos) {
  const { data: { session } } = await sb.auth.getSession(); if (!session) return null;
  const r = await fetch(`${C.SUPABASE_URL}/functions/v1/assistente`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: C.SUPABASE_ANON_KEY }, body: JSON.stringify({ acao: 'traduzir', idioma: id, textos }) });
  if (!r.ok) return null; return (await r.json()).traducoes || null;
}
export const assistente = {
  async historico(alunaId) {
    const { data, error } = await sb.from('assistente_msgs').select('papel,texto,created_at').eq('aluna_id', alunaId).order('created_at', { ascending: false }).limit(30);
    if (error || !data) return LS.get('chat', []); // sem sinal: a conversa que estava no celular
    const h = data.reverse(); LS.set('chat', h); return h;
  },
  async perguntar(texto, contexto) {
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch(`${C.SUPABASE_URL}/functions/v1/assistente`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: C.SUPABASE_ANON_KEY }, body: JSON.stringify({ texto, contexto, idioma: idioma() }) }); // a IA responde no idioma do app
    const j = await r.json().catch(() => ({}));
    if (!j.resposta) throw new Error(j.erro || 'falhou');
    return j;
  },
  async duvidasRecentes() { // painel do Igor
    const { data } = await sb.from('assistente_msgs').select('texto,created_at,aluna_id,profiles(nome)').eq('papel', 'user').order('created_at', { ascending: false }).limit(25);
    return data || [];
  }
};
