// Edge Function: cria aluna no Auth (senha inicial = WhatsApp) + perfil. Só admin chama.
// Deploy: supabase functions deploy criar-aluna
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: 'não autenticado' }, 401);
  const { data: me } = await caller.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return json({ error: 'só o Igor pode cadastrar' }, 403);

  const admin = createClient(url, service);
  const { alunas = [] } = await req.json();
  let criadas = 0; const erros: { email: string; erro: string }[] = [];
  for (const a of alunas) {
    try {
      const email = String(a.email || '').trim().toLowerCase();
      const senha = String(a.whatsapp || '').replace(/\D/g, '');
      if (!email || senha.length < 8) throw new Error('e-mail ou whatsapp inválido');
      const { data: u, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome: a.nome } });
      if (error) throw error;
      const { error: e2 } = await admin.from('profiles').insert({ id: u.user.id, nome: a.nome, whatsapp: senha, nascimento: a.nascimento || null, sexo: a.sexo || 'F', role: 'aluna' });
      if (e2) throw e2;
      criadas++;
    } catch (e) { erros.push({ email: a.email, erro: (e as Error).message }); }
  }
  return json({ criadas, erros });
});
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } }); }
