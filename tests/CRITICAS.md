# Histórico das alunas críticas

## 2026-10-22 (rodada manual, 2 críticas: Júlia e Carla)
Corrigido e no ar:
- [x] Treino em andamento salvo no celular a cada toque; recarregar/fechar retoma de onde parou; "Pausar" em vez de "Sair sem salvar".
- [x] Voltar do celular navega entre telas (histórico com #hash); voltar fecha pop-up primeiro.
- [x] App real abre sem internet (biblioteca do Supabase empacotada em js/vendor e no cache); última carga guardada no celular.
- [x] "Exercício anterior" não duplica séries nem a contagem.
- [x] Bi-set conduzido na mesma tela (A1/A2, "✓ emenda", descanso só depois do A2).
- [x] Carga da última vez como sugestão (placeholder), kg digitado copia pras séries seguintes, só séries marcadas são salvas; reps da pirâmide por série; "reps/lado".
- [x] Exercício de tempo (min/s) com cronômetro próprio, sem campos de kg/reps.
- [x] Trocar exercício vale só na sessão, busca a carga da alternativa e dá pra voltar pro original.
- [x] Encerrar pede confirmação; sem exercício feito descarta e não dá ponto (gatilho do banco também exige exercicios_feitos > 0).
- [x] Feedback sem nota pré-marcada, botões maiores, "Voltar pro treino".
- [x] Cronômetro calculado pelo horário de término, +15s corrigido, "✎ anotar" minimiza pra barra no rodapé; tela fica acesa durante o treino (Wake Lock); toque numa série feita desfaz.
- [x] Sequência em semanas (não total de dias); aba Treino abre o treino do dia; card do story 9:16 e "+50" só quando conta.
- [x] Resposta do Igor aparece na Início; recado sem mídia não mostra play falso; pop-up de vídeo sem vídeo mostra "como fazer".
- [x] Datas sem voltar um dia no fuso, peso com vírgula, foto de evolução aceita galeria.
- [x] Troca de senha obrigatória no 1º acesso (coluna senha_trocada) e aluna não consegue alterar role/plano/ativa/pontos do próprio perfil.
Pendente:
- [ ] Link real da Kiwify e WhatsApp do Igor em js/config.js (Igor precisa passar).
- [ ] Fotos dos prêmios do trimestre; vídeos dos exercícios (Igor gravando).
- [x] Aviso no fim do descanso com app em segundo plano/tela apagada (service worker, Android; permissão pedida no 1º descanso). iPhone: só com Web Push do servidor (fase 2) — por ora a tela fica acesa no treino.

## 2026-10-22 (ideias do protótipo FITCONSULT do Gemini, pedidas pelo Igor)
- [x] Aba "Vídeos": biblioteca com busca de todos os exercícios (treino do mês + programas extras), marca "em gravação" quando ainda não tem vídeo.
- [x] Lista do treino mostra "Última: X kg × reps" de cada exercício (cache no celular + atualização do banco).

## 2026-10-23 (rodada automática, 5 críticas: Júlia, Carla, Márcia, Renata, Bia · 50 pontos, ~38 únicos)
Pontos por aluna (resumo):
- Júlia (iniciante, iPhone): chave "concluído" contava treino sem série; altura em cm → 124 mil kcal; "treino tá chegando" com treino pausado; "1 min cada lado" virava 1:00; anamnese pulava/enviava sozinha; 4G lento sem retorno; voltar após login caía na entrada; jargão (12/10/8, emenda, parciais); busca de vídeos fraca; pausar não pausava o relógio.
- Carla (Android lento): treino >12h apagado sem salvar; trocar exercício gravava séries com o nome novo; sugestão da pirâmide virava registro falso; dois descansos ao mesmo tempo; sem descanso após a última série; voltar/recarregar matava o descanso; voltar no feedback apagava o texto; "Iniciar" duplicava sessões no 4G; "treino tá chegando" com treino pausado; histórico de carga escondido.
- Márcia (zoom 130%): voltar na anamnese perdia tudo; peso "72,5 kg" salvo vazio; múltipla escolha aparecia desmarcada; altura em cm; opções cortadas; letras 11-13px; toques < 44px; dica/borda dos campos sem contraste; senha (sem mostrar, sem confirmar, erro em inglês, WhatsApp com máscara aceito); avisos sumindo rápido e cobrindo o título.
- Renata (mãe, Personalizado): descanso fantasma fechava o próximo; pausar não pausava; treino pausado apagado em 12h; "voltar pro treino" no feedback não voltava; feedback podia sumir do painel do Igor; barra do descanso cobria as abas e apitava pausada; "treino tá chegando"; aba Treino abria o B e não o pausado; "+80 pts" mentia e fotos lado/costas não apareciam; Personalizado invisível.
- Bia (rede ruim): fila offline enviava 2x; sem sinal zerava sequência/metas; treino offline com a data do envio; app parado sem aviso no 4G; programa extra bagunçava o "Treino de hoje"; PDF não funcionava sem sinal; @ cortado no story; story offline com mensagem falsa; programas prometiam mais treinos; "cada lado"/kg em exercício sem carga.
Corrigido e no ar:
- [x] Pausar para o relógio (pausa não conta no tempo nem no card); sair da tela do treino encerra o descanso (não cobre abas nem apita).
- [x] Treino esquecido >12h não é apagado: pergunta "Registrar o que fiz / Descartar".
- [x] Feedback do fim virou tela com rota: voltar (botão e do celular) volta pro último exercício; esforço/nota/texto ficam salvos.
- [x] Um descanso só por vez, em camada própria (pop-up não mata); voltar do celular minimiza; recarregar restaura; descanso também depois da última série do exercício.
- [x] Chave "concluído" sem série marcada pergunta (marcar séries / pular sem contar); exercício só conta com série feita; HIIT opcional não conta como faltando; encerrar com séries feitas registra.
- [x] Séries gravadas com o nome do exercício realmente feito (troca no meio); pirâmide não copia kg nem salva a sugestão como carga.
- [x] Início: sem "treino tá chegando" com treino pausado; card mostra séries feitas e "pausado há X"; aba Treino abre o pausado; card "falta sua anamnese".
- [x] Anamnese: boas-vindas, rascunho salvo a cada resposta, voltar do celular = pergunta anterior, sem pular sozinha, tela "confere e envia", múltipla escolha marcada, opções em lista legível, altura em cm vira metro, faixas de peso/altura; gasto calórico só com dados válidos.
- [x] Evolução: "72,5 kg" aceito, erro escrito no pop-up, valores com vírgula e sinal; fotos por ângulo (frente/lado/costas) antes x agora; "+80" só quando conta; "Minhas cargas" com histórico por exercício (também tocando no exercício na lista do treino).
- [x] Resposta do Igor aparece na Início até ela ver (conta pela data da resposta); painel lista só feedbacks com comentário, sem resposta primeiro e sem limite de 15; selo "Personalizado" discreto no Perfil, no treino e no painel.
- [x] Offline: fila sem duplicar (trava + item sai ao subir + reaproveita a sessão criada), treino guarda a hora em que terminou, sequência/metas/evolução usam o que está no celular e somam os pendentes; pontos do story ficam na fila.
- [x] 4G ruim: treino abre na hora (banco em segundo plano, botão "Abrindo…", sem duplicar); Início/abas usam o cache se o banco demorar 5s; aba acende no toque.
- [x] "Treino de hoje" ignora programas extras; programas mostram o nº real de treinos ou "em breve".
- [x] PDF: gerador vem junto do app (sem CDN) e fica no cache após o 1º uso; fontes também guardadas no cache.
- [x] Story: título cortado com "…" e @ em linha própria; avisa onde a imagem ficou quando não dá pra compartilhar.
- [x] Tempo "cada lado" conta 2× com apito na metade ("Troca de lado"); coluna de kg some em exercício sem carga.
- [x] Jargão explicado embaixo das reps (pirâmide, drop, parciais, faixa); "✓ → A2"; um contador só; só a próxima série laranja; "DICA DO IGOR".
- [x] Voltar do celular logada não cai na tela de entrada; sem entradas repetidas no histórico; pop-up fecha sem bagunçar o endereço.
- [x] Vídeos: busca por treino/grupo (glúteo, costas) e inclui as alternativas.
- [x] Leitura: textos mínimos 13-14px, toques ≥ 44px (voltar, editar, trocar, histórico, chave, play), contraste de dica/borda dos campos, títulos quebram sem estourar; avisos embaixo, maiores, 4,5s e fecham com toque; chave/bolinhas laranja (fora do verde).
- [x] Senha: mostrar/ocultar, repetir, Enter envia, mesmas regras no 1º acesso/Perfil/esqueci, WhatsApp com máscara barrado, erros em português.
- [x] Demo: "Bora, Igor?" depois de trocar de login.
- [x] Pirâmide: sugestão de carga de cada série vem da mesma série do último treino.
Pendente:
- [ ] Rodar supabase/migracao-004-plano-no-painel.sql (selo Personalizado na lista de alunas do painel). Sem ela o resto funciona, só a lista não mostra o selo.
- [ ] Meta do desafio do mês fixa em 16 pra quem treina 3x/semana: regra do desafio é decisão do Igor.
- [ ] Nomes quase repetidos na biblioteca ("Abdominal infra" x "Abdominal Infra Solo") e programas extras com poucos treinos: dados do Igor.
- [ ] iPhone com iOS < 18.4 instalado na tela inicial pode apagar a tela no descanso (limite do iPhone; aviso com tela apagada só com Web Push, fase 2).
- [ ] Link da Kiwify, WhatsApp do Igor, fotos dos prêmios, vídeos (seguem pendentes, dependem do Igor).

## 2026-10-23 (pedido do Igor: IA tira-dúvidas)
- [x] Tira-dúvidas 24h: card na Início, botão "? Dúvida" em cada exercício do treino (já abre com o nome do exercício), conversa salva, limite diário, painel do Igor com "Dúvidas na IA".
- [x] Função do servidor `assistente` (supabase/functions/assistente): prompt do Igor (docs/assistente-prompt.md) + dados só da aluna logada (perfil, treino do mês, últimos treinos, cargas, evolução). Tabela assistente_msgs (migração 005, já rodada).
- [x] Segurança: v_alunas_status agora com security_invoker (aluna não vê lista das outras; anônimo bloqueado). Migração 004 rodada.
- [ ] Igor precisa criar a chave da API da Anthropic e colar em Supabase › Edge Functions › Secrets como ANTHROPIC_API_KEY (sem ela a IA responde "ainda tá sendo ligado").

## 2026-10-23 (idiomas)
Feito:
- [x] App da aluna em 6 idiomas: português (padrão), inglês, espanhol, chinês simplificado, hindi e francês (js/i18n.js). Idioma: o que ela escolheu no app (localStorage 'idioma') → idioma do celular → português. `<html lang>` acompanha.
- [x] `t('texto em português', {vars})` com a chave = o próprio português (código continua legível), plural por idioma (`tp`), datas/números com Intl no locale (en-AU/en-IE/es-MX respeitam a região do celular), decimal com vírgula ou ponto conforme a língua.
- [x] Traduzido: entrada, login, 1º acesso/senha, Início, Treino, sessão (bi-set → superset/biserie, descanso, cronômetro, avisos de fim do descanso), confirmação de encerrar, feedback, card do app e do story (imagem), Pontos, Evolução (registro do mês), Perfil, Vídeos, Tira-dúvidas (sugestões, saudação, erros), anamnese inteira (perguntas e opções; o valor salvo no banco continua em português), toasts e erros, PDF.
- [x] Seletor com bandeira + nome nativo no Perfil (card "Idioma") e botão pequeno no canto da entrada/login; trocar re-desenha a tela atual na hora.
- [x] Fontes: pilha com Noto Sans / PingFang SC / Microsoft YaHei / Noto Sans Devanagari / system-ui (nada baixado); entrelinha maior em hindi e chinês; abas com reticências se precisar; botões quebram linha em vez de estourar.
- [x] IA: o app manda `idioma` pra função `assistente`; fora do português ela acrescenta no system "responda sempre em <língua>". Erros da função (IA desligada, limite, pausada) traduzidos no app pelo código do erro.
- [x] Teste novo tests/idiomas.mjs: percorre as telas nos 6 idiomas em 360px, falha com erro de página/console, texto sem tradução, frase da interface em português sobrando ou algo estourando a largura. Testes antigos rodam com locale pt-BR fixo.
Ficou de fora / pendente:
- [ ] Publicar a função `assistente` (supabase/functions/assistente/index.ts) pra IA responder no idioma da aluna. Sem publicar, o app funciona; a IA só continua respondendo em português.
- [ ] Conteúdo do Igor continua em português: nomes de exercício, dicas, reps escritas ("1 min cada lado"), recados, nomes dos treinos/programas, desafio do mês e respostas do Igor. A busca de vídeos procura pelos nomes em português.
- [ ] PDF em chinês e hindi sai em inglês (a fonte do PDF só tem alfabeto latino; embutir fonte custaria vários MB).
- [ ] Peso em kg e medidas em cm em todos os idiomas (alunas dos EUA podem querer lb/in).
- [ ] Painel do Igor (admin.js) e notificação push do servidor continuam só em português.
- [ ] Revisão das traduções por falante nativo (principalmente hindi e chinês) quando tiver aluna nessas línguas.
