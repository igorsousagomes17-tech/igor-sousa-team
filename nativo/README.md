# App das lojas (Capacitor)

Casca nativa do Igor Sousa Team pra Google Play e App Store. Ela abre o mesmo app do GitHub Pages
(`server.url` no `capacitor.config.json`), então **quase toda atualização cai sozinha** no app das lojas,
igual no app web. Só precisa de versão nova na loja quando mudar algo da casca (ícone, nome, permissões, plugins).

- ID do app: `br.com.igorsousa.team`
- Sem internet: mostra `www/offline.html` com botão "Tentar de novo".
- No app das lojas (`window.Capacitor` presente), o `js/app.js` esconde link de compra/Kiwify (regra 3.1.1 da Apple
  e pagamentos do Google) e o card de lembretes do navegador.

## Android (Google Play)

Precisa de JDK 21 e Android SDK (platform 36).

```
cd nativo && npm i && npx cap sync android
cd android && ./gradlew bundleRelease     # gera app/build/outputs/bundle/release/app-release.aab
```

Assinatura: `android/keystore.properties` (fora do repositório) aponta pra chave de upload `igor-sousa-team-upload.jks`.
A chave e a senha ficam guardadas com o Igor (Google Drive, pasta "backup IA"), **nunca** no GitHub.
No Play Console usar "Assinatura de apps do Google Play" (padrão): se a chave de upload sumir, o Google troca.

A cada versão nova na loja: aumentar `versionCode` (e `versionName`) em `android/app/build.gradle`.

## iPhone (App Store)

Só no Mac, com Xcode e a conta Apple Developer:

```
cd nativo && npm i && npx cap sync ios && npx cap open ios
```

No Xcode: Signing & Capabilities → Team (conta do Igor) → Product → Archive → Distribute App → App Store Connect.

## Antes de enviar pra revisão

- Conta de teste dos revisores: `revisao@igorsousa.com.br` (ver `supabase/conta-revisor.sql`; senha fora do repositório).
- "Excluir minha conta" no Perfil precisa estar no ar (função `excluir-conta` publicada no Supabase).
- Publicar só no Brasil (status de comerciante: o endereço aparece pra quem baixa na União Europeia).
