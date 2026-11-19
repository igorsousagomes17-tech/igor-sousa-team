// Edge Function: cadastro por convite (19/11/2026). PÚBLICA (deploy com Verify JWT DESLIGADO).
// A própria aluna cria a conta pelo app (nome, WhatsApp, e-mail e senha dela). A conta nasce
// PAUSADA (ativa=false) e "aguardando": ela preenche a anamnese e o Igor libera no painel.
// Nada é liberado sem o Igor: quem não é aluna e se cadastrar fica parado, sem ver nada do time.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const LIMITE_HORA = 40; // trava contra robô: mais que isso de cadastros novos numa hora, pausa o cadastro

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ erro: 'dados' }, 400); }
  if (String(b.site || '').trim()) return json({ ok: true }); // campo escondido: só robô preenche

  const nome = String(b.nome || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const email = String(b.email || '').trim().toLowerCase();
  const whatsapp = String(b.whatsapp || '').replace(/\D/g, '');
  const senha = String(b.senha || '');
  if (nome.length < 3 || !/\S+\s+\S+/.test(nome)) return json({ erro: 'nome' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) return json({ erro: 'email' }, 400);
  if (whatsapp.length < 10 || whatsapp.length > 13) return json({ erro: 'whatsapp' }, 400);
  if (senha.length < 6 || senha.length > 72) return json({ erro: 'senha' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const umaHora = new Date(Date.now() - 3600000).toISOString();
  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('aguardando', true).gte('created_at', umaHora);
  if ((count || 0) >= LIMITE_HORA) return json({ erro: 'muitos' }, 429);

  const { data: u, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome, origem: 'convite' } });
  if (error) return json({ erro: /already|registered|exists/i.test(error.message) ? 'ja_existe' : 'falhou' }, /already|registered|exists/i.test(error.message) ? 409 : 500);
  const { error: e2 } = await admin.from('profiles').insert({ id: u.user.id, nome, whatsapp, role: 'aluna', ativa: false, aguardando: true, senha_trocada: true });
  if (e2) { await admin.auth.admin.deleteUser(u.user.id).catch(() => {}); return json({ erro: 'falhou' }, 500); }
  return json({ ok: true });
});
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } }); }
