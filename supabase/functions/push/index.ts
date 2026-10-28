// Edge Function "push": avisos no celular mesmo com o app fechado (Android e iPhone com o app na tela inicial).
// - GET                     → chave pública VAPID (gera e guarda no banco na 1ª vez; ninguém precisa copiar chave)
// - POST {acao:'inscrever'} → guarda a inscrição do celular da aluna logada
// - POST {acao:'cron'} + cabeçalho x-cron → roda os lembretes (chamado pelo pg_cron a cada 10 min, migração 011)
// Lembrete hoje: treino iniciado há 1h30 e não finalizado → "Terminou o treino?" (1 vez por treino, até 8h depois).
// Deploy: painel do Supabase › Edge Functions › push (Verify JWT desligado: a função confere sozinha).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(url, service);

  // Chaves VAPID guardadas no banco (tabela sem acesso pelo app)
  const ler = async (k: string) => (await db.from('config_privada').select('valor').eq('chave', k).maybeSingle()).data?.valor as string | undefined;
  let pub = await ler('vapid_publica'), priv = await ler('vapid_privada');
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys(); pub = k.publicKey; priv = k.privateKey;
    await db.from('config_privada').upsert([{ chave: 'vapid_publica', valor: pub }, { chave: 'vapid_privada', valor: priv }]);
  }
  webpush.setVapidDetails('mailto:igorsousagomes17@gmail.com', pub, priv);
  if (req.method === 'GET') return json({ chave: pub });

  let body: any = {}; try { body = await req.json(); } catch { /* vazio */ }

  if (body.acao === 'inscrever') {
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user } } = await createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } }).auth.getUser();
    if (!user) return json({ erro: 'nao_autenticado' }, 401);
    const s = body.sub || {};
    if (!s.endpoint || !s.keys?.p256dh || !s.keys?.auth) return json({ erro: 'inscricao_invalida' }, 400);
    const { error } = await db.from('push_inscricoes').upsert({ endpoint: s.endpoint, aluna_id: user.id, p256dh: s.keys.p256dh, auth: s.keys.auth, atualizado_em: new Date().toISOString() }, { onConflict: 'endpoint' });
    return error ? json({ erro: error.message }, 500) : json({ ok: true });
  }

  if (body.acao === 'cron') {
    const segredo = await ler('cron');
    if (!segredo || req.headers.get('x-cron') !== segredo) return json({ erro: 'proibido' }, 403);
    const agora = Date.now();
    const { data: abertas } = await db.from('sessoes').select('id,aluna_id,titulo,iniciada_em,profiles!inner(nome,ativa)')
      .is('finalizada_em', null).is('lembrete_aberto_em', null)
      .lt('iniciada_em', new Date(agora - 90 * 60000).toISOString()).gt('iniciada_em', new Date(agora - 8 * 3600000).toISOString()).limit(200);
    let enviados = 0;
    for (const s of abertas || []) {
      await db.from('sessoes').update({ lembrete_aberto_em: new Date().toISOString() }).eq('id', s.id); // marca antes: nunca manda 2x
      if (!(s as any).profiles?.ativa) continue;
      const nome = String((s as any).profiles?.nome || '').trim().split(' ')[0];
      const treino = /^Treino [A-Z]$/.test(s.titulo || '') ? `seu ${s.titulo}` : 'seu treino';
      const msg = { title: `Terminou o treino${nome ? ', ' + nome : ''}? 💪`, body: `${treino[0].toUpperCase() + treino.slice(1)} ainda tá aberto. Já terminou? Toca aqui pra registrar o que você fez.`, url: './#sessao', tag: 'treino-aberto' };
      const { data: subs } = await db.from('push_inscricoes').select('endpoint,p256dh,auth').eq('aluna_id', s.aluna_id);
      for (const sub of subs || []) {
        try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(msg), { TTL: 3600 }); enviados++; }
        catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('push_inscricoes').delete().eq('endpoint', sub.endpoint); }
      }
    }
    return json({ ok: true, abertas: (abertas || []).length, enviados });
  }
  return json({ erro: 'acao' }, 400);
});
