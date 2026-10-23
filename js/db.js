// Camada de dados: Supabase + cache local do treino (pra abrir sem sinal).
import { createClient } from './vendor/supabase.js'; // empacotado no app: abre sem internet

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
export async function logout() { await sb.auth.signOut(); LS.del('plano'); LS.del('perfil'); }
export async function trocarSenha(nova) { const { error } = await sb.auth.updateUser({ password: nova }); if (error) throw error; }
export async function esqueciSenha(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: location.origin + location.pathname });
  if (error) throw error;
}

export async function perfil() {
  const u = await sessionUser(); if (!u) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', u.id).single();
  if (error) { return LS.get('perfil'); }
  LS.set('perfil', data); return data;
}
export async function salvarPerfil(patch) {
  const u = await sessionUser();
  const { data, error } = await sb.from('profiles').update(patch).eq('id', u.id).select().single();
  if (error) throw error; LS.set('perfil', data); return data;
}

// Plano do mês com treinos e exercícios (uma consulta, cacheada).
export async function planoAtual(alunaId) {
  const mes = new Date(); mes.setDate(1);
  const mesStr = mes.toISOString().slice(0, 10);
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
  const mes = new Date(); mes.setDate(1);
  const { data } = await sb.from('desafios').select('*').eq('mes', mes.toISOString().slice(0, 10)).maybeSingle();
  return data;
}

// Sessões -------------------------------------------------------------
export async function iniciarSessao(alunaId, { treino_id = null, programa_treino_id = null, titulo, total }) {
  const { data, error } = await sb.from('sessoes').insert({ aluna_id: alunaId, treino_id, programa_treino_id, titulo, exercicios_total: total }).select().single();
  if (error) throw error; return data;
}
export async function salvarSeries(sessaoId, rows) {
  if (!rows.length) return;
  const { error } = await sb.from('series').insert(rows.map(r => ({ ...r, sessao_id: sessaoId })));
  if (error) throw error;
}
export async function finalizarSessao(sessaoId, patch) {
  // finalizada_em vem do celular (hora em que ela terminou), assim treino enviado depois cai no dia certo
  const { data, error } = await sb.from('sessoes').update({ finalizada_em: new Date().toISOString(), ...patch }).eq('id', sessaoId).select().single();
  if (error) throw error; return data;
}
// Histórico de carga por NOME do exercício: vale entre treinos e meses diferentes.
export async function historicoCarga(alunaId, exercicioNome, limit = 5) {
  const { data } = await sb.from('series').select('kg,reps,n,sessoes!inner(aluna_id,finalizada_em)')
    .eq('exercicio_nome', exercicioNome).eq('sessoes.aluna_id', alunaId).not('sessoes.finalizada_em', 'is', null).not('kg', 'is', null)
    .order('sessoes(finalizada_em)', { ascending: false }).limit(limit * 6);
  if (!data?.length) return [];
  // agrupa por sessão: maior carga da sessão
  const por = {};
  data.forEach(r => { const k = r.sessoes.finalizada_em; if (!por[k] || +r.kg > +por[k].kg) por[k] = { kg: r.kg, reps: r.reps, data: k }; });
  return Object.values(por).sort((a, b) => b.data.localeCompare(a.data)).slice(0, limit);
}
// Última carga: busca no banco e guarda no celular; sem internet usa a guardada.
export async function ultimaCarga(alunaId, exercicioNome) {
  const cache = LS.get('cargas', {});
  try { const u = (await historicoCarga(alunaId, exercicioNome, 1))[0] || null; if (u) { cache[exercicioNome] = u; LS.set('cargas', cache); } return u || cache[exercicioNome] || null; }
  catch { return cache[exercicioNome] || null; }
}
// Séries do último treino desse exercício, uma por número de série (pra sugerir a carga certa na pirâmide).
export async function ultimasSeries(alunaId, exercicioNome) {
  const { data } = await sb.from('series').select('kg,reps,n,sessao_id,sessoes!inner(aluna_id,finalizada_em)')
    .eq('exercicio_nome', exercicioNome).eq('sessoes.aluna_id', alunaId).not('sessoes.finalizada_em', 'is', null).not('kg', 'is', null)
    .order('sessoes(finalizada_em)', { ascending: false }).limit(12);
  if (!data?.length) return null;
  const sid = data[0].sessao_id, por = {}; data.filter(r => r.sessao_id === sid).forEach(r => { por[r.n] = +r.kg; });
  return por;
}
export function guardarCarga(exercicioNome, kg, reps) { if (!kg) return; const c = LS.get('cargas', {}); c[exercicioNome] = { kg, reps, data: new Date().toISOString() }; LS.set('cargas', c); }
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
  }
  const { data, error } = await sb.from('evolucao').upsert({ aluna_id: alunaId, ...row, ...paths }, { onConflict: 'aluna_id,data' }).select().single();
  if (error) throw error; return data;
}
export async function fotoUrl(path) {
  if (!path) return null;
  const { data } = await sb.storage.from('evolucao').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

// Admin ----------------------------------------------------------------
export const admin = {
  async alunas() { const { data, error } = await sb.from('v_alunas_status').select('*').order('nome'); if (error) throw error; return data; },
  // Só treinos COM comentário dela; os sem resposta vêm primeiro (nenhum some da lista por ser antigo).
  async feedbacks() {
    const sel = 'id,titulo,finalizada_em,esforco,nota,comentario,resposta_igor,profiles!sessoes_aluna_id_fkey(nome,plano)';
    const [abertos, respondidos] = await Promise.all([
      sb.from('sessoes').select(sel).not('finalizada_em', 'is', null).not('comentario', 'is', null).neq('comentario', '').is('resposta_igor', null).order('finalizada_em', { ascending: true }).limit(200),
      sb.from('sessoes').select(sel).not('finalizada_em', 'is', null).not('comentario', 'is', null).neq('comentario', '').not('resposta_igor', 'is', null).order('finalizada_em', { ascending: false }).limit(10)]);
    if (abertos.error) throw abertos.error;
    return [...(abertos.data || []), ...(respondidos.data || [])];
  },
  async responder(sessaoId, texto) { const { error } = await sb.from('sessoes').update({ resposta_igor: texto, respondida_em: new Date().toISOString() }).eq('id', sessaoId); if (error) throw error; },
  async anamneses() { const { data } = await sb.from('profiles').select('id,nome,whatsapp,objetivo,dias_semana,local_treino,limitacoes,peso_kg,altura_m,created_at').eq('role', 'aluna').order('created_at', { ascending: false }).limit(50); return data || []; },
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
  async setAtiva(id, ativa) { const { error } = await sb.from('profiles').update({ ativa }).eq('id', id); if (error) throw error; }
};
