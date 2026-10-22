// Edge Function: webhook da Kiwify. Pagamento aprovado → cria/reativa aluna. Cancelado/atrasado → pausa.
// Configurar na Kiwify: Apps → Webhooks → URL desta função + token em KIWIFY_TOKEN (Secrets).
// Deploy: supabase functions deploy kiwify-webhook --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

Deno.serve(async (req) => {
  const token = Deno.env.get('KIWIFY_TOKEN');
  const u = new URL(req.url);
  if (token && u.searchParams.get('token') !== token) return new Response('forbidden', { status: 403 });
  const body = await req.json().catch(() => ({}));
  const status = String(body.order_status || body.webhook_event_type || '').toLowerCase();
  const cust = body.Customer || body.customer || {};
  const email = String(cust.email || '').trim().toLowerCase();
  const nome = cust.full_name || cust.first_name || email;
  const whatsapp = String(cust.mobile || cust.phone || '').replace(/\D/g, '');
  if (!email) return new Response('sem email', { status: 400 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const aprovado = /paid|approved|aprovad|subscription_renewed|order_approved/.test(status);
  const cancelado = /refunded|chargedback|canceled|cancelled|subscription_canceled|subscription_late|late/.test(status);

  // procura usuário existente
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existente = list?.users.find(x => x.email === email);

  if (aprovado) {
    if (existente) {
      await admin.from('profiles').update({ ativa: true }).eq('id', existente.id);
      await admin.from('pontos_log').insert({ aluna_id: existente.id, motivo: 'renovacao', pontos: 50, ref: new Date().toISOString().slice(0, 7) }).then(() => {});
    } else {
      const senha = whatsapp.length >= 8 ? whatsapp : Math.random().toString(36).slice(2, 10);
      const { data: nu, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
      if (error) return new Response(error.message, { status: 500 });
      await admin.from('profiles').insert({ id: nu.user.id, nome, whatsapp, role: 'aluna' });
      // TODO fase 2: disparar WhatsApp automático com o acesso. Por ora, aparece no painel do Igor em "acesso".
    }
  } else if (cancelado && existente) {
    await admin.from('profiles').update({ ativa: false }).eq('id', existente.id);
  }
  return new Response('ok');
});
