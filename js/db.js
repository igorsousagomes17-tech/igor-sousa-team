// Camada de dados: Supabase + cache local do treino (pra abrir sem sinal).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

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
  const { data, error } = await sb.from('sessoes').update({ ...patch, finalizada_em: new Date().toISOString() }).eq('id', sessaoId).select().single();
  if (error) throw error; return data;
}
export async function ultimaCarga(alunaId, exercicioNome) {
  const { data } = await sb.from('series').select('kg,reps,sessao_id,sessoes!inner(aluna_id,finalizada_em)')
    .eq('exercicio_nome', exercicioNome).eq('sessoes.aluna_id', alunaId).not('sessoes.finalizada_em', 'is', null)
    .order('sessoes(finalizada_em)', { ascending: false }).limit(1);
  return data?.[0] || null;
}
export async function minhasSessoes(alunaId, limit = 60) {
  const { data } = await sb.from('sessoes').select('id,titulo,finalizada_em,duracao_s,exercicios_feitos,exercicios_total,esforco,nota,comentario,resposta_igor')
    .eq('aluna_id', alunaId).not('finalizada_em', 'is', null).order('finalizada_em', { ascending: false }).limit(limit);
  return data || [];
}
export async function registrarPontos(alunaId, motivo, pontos, ref) {
  const { error } = await sb.from('pontos_log').insert({ aluna_id: alunaId, motivo, pontos, ref });
  if (error && !String(error.message).includes('duplicate')) throw error;
  return !error;
}
export async function meusPontos(alunaId) {
  const { data } = await sb.from('pontos_log').select('*').eq('aluna_id', alunaId).order('created_at', { ascending: false }).limit(50);
  return data || [];
}

// Evolução -------------------------------------------------------------
export async function evolucao(alunaId) {
  const { data } = await sb.from('evolucao').select('*').eq('aluna_id', alunaId).order('data');
  return data || [];
}
export async function salvarEvolucao(alunaId, row, file) {
  let foto_path = null;
  if (file) {
    foto_path = `${alunaId}/${Date.now()}.jpg`;
    const { error } = await sb.storage.from('evolucao').upload(foto_path, file, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
  }
  const { data, error } = await sb.from('evolucao').upsert({ aluna_id: alunaId, ...row, ...(foto_path ? { foto_path } : {}) }, { onConflict: 'aluna_id,data' }).select().single();
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
  async feedbacks() {
    const { data } = await sb.from('sessoes').select('id,titulo,finalizada_em,esforco,nota,comentario,resposta_igor,profiles!sessoes_aluna_id_fkey(nome)')
      .not('finalizada_em', 'is', null).or('comentario.neq.,resposta_igor.is.null').order('finalizada_em', { ascending: false }).limit(50);
    return data || [];
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
