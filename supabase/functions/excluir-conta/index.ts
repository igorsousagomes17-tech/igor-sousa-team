// Edge Function "excluir-conta": a própria aluna apaga a conta dela de dentro do app (exigência da App Store e da Play Store).
// Confere a senha de novo, apaga as fotos dela no Storage e depois o usuário no Auth.
// Apagar o usuário leva junto (on delete cascade) perfil, planos, treinos, sessões, séries, pontos, evolução, chat, avisos e Strava.
// O admin (Igor) não consegue se excluir por aqui, pra não perder o painel sem querer.
// Deploy: painel do Supabase › Edge Functions › excluir-conta (Verify JWT ligado ou desligado: a função confere sozinha).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: { user } } = await caller.auth.getUser(jwt);
  if (!user?.email) return json({ erro: 'nao_autenticado' }, 401);

  const { senha } = await req.json().catch(() => ({}));
  if (!senha) return json({ erro: 'senha' }, 400);
  // Senha conferida num cliente à parte: não mexe na sessão de ninguém
  const conf = createClient(url, anon, { auth: { persistSession: false } });
  const { error: eSenha } = await conf.auth.signInWithPassword({ email: user.email, password: String(senha) });
  if (eSenha) return json({ erro: 'senha' }, 403);

  const admin = createClient(url, service);
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role === 'admin') return json({ erro: 'admin' }, 403);

  // Fotos de evolução (pasta com o id dela) — o cascade do banco não apaga arquivos do Storage
  try {
    for (;;) {
      const { data: arqs } = await admin.storage.from('evolucao').list(user.id, { limit: 100 });
      if (!arqs?.length) break;
      await admin.storage.from('evolucao').remove(arqs.map(a => `${user.id}/${a.name}`));
      if (arqs.length < 100) break;
    }
  } catch (_) { /* sem bucket ou sem fotos: segue */ }

  // Quem ela indicou continua com conta, só perde a ligação com ela
  await admin.from('profiles').update({ indicada_por: null }).eq('indicada_por', user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ erro: 'falhou', detalhe: error.message }, 500);
  return json({ ok: true });
});
