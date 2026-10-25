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

## 2026-10-24 (rodada automática, 5 críticas: Júlia, Carla, Márcia, Renata, Bia · 50 pontos, ~47 únicos)
Pontos por aluna (resumo):
- Júlia (iniciante, iPhone 390): treino esquecido registrado virava 840 min e mudava de dia; começar programa com treino pausado apagava o treino (botão laranja = descartar); Início dizia "Treino de hoje: B" depois de treinar; nada dizia qual peso usar na 1ª vez; "Iniciar treino" escondido embaixo das abas; tocar no nome abria carga vazia em vez de "como fazer"; busca não entendia perna/bumbum/barriga/braço; pop-up "Treino em andamento" sem tradução; Pontos se contradizia sobre o print e não dizia quanto falta; "24 De Out." e gráfico de treinos parecendo data.
- Carla (Android lento, CPU 4x): começar outro treino com um pausado jogava fora as séries; pirâmide mostrava 22/25/28 mas salvava vazio; 1122 kg aceito e virava "Última" sem jeito de apagar; sem sinal o histórico dizia "sem registro"; toque duplo desfazia a série; bi-set obrigava a rolar a cada série; exercício trocado perdia sugestões e sumia de Minhas cargas; Minhas cargas sem progressão; drop set/faixa de reps registrados errado; corrigir pelo "Anterior" não atualizava a "Última" e Enter não pulava de campo.
- Márcia (zoom 130%): editar anamnese obrigava a passar pelas 16 perguntas; botões quebrando no meio ("DEPOI/S", "AGACHA-MENTO"); fonte grande do celular não mudava nada e textos de 11-13px; chave e campos < 44px; "Sair" sem perguntar colado no "Chamar o Igor"; pergunta de saúde sem avisar que é múltipla e "Nenhuma" escondida; "Esqueceu a senha?" minúsculo colado no "Assinar"; selo "🔥 10 SEMANAS" vazando e aba "Evol…"; "1exerc.", "10sem.", "basal"; aviso cobrindo o descanso e passando de tela.
- Renata (mãe, Personalizado): mesmo bug do treino esquecido (790 min, dia errado, sem "Continuar"); tempo contava com o app fechado/escondido; desafio/sequência/registro do mês em horário de Londres (treino às 22h caía no mês seguinte e gastava os +80 do mês seguinte); "Batido! +200 pts" sem os pontos entrarem; duas abas apagavam séries uma da outra; Igor conseguia "responder" em branco; no demo o feedback não chegava ao painel; 1ª foto aparecia como "Antes" e sumia ao recarregar no demo; descanso que acabou com a tela apagada não deixava sinal.
- Bia (rede ruim): 4G lento no fim gravava as séries 2x e dizia "sem internet"; salvamento atrasado da Evolução puxava ela do treino e quebrava a página; tira-dúvidas travava em "Carregando conversa…" e perdia a conversa sem sinal; app baixava ~470 KB a cada abertura (painel do Igor e demo junto); 1ª abertura no 3G com 55 s de logo parado; vídeo sem sinal abria tela cinza e tocava em loop gastando dados; prancha mostrava "descanso 20s" mas não descansava e gravava reps inventadas; PDF sem progresso e programas sem PDF; registro do mês sem sinal perdia as 3 fotos; programa extra de 1 min contava como treino inteiro.
Corrigido e no ar:
- [x] Treino esquecido: "Registrar o que fiz" guarda o dia em que ela parou; voltar pro treino não soma a noite nem o tempo parado no feedback; nova opção "Continuar o treino".
- [x] Começar outro treino com um pausado: "Registrar o X e começar este" (registra de verdade) / "Voltar pro X" / "Descartar" discreto; textos traduzidos; botão "Iniciar o Treino B" (ou "Recomeçar do zero" se for o mesmo).
- [x] App escondido ou fechado mais de 5 min não conta no tempo do treino (avisa "você ficou X min fora"); fechar o app no meio vira pausa a partir do último toque.
- [x] Fuso do celular em tudo que é dia/mês: desafio, sequência, gráfico, registro do mês (+80 no mês certo), ref do story, data máxima da anamnese, plano/desafio do mês no banco, "treinaram hoje" do painel.
- [x] Desafio batido mostra "Batido! 🎉" e só fala "+200 pts" quando os pontos entraram (migração 006 dá os pontos).
- [x] Duas abas no mesmo treino: a mais recente vale nas duas (nenhuma apaga série da outra); terminar/descartar numa fecha na outra.
- [x] Séries do treino substituem as que já estão no banco: reenvio da fila nunca duplica; 4G lento diz "internet lenta", não "sem internet".
- [x] ✓ sem digitar grava no campo o número sugerido (kg da pirâmide por série ou última carga, e as reps da meta): o que aparece é o que fica salvo; série de tempo não inventa reps.
- [x] Carga absurda (>400 kg ou 2,5× a última) pergunta "Confere a carga"; tocar no campo seleciona o número (12 não vira 1122); histórico com ✕ pra apagar um registro errado.
- [x] Toque duplo não desmarca; desmarcar avisa "Série N desmarcada"; rola sozinho até a próxima série (bi-set) e depois do descanso; Enter do teclado pula pro próximo campo; corrigir série já feita atualiza a "Última".
- [x] Exercício trocado busca as cargas por série da última vez; Minhas cargas inclui as trocas e exercícios fora do plano, agrupa por Treino A/B/C/D, mostra a última carga e ↑/↓; os sem registro ficam num "ver N exercícios"; histórico com mini-gráfico e as séries do dia (22 · 25 · 28 kg); sem sinal mostra a carga guardada no celular.
- [x] 1ª vez no exercício: "Escolhe um peso que dá pra fazer todas as reps com folga… Halter: anota o peso de um."
- [x] Prancha/tempo com descanso: descanso abre depois da série.
- [x] Início: "Treino de hoje feito ✓ · próximo é o B" depois de treinar; selo Personalizado também na Início; data "Sábado, 24 de out.".
- [x] Aba Treino: "Iniciar treino" fixo acima das abas; tocar no exercício abre a ficha (séries, explicação, dica, "Ver como fazer", cargas).
- [x] Vídeos: busca entende perna, coxa, bumbum, bunda, barriga, braço, ombro, peito, alongar; sem sinal avisa na lista e o vídeo mostra "precisa de sinal" + dica (sem tela cinza); economia de dados/3G: vídeo sem autoplay/loop.
- [x] Pontos: "Não precisa mandar comprovante dos treinos", quanto falta pro próximo prêmio e em cada um, até quando vale o trimestre, Strap explicado.
- [x] Card do fim: "3 exercícios", "10 semanas seguidas"; Perfil: "Você gasta uns X kcal por dia (parada, sem treinar: Y)"; texto da senha muda depois que ela já trocou.
- [x] Evolução: número de treinos em cima da barra e só o mês embaixo; com uma foto só ela aparece como "Sua 1ª foto" e o outro quadro "Daqui a 1 mês"; salvar com tempo limite e sem puxar ela de outra tela; sem sinal guarda fotos e medidas no celular (IndexedDB) e a fila envia (e dá os +80) quando voltar; página não quebra se saiu da conta.
- [x] Anamnese: editar pelo Perfil abre direto no "Tá tudo certo?" (toca só no que quer mudar, "falta responder" destacado, voltar do celular fecha); saúde avisa múltipla escolha, "Nenhuma" em primeiro e caixinhas ☐/☑; botões fixos no rodapé do pop-up.
- [x] Leitura/toque: tamanhos em rem (seguem a fonte grande do Android com meta text-scale e do iPhone com -apple-system-body), mínimos 13-14px (abas, pills, rótulos, cabeçalho das séries, fotos), chave 72×44, campos 44px, pills 44px, link do WhatsApp no chat 44px; palavras não quebram no meio; topo quebra linha em vez de vazar o selo; abas com fonte condensada e largura pelo texto ("Evolução" inteiro até 320px); notas 0-10 em 4 colunas em tela muito estreita.
- [x] Sair pergunta antes e fica separado do "Chamar o Igor"; login com "Esqueci minha senha" grande e "Assinar" em outra linha; e-mail vazio/incompleto avisa embaixo do campo (não manda link pra e-mail errado).
- [x] Avisos: somem ao trocar de tela e ao abrir o descanso; descanso que acabou com a tela apagada mostra na volta "Descanso acabou há N min" fixo até ela tocar; voltar do celular no treino diz "Toca em Continuar pra voltar".
- [x] Tira-dúvidas: conversa guardada no celular aparece na hora (sem sinal também), enviar funciona antes do banco responder, tempo limite de 25 s.
- [x] Dados: service worker cache-first de verdade (não baixa de novo a cada abertura; versão nova só quando o sw muda); painel do Igor, demo, fotos-guia e ícone grande fora da 1ª carga (painel carrega só pro Igor); "?demo" abre sem sinal.
- [x] 1ª abertura lenta: depois de 4 s o splash diz "Carregando… internet lenta. Só demora assim na 1ª vez."
- [x] PDF: "Gerando PDF… (na 1ª vez demora um pouco)"; programas extras com botão de PDF próprio; linha "Carga (kg): ___ ___ ___" pra anotar no impresso.
- [x] Painel: resposta vazia é barrada. Demo: feedback dela chega no painel e a resposta do Igor volta pra ela; foto do demo não some ao recarregar.
- [x] Traduções das ~75 frases novas nos 5 idiomas (teste de idiomas passa), cache v12, teste novo tests/rodada-2410.mjs.
Pendente:
- [ ] Rodar supabase/migracao-006-desafio-do-mes.sql (gatilho dá os +200 do desafio, mês no fuso de SP). Sem ela o app só mostra "Batido! 🎉".
- [ ] Programa extra de 1 min conta como treino inteiro (desafio, meta, +50): regra de pontos é decisão do Igor.
- [ ] Drop set ("10 + 4+4+4") com kg de cada queda: precisa de coluna nova no banco (ex.: series.quedas jsonb) — decisão/migração com o Igor.
- [ ] Capa do PDF preta (gasta tinta se imprimir): visual da marca é decisão do Igor (dá pra fazer uma versão "pra imprimir" clara).
- [ ] i18n.js inteiro (6 idiomas, ~35 KB com gzip) ainda vem junto: agora só baixa uma vez (cache-first); separar por idioma fica pra quando tiver aluna fora do português.
- [ ] SUSPEITA (não reproduzida): data de nascimento no calendário nativo abre no ano atual no iPhone/Android antigo.
- [ ] Bi-set: esconder dica/botões atrás de "mais" pra encurtar a tela (por ora a tela rola sozinha até a próxima série).
- [ ] Seguem pendentes de antes: migração 004 (se ainda não rodou), chave da IA, publicar função assistente, Kiwify, WhatsApp, fotos dos prêmios, vídeos.

## 2026-10-25 (rodada automática, 5 críticas: Júlia, Carla, Márcia, Renata, Bia · 50 pontos + menores, ~50 únicos)
Pontos por aluna (resumo):
- Júlia (iniciante, iPhone 390): último exercício (HIIT opcional) sem botão de terminar e a chave prometendo "o próximo"; "Boa, registrado! 7 de 8" fazendo tudo menos o opcional; "🔥 0 SEMANAS" pra aluna nova; Evolução ignorava o peso da anamnese; quadros de foto vazios pareciam botão e não faziam nada; "FORTALECI/MENTO" quebrado; "Ver como fazer" sem vídeo = beco sem saída; programa sem mostrar os exercícios antes; textos de carga confusos e instrução da aba Treino no rodapé; pontos com "pode trocar!" em dois prêmios + "faltam 560"; selo "1" das respostas não sumia; ✕ do cronômetro descartava sem avisar.
- Carla (Android 360, CPU 4x): toque duplo na chave pulava o exercício seguinte e marcava como feito; voltar do Android no pop-up "pela metade" travava todos os "Iniciar"; bi-set sumia quando o Igor republicava o treino; série de pirâmide abandonada virava a "Última" (parecia que a carga caiu); Minhas cargas só lia o celular (celular novo = vazio); ↑/↓ diferente entre Minhas cargas e histórico; "? Dúvida" no descanso matava o cronômetro; sugestão do tira-dúvidas estourando a tela; tri-set não existia; série 1 do A2 marcada sem kg ficava vazia; histórico sem as reps.
- Márcia (zoom 130%, 288 px): tira-dúvidas estourando e encolhendo a página; nascimento 2024 aceito e kcal calculadas; Minhas cargas "sem registro" com registro; media de 340 px encolhia o cabeçalho das séries; sono/estresse ambíguo; gravidez já vinha "Não"; painel do Igor estourando com zoom, "atenção/aviso" só por cor, "1 alunas"; barra do treino andava ao pular, "Pular" com dois sentidos, sugestão parecia digitada; gráfico de cargas sem números e "↑2" sem kg; título quebrado, placeholder da senha cortado, Strap/Elástico confusos.
- Renata (mãe, Personalizado): fotos do mês sumiam ao tocar "voltar" enquanto salvava (erro de página); cardio de 20 min apagado por um "voltar"; cardio com a tela apagada descontado do tempo; "? Dúvida" no descanso matava o descanso; avisos ("Treino pausado", "Respondido ✓", "guardado no celular") sumiam antes de aparecer; descanso acabado com a tela apagada aparecia como "agora" e apagava o "ficou X min fora"; nota 2 / esforço 10 sem texto não chegava ao Igor; dor no meio do treino sem caminho até o Igor; bônus da semana em horário de Londres; registro do mês tudo-ou-nada (fotos escolhidas sumiam).
- Bia (rede ruim, 360): cardio interrompido não registrava nada e o "30s forte / 30s leve" não tinha aviso; 1ª abertura baixava tudo 2× (~917 KB); story PNG de ~560 KB; PDF com "Carga (kg)" em exercício sem peso e "Como usar" falando de pirâmide na Mobilidade; página do PDF órfã sem título; story com "1 sem."; pop-up com nome do programa 4×; tira-dúvidas sem sinal perdia a pergunta; treino em casa pedindo peso; busca não entendia casa/sem aparelho/cardio.
Corrigido e no ar:
- [x] Cardio/exercício de tempo: voltar e ▾ só minimizam (barra no rodapé, toca pra abrir); "Já fiz" no meio registra os minutos feitos ("Registrei 12 min de 20 min"); HIIT "30s forte / 30s leve" alterna FORTE/LEVE com apito; tempo de cardio com a tela apagada conta no relógio do treino.
- [x] Chave "concluído" travada contra toque duplo (não pula nem marca o próximo).
- [x] Voltar do celular em qualquer pergunta (pela metade, nenhuma série, apagar, sair) cancela de verdade: nada trava, nada é descartado; botão "Iniciar o Treino D" volta com o texto certo.
- [x] Pop-up "pela metade" com nome curto ("Base 1") e botões curtos ("Registrar e começar este" / "Voltar pra ele" / "Descartar e começar este").
- [x] "? Dúvida" no meio do treino abre o tira-dúvidas sem pausar e sem matar o descanso (fica minimizado); na volta continua de onde estava. Da ficha (aba Treino) vai com o contexto certo e fecha a ficha.
- [x] Fotos do mês: arquivos lidos antes de salvar (voltar durante o "Salvando…" não perde nada, sem erro); fotos escolhidas ficam guardadas no celular até salvar (cancelou/fechou, estão lá); quadros vazios da Evolução abrem o registro; "+ 📷" nos manequins.
- [x] Avisos não somem mais ao trocar de tela (0,7 s de tolerância + ordem certa): "Treino pausado", "Respondido ✓", "guardado no celular", "Enviado!".
- [x] Descanso que acabou com a tela apagada: aviso fixo "acabou há N min" sem apito, junto do "você ficou X min fora".
- [x] Último exercício: botão "✓ Finalizar treino" e chave "É o último: marca que eu fecho o treino"; "Pular exercício" / "Pular descanso"; barra segue os exercícios feitos; feedback conta só os obrigatórios ("7 de 7 + opcional", "Mandou bem!").
- [x] Bi-set no editor do painel: coluna "bi N" (e "bi-set com o N" na dica) lida e escrita, não some ao republicar.
- [x] Tri-set: cadeia A1/A2/A3 num passo só, descanso só depois do último.
- [x] Cargas: "Última" = dia completo mais recente (dia que parou no meio aparece como "parcial (1 de 3)" e não vira referência); mesmo critério (série mais pesada) no treino, histórico e Minhas cargas; Minhas cargas vem do banco (celular novo não perde nada) com "+2 kg/−2 kg"; histórico com número em cima de cada barra, data embaixo, "kg×reps" de cada série; série marcada sem kg no bi-set recebe o kg digitado depois.
- [x] Nota ≤ 4 ou esforço ≥ 9 sem comentário chega no painel com selo "nota baixa"/"esforço no limite"; comentário com dor ganha selo "dor"; botão "⚠ Senti dor" no exercício já escreve "Senti dor no X." no recado do fim.
- [x] Anamnese: nascimento só entre 14 e 90 anos ("Confere o ano"), calendário já abre na faixa certa; kcal não calculadas com idade impossível; gravidez começa sem resposta; sono/estresse com texto em cada opção.
- [x] Leitura/zoom: tira-dúvidas sem estourar (sugestões quebram linha); cabeçalho das séries não encolhe mais em tela estreita; títulos de programa sem quebrar palavra (letra se ajusta); "Treino A · Bi-set" no topo; sugestão em itálico; placeholder "6 ou mais"; painel do Igor com botões de 44 px embaixo do nome, selos "7+ dias / 4-6 dias", plural certo.
- [x] Início sem "🔥 0 semanas"; Evolução usa o peso da anamnese como ponto de partida; Perfil com selo só de resposta nova e como responder ao Igor; aba Treino com a instrução no topo; textos de carga reescritos.
- [x] Ficha sem vídeo: "O vídeo desse ainda tá sendo gravado" + "Tirar dúvida da execução com a IA"; programa extra lista os exercícios (com ficha) antes de iniciar.
- [x] Pontos: "Você já pode escolher um prêmio", "Faltam N pts pra Luva", "dá pra trocar" em cada um, sem prometer regra de troca.
- [x] Treino em casa/programas: botão "Sem peso (peso do corpo)" por exercício (fica lembrado), sem a dica do halter; busca de vídeos entende casa, sem aparelho, peso do corpo, cardio, hiit.
- [x] Tira-dúvidas: pergunta vira rascunho guardado; sem sinal fica no campo e, se pediu cardio, mostra o HIIT do treino dela; erro devolve a pergunta pro campo.
- [x] Dados: 1ª instalação reaproveita o que a página baixou (não baixa 2×), capas dos programas fora do pacote inicial; story em JPEG (~90 KB em vez de ~560 KB) com "exercícios"/"semanas seguidas" por extenso e nome curto do programa.
- [x] PDF: mesma regra de "sem peso" do app (sem "Carga (kg)" em Dead bug, Mini band, Gato-camelo…); "Como usar" só com o que existe no treino; página nova repete "Treino D (continuação)".
- [x] Pendentes antigos resolvidos: bi-set com "Dica e opções ▾" (tela mais curta); calendário do nascimento abre na faixa de idade certa.
- [x] Traduções das ~60 frases novas nos 5 idiomas; cache v14; teste novo tests/rodada-2510.mjs; rodada-2410 ajustado aos textos novos.
Pendente:
- [ ] Rodar supabase/migracao-007-semana-no-fuso.sql (+100 da semana no fuso de SP; também acrescentada no fim do schema.sql). Sem ela, treino de domingo à noite pode não dar o bônus.
- [ ] Pontos zeram no fim do trimestre? Trocar um prêmio gasta os pontos? Regra do Igor (o app só diz "o Igor te explica").
- [ ] Registro do mês com só 1 ou 2 fotos (e os +80 só com as 3): regra de pontos do Igor; por ora as fotos escolhidas ficam guardadas até completar.
- [ ] Pergunta do tira-dúvidas feita sem sinal não sai sozinha quando o sinal volta (fica no campo pra ela tocar ➤): envio automático precisaria de fila no servidor.
- [ ] Dica do Igor repete a explicação da pirâmide em alguns exercícios ("Sobe a carga a cada série"): texto do treino é do Igor.
- [ ] Seguem pendentes de antes: migrações 004 e 006 (se ainda não rodaram), chave da IA, publicar função assistente, Kiwify, WhatsApp, fotos dos prêmios, vídeos, drop set por queda (coluna nova), capa do PDF clara, i18n por idioma, Treino em casa sem treinos (dado do Igor).
