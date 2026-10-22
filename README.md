# Igor Sousa Team — app da consultoria (v1)

Web app instalável (PWA) pra alunas da consultoria do Igor Sousa. Código estático (HTML/CSS/JS), banco e login no Supabase, hospedagem no GitHub Pages. Custo zero no teste.

## O que tem na v1
- Aluna: login, anamnese no 1º acesso, início (treino do dia, streak, recado do Igor, desafio do mês, meta da semana), treino mensal A/B/C/D com vídeo em pop-up, sessão guiada (séries com carga anterior, timer de descanso em tela cheia com apito, chavinha "concluído" que puxa o próximo, trocar aparelho), feedback (esforço 0-10, nota, texto), card "treino feito" pra story, pontos, evolução (foto + peso + cintura), programas extras, perfil.
- Igor (painel): ativas / treinaram hoje, quem precisa de atenção com botão WhatsApp já com a mensagem pronta, feedbacks pra responder, cadastro de aluna (uma ou em lote), editor de treino mensal em texto, pausar/reativar acesso, recado da semana.
- Offline: o treino abre sem sinal; se finalizar sem internet, envia quando voltar.
- Demo: `index.html?demo` ou `DEMO: true` no config roda com dados fictícios.

## Como colocar no ar (uma vez, ~20 min)

### 1. Supabase (banco + login + fotos)
1. Crie uma conta em supabase.com e um projeto (região São Paulo). Guarde a **URL** e a **anon key** (Settings → API).
2. SQL Editor → cole o conteúdo de `supabase/schema.sql` → Run.
3. Storage → New bucket → nome `evolucao`, privado. Depois no SQL Editor rode as duas linhas comentadas no fim da seção STORAGE do schema.
4. Authentication → Users → Add user: e-mail do Igor + senha. Depois no SQL Editor:
   `update profiles set role='admin' where id=(select id from auth.users where email='SEU-EMAIL');`
   (se o perfil não existir ainda: `insert into profiles(id,nome,role) values ((select id from auth.users where email='SEU-EMAIL'),'Igor Sousa','admin');`)
5. Authentication → Settings: desligue "Confirm email" (as alunas entram direto com a senha inicial).
6. Edge Functions (precisa do Supabase CLI no computador, ou a Claudete faz):
   `supabase functions deploy criar-aluna`
   `supabase functions deploy kiwify-webhook --no-verify-jwt`
   Em Edge Functions → Secrets, adicione `KIWIFY_TOKEN` (um texto secreto qualquer).

### 2. Config do app
Edite `js/config.js`: URL, anon key, link do checkout da Kiwify, WhatsApp do Igor.

### 3. GitHub Pages (hospedagem)
1. Crie um repositório `igor-sousa-team` no GitHub e suba esta pasta.
2. Settings → Pages → Source: branch `main`, pasta `/ (root)`. Em 1 min o app está em `https://SEU-USUARIO.github.io/igor-sousa-team/`.
3. (Opcional) domínio próprio: Settings → Pages → Custom domain.

### 4. Kiwify (pagamento → acesso automático)
Kiwify → Apps → Webhooks → URL: `https://SEU-PROJETO.supabase.co/functions/v1/kiwify-webhook?token=KIWIFY_TOKEN`, eventos: compra aprovada, assinatura renovada, cancelada, atrasada, reembolso.
Pagou → conta criada (senha = WhatsApp do checkout). Cancelou/atrasou → acesso pausado. Renovou → reativa.

## Fluxo de acesso da aluna
- Migração: Igor cadastra no painel (uma ou em lote colando "nome; e-mail; whatsapp; nascimento; F/M"). Login = e-mail, senha inicial = número do WhatsApp. No painel, botão "acesso" abre o WhatsApp com a mensagem de boas-vindas e o link.
- Ela troca a senha no Perfil quando quiser. Esqueceu: "Esqueceu a senha?" manda link por e-mail.

## Formato do treino mensal (editor do painel)
```
# A | Inferior · glúteo e quadríceps | 40
Agachamento no Smith | 4 | 10 | 60 | https://youtu.be/XXXX | pé na largura do quadril | Agachamento livre
Elevação pélvica | 4 | 12 | 60
```
Linha `#`: letra | nome | minutos. Linhas seguintes: exercício | séries | reps | descanso s | vídeo | dica | alternativa (os 3 últimos opcionais).

## Próximas fases
- Fase 2: notificações push de inatividade, relatório semanal/mensal automático, check-in com foto no feed, alimentação por foto (Prato Certo), feed social.
- Fase 3: ranking, loja de prêmios, publicação nas lojas (Play Store / App Store via TWA/Capacitor).

## Estrutura
```
index.html  manifest.webmanifest  sw.js
css/app.css
js/config.js  js/app.js  js/ui.js  js/db.js  js/db-mock.js  js/admin.js
icons/
supabase/schema.sql  supabase/functions/criar-aluna  supabase/functions/kiwify-webhook
```
