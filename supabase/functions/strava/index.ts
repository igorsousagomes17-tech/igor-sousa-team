// Edge Function "strava": liga a aluna ao Strava e lança o treino finalizado como atividade (Musculação).
// Segredos (Supabase › Edge Functions › Secrets): STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET. Opcional: APP_URL.
// - GET ?code&state            → volta do Strava (autorização): guarda os tokens e manda a aluna de volta pro app
// - POST {acao:'url'}          → devolve o endereço de autorização do Strava (com estado de uso único)
// - POST {acao:'status'}       → {conectado, atleta}
// - POST {acao:'desconectar'}  → revoga no Strava e apaga os tokens
// - POST {acao:'enviar', chave, titulo, inicio, duracao_s, descricao} → cria a atividade (1 vez por chave)
// Deploy: painel do Supabase › Edge Functions › strava (Verify JWT DESLIGADO: a função confere sozinha).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const cid = Deno.env.get('STRAVA_CLIENT_ID'), secret = Deno.env.get('STRAVA_CLIENT_SECRET');
  const app = Deno.env.get('APP_URL') || 'https://igorsousagomes17-tech.github.io/igor-sousa-team/';
  const db = createClient(url, service);
  const aqui = url + '/functions/v1/strava';

  // Volta do Strava
  if (req.method === 'GET') {
    const u = new URL(req.url), code = u.searchParams.get('code'), estado = u.searchParams.get('state') || '';
    const volta = (r: string) => Response.redirect(app + '?strava=' + r, 302);
    if (!cid || !secret || !code || u.searchParams.get('error')) return volta('negado');
    const { data: e } = await db.from('strava_estados').delete().eq('estado', estado).select('aluna_id').maybeSingle();
    if (!e) return volta('erro');
    const r = await fetch('https://www.strava.com/oauth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: cid, client_secret: secret, code, grant_type: 'authorization_code' }) });
    if (!r.ok) return volta('erro');
    const t = await r.json(); const escopo = u.searchParams.get('scope') || '';
    if (!/activity:write/.test(escopo)) return volta('sem_permissao'); // ela desmarcou a permissão de publicar
    await db.from('strava_conexoes').upsert({ aluna_id: e.aluna_id, atleta_id: t.athlete?.id, atleta_nome: [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(' '), access_token: t.access_token, refresh_token: t.refresh_token, expira_em: new Date(t.expires_at * 1000).toISOString(), escopo });
    return volta('ok');
  }

  let body: any = {}; try { body = await req.json(); } catch { /* vazio */ }
  const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } }).auth.getUser();
  if (!user) return json({ erro: 'nao_autenticado' }, 401);

  if (body.acao === 'status') {
    const { data: c } = await db.from('strava_conexoes').select('atleta_nome').eq('aluna_id', user.id).maybeSingle();
    return json({ conectado: !!c, atleta: c?.atleta_nome || null, configurado: !!(cid && secret) });
  }
  if (!cid || !secret) return json({ erro: 'nao_configurado' }, 503);

  if (body.acao === 'url') {
    const estado = crypto.randomUUID();
    await db.from('strava_estados').insert({ estado, aluna_id: user.id });
    const p = new URLSearchParams({ client_id: cid, response_type: 'code', redirect_uri: aqui, approval_prompt: 'auto', scope: 'activity:write', state: estado });
    return json({ url: 'https://www.strava.com/oauth/authorize?' + p });
  }

  const { data: c } = await db.from('strava_conexoes').select('*').eq('aluna_id', user.id).maybeSingle();
  if (body.acao === 'desconectar') {
    if (c) { try { await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { Authorization: 'Bearer ' + c.access_token } }); } catch { /* segue */ } await db.from('strava_conexoes').delete().eq('aluna_id', user.id); }
    return json({ ok: true });
  }

  if (body.acao === 'enviar') {
    if (!c) return json({ erro: 'nao_conectado' }, 409);
    const chave = String(body.chave || ''); if (!chave) return json({ erro: 'sem_chave' }, 400);
    const { data: ja } = await db.from('strava_envios').select('atividade_id').eq('aluna_id', user.id).eq('chave', chave).maybeSingle();
    if (ja) return json({ ok: true, repetido: true });
    let token = c.access_token;
    if (new Date(c.expira_em).getTime() < Date.now() + 60000) { // token vale 6 h: renova
      const r = await fetch('https://www.strava.com/oauth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: cid, client_secret: secret, grant_type: 'refresh_token', refresh_token: c.refresh_token }) });
      if (!r.ok) { if (r.status === 400 || r.status === 401) await db.from('strava_conexoes').delete().eq('aluna_id', user.id); return json({ erro: 'reconectar' }, 409); }
      const t = await r.json(); token = t.access_token;
      await db.from('strava_conexoes').update({ access_token: t.access_token, refresh_token: t.refresh_token, expira_em: new Date(t.expires_at * 1000).toISOString() }).eq('aluna_id', user.id);
    }
    const ini = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(body.inicio || '') ? String(body.inicio).slice(0, 19) + 'Z' : new Date().toISOString().slice(0, 19) + 'Z'; // horário local da aluna, como o Strava pede
    const r = await fetch('https://www.strava.com/api/v3/activities', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ name: String(body.titulo || 'Treino').slice(0, 100), sport_type: 'WeightTraining', start_date_local: ini, elapsed_time: String(Math.max(60, Math.floor(+body.duracao_s || 0))), description: String(body.descricao || 'Treino feito no app Igor Sousa Team 💪').slice(0, 500) }) });
    if (!r.ok) return json({ erro: 'strava_' + r.status }, 502);
    const a = await r.json();
    await db.from('strava_envios').insert({ aluna_id: user.id, chave, atividade_id: a.id });
    return json({ ok: true, id: a.id });
  }
  return json({ erro: 'acao_desconhecida' }, 400);
});
