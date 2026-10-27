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
- [x] Traduções das ~60 frases novas nos 5 idiomas; cache v15; teste novo tests/rodada-2510.mjs; rodada-2410 ajustado aos textos novos.
Pendente:
- [ ] Rodar supabase/migracao-007-semana-no-fuso.sql (+100 da semana no fuso de SP; também acrescentada no fim do schema.sql). Sem ela, treino de domingo à noite pode não dar o bônus.
- [ ] Pontos zeram no fim do trimestre? Trocar um prêmio gasta os pontos? Regra do Igor (o app só diz "o Igor te explica").
- [ ] Registro do mês com só 1 ou 2 fotos (e os +80 só com as 3): regra de pontos do Igor; por ora as fotos escolhidas ficam guardadas até completar.
- [ ] Pergunta do tira-dúvidas feita sem sinal não sai sozinha quando o sinal volta (fica no campo pra ela tocar ➤): envio automático precisaria de fila no servidor.
- [ ] Dica do Igor repete a explicação da pirâmide em alguns exercícios ("Sobe a carga a cada série"): texto do treino é do Igor.
- [ ] Seguem pendentes de antes: migrações 004 e 006 (se ainda não rodaram), chave da IA, publicar função assistente, Kiwify, WhatsApp, fotos dos prêmios, vídeos, drop set por queda (coluna nova), capa do PDF clara, i18n por idioma, Treino em casa sem treinos (dado do Igor).

## 2026-10-25 (rodada extra pedida pelo Igor: IA tira-dúvidas ligada, cardio de 20 min, 6 idiomas · 5 críticas, 50 pontos, ~40 únicos)
Pontos por aluna (resumo):
- Júlia (iPhone 390, pt): respostas do demo: "dor no peito e falta de ar" recebia "segue com carga menor"; "dormi"/"adorei" viravam dor; medo/iniciante e "perder peso" recebiam "sobe pra 30 kg"; botão de cardio só preenchia o campo e vinha "Boa pergunta!"; chips genéricos apagavam a pergunta do "? Dúvida"; sem como voltar pro treino e aba Início pausava; limite de perguntas apagava o texto e gravava a recusa como resposta; 4 dos 7 chips sem resposta; prompt do servidor (nome, masculino, tom, emergência sem 192, app desatualizado, promete encaminhar, última carga diferente do app); recarregar tirava do chat e logout deixava a conversa no celular.
- Carla (Android 360, CPU 4x, espanhol): recarregar no meio do HIIT apagava o cardio; 1 série contava como "exercício feito"; botão laranja do pop-up registrava treino quase vazio; Minhas cargas usava o dia parcial; sequência sumia toda segunda; apito igual pro forte e pro leve, sem segundos do intervalo; "Já fiz" no HIIT final fechava o treino e o aviso cobria o Enviar; cardio do fim sem cronômetro; IA demo não entendia "dolió/duele"; "DESAFIO DO MÊS" em português, "atención: atenção", datas/sinais misturados, histórico quebrando "× / 10".
- Márcia (zoom 130%, pt e fr): escolha do treino da semana estourava a tela e não confirmava; tocar de novo no ▶ zerava o cardio; "Finalizar" com cardio rodando jogava fora os minutos; "FORTE/LEVE" pequeno e cinza, sumia minimizado, "+15s" em destaque; não ficava claro que o chat é uma IA; botão de cardio não entregava; francês com "?" e "min" sozinhos na linha; fonte grande + francês cortando abas e prêmios; chat: Enter sem aviso durante a espera, campo curto, ➤ sem texto; "Senti dor no/na", desmarcar sem aviso, dor escondida no fim.
- Renata (mãe, inglês): respostas perigosas do demo; dor anotada se perdia ao descartar treino sem série; dor em inglês sem selo no painel; sair antes da resposta sumia com a pergunta; IA lenta > 25 s duplicava a conversa; aba Treino a partir do chat pausava sem avisar; botão de cardio sem cronômetro; "Senti dor" escondido no bi-set; riscos no prompt (HIIT com dor/pós-parto, contexto da tela nas instruções, inventar regra de pontos, plano básico); sem limpar conversa; dor contada à IA sem selo pro Igor.
- Bia (rede ruim, zh/hi): erro do servidor virava "resposta" e apagava a pergunta; sair durante a espera estragava o rascunho; atalhos apagavam o rascunho; cardio sem sinal não aparecia em zh/hi; cardio sem sinal empilhava bolhas e não tinha como começar; 24 s olhando os pontinhos com o sinal caído; falhas sujando a conversa; sessão vencida dita como "internet"; chat baixando a conversa inteira a cada abertura; PDF em inglês sem aviso; "ABDÔMEN 1做了一半", "10 周连续".
Corrigido e no ar:
- [x] Tira-dúvidas refeito: a pergunta fica guardada no celular na hora do envio (saiu e voltou, está lá com os "…"); a resposta que chega depois aparece na tela atual; erro do servidor não vira resposta nem fica na conversa (aviso + "↻ Tentar de novo"); sinal que cai interrompe na hora; depois de 8 s "Internet lenta…"; sem duplicar por demora; sessão vencida diz "entra de novo"; limite do dia trava a barra com aviso e não apaga o texto; Enter durante a espera avisa "espera a resposta"; rascunho só sai se foi ele que foi enviado (sugestão/atalho não apaga); campo cresce até 40% da tela; botão "Enviar ➤" com texto; conversa nova abre do topo; saudação "sou a IA do time (um robô, não sou o Igor)" e selo "🤖 IA" em cada resposta; conversa baixada do banco no máximo a cada 5 min; recarregar volta pro chat; sair da conta apaga conversa/rascunho/cargas do celular.
- [x] "? Dúvida" do treino: sem as abas (não pausa sem querer), "‹ Voltar pro treino" fixo no topo, sem chips genéricos por cima da pergunta, sem oferecer outro cardio no meio do treino.
- [x] Cardio de 20 min: o botão do fim do treino já envia; a resposta traz "▶ Começar cardio de 20 min" que abre o cronômetro do app (30s forte / 30s leve, minimizar, tela apagada, "Já fiz" registra os minutos); sem sinal oferece o mesmo botão (pt, en, es, fr, zh, hi); o botão some se ela já fez o HIIT ou o cardio.
- [x] Cronômetro de cardio: recarregar/fechar no meio continua de onde estava (minimizado); tocar de novo no ⏱ só abre; "Finalizar", "Pausar" ou sair com ele rodando registram os minutos feitos; "Já fiz" nos 10 primeiros segundos conta inteiro, no meio registra mm:ss; no último exercício fica na tela (não fecha o treino sozinho); fase "FORTE! · 12s / LEVE · 29s" grande, anel muda de tom, barra minimizada mostra a fase; apito diferente (forte: 3 agudos; leve: 1 grave longo); "✓ Já fiz" em destaque e "+15s" discreto; um só AudioContext.
- [x] Respostas do demo: emergência primeiro ("Para o treino agora… 192"), dor por palavra inteira em 6 idiomas (dolió/duele/pain/douleur/疼/दर्द), medo/iniciante, alimentação → nutricionista, cardio, búlgaro, musculação ou cardio primeiro, resultado; carga só com "subir/aumentar"; genérica sem jargão.
- [x] Prompt do servidor (SOBRE_O_APP + regras do app): fala com ela no feminino, é a IA do time e não o Igor, tom do Igor em português, emergência = "Para o treino agora" + 192, sem HIIT com dor/lesão/gestação/pós-parto, não inventa regra de pontos, não promete pesquisar/encaminhar, botões atuais do app (ficha, ✓/⏱, Senti dor, Chamar o Igor, Já fiz, Sem peso), plano "Mensal" (o básico não parece inferior), contexto da tela vai junto da pergunta (não nas instruções), última carga = a série mais pesada do último treino (igual ao app), resposta gravada 1 ms depois da pergunta, mesma pergunta em até 2 min não gasta outra.
- [x] Senti dor: "Anotei: dor em X" + orientação; "Dor desmarcada"; no bi-set "Dúvida" e "Senti dor" ficam fora do "Dica e opções"; encerrar sem série oferece "Avisar o Igor da dor e encerrar"; feedback mostra "⚠ Você anotou dor em X" no topo e o recado vai com "⚠ dor: X" em português; painel marca "dor" em 6 idiomas e também nas perguntas da IA.
- [x] Progresso honesto: "N de M exercícios feitos", barra, card e botão Continuar contam só exercícios completos; pop-up "pela metade" com menos de 30% feito deixa "Voltar pra ele" em destaque e mostra "Registrar (1 de 20 séries)".
- [x] Dia parcial não passa por cima da última carga no celular; sequência de semanas conta a partir da semana passada enquanto a atual não tem treino.
- [x] Semana flexível: cabe em 288 px, confirma "Semana começa pelo Treino C ✓" e tem "trocar".
- [x] Idiomas: francês com espaço que não quebra antes de ? ! : ; e número grudado na unidade (40 min, 30 s, 25 kg) em todos; "Desafio do mês" traduzido; "atención: atenção" sem repetir; zh "ABDÔMEN 1 做了一半" e "10 周连续训练"; PDF em zh/hi avisa "(English)".
- [x] Leitura: abas com ícone grande e só o nome da aba atual abaixo de 300 px; prêmios sem cortar com fonte grande; sinal "−" igual em todo lugar; datas "6 de out."; histórico sem quebrar "28 kg × 10"; aviso do feedback no topo (não cobre o Enviar); "Treino pausado. Tá tudo salvo: é só tocar em Continuar."
- [x] Traduções das frases novas nos 5 idiomas; teste novo tests/rodada-2510b.mjs; cache v16 (datas no chat também).
Pendente:
- [ ] Publicar a função `assistente` de novo (supabase/functions/assistente/index.ts mudou: regras do app, emergência/192, última carga, anti-duplicação). Sem publicar, o app funciona, só a IA continua com o prompt antigo.
- [ ] Identidade escrita pelo Igor no prompt ("Assistente Virtual da Consultoria iSousa", texto no masculino "aluno"): é texto do Igor; as regras do app já pedem feminino e "IA do time", mas o nome da consultoria é decisão dele.
- [ ] Apito forte/leve com a tela apagada no Android: o celular congela o app; só o aviso do fim do cardio chega (precisaria de Web Push, fase 2).
- [ ] Botão "limpar conversa": apagar do banco também tira as perguntas do painel "Dúvidas na IA" do Igor — decisão dele (as datas nas mensagens já entraram).
- [ ] Cardio de 20 min avulso conta como treino (+50, desafio, semana), igual aos programas extras: regra de pontos do Igor.
- [ ] Seguem: migração 007 (e 004/006 se ainda não rodaram), Kiwify, WhatsApp, vídeos, fotos dos prêmios, drop set, regra de troca dos pontos.

## 2026-10-26 (rodada automática, 5 críticas: Júlia, Carla, Márcia, Renata, Bia · 50 pontos, ~46 únicos)
**Júlia (23, iniciante, iPhone):** pular tudo e "Já fiz" no HIIT fechava o treino e gravava 20 min não feitos; card "1 exercício" com 1 série de aquecimento; "Faltam 6" com "0 de 8" atrás; vídeo em gravação sem botão de saída; +15s laranja no descanso; "Ver execução" escondido no bi-set; cronômetro de lado sem "lado 1/2" nem pausa; jargão na lista; "Halter" em máquina; Início mandando treinar com a semana fechada.
**Carla (34, Android lento):** chave com 1 série marcada jogava fora as outras; "40kg"/"12+4+4" sumiam (NaN no histórico); aparelho ocupado sem ir direto e "concluir" caindo no já feito; toque duplo atravessando o descanso; celular no bolso no descanso descontava tempo; séries atrasadas abrindo descanso; 2× voltar perdia o descanso; sem diário nem +/− série; "1ª vez" depois de marcar, sem recorde, voltar repetindo tela.
**Márcia (52, fonte grande):** três contagens diferentes; anamnese de saúde que ninguém via; aviso cobrindo o "Fechar"; 1º acesso sem saída; senha com máscara; +15s laranja; contraste de bordas/sugestões; título de programa que não crescia; ▶ prometendo vídeo; "2×1:00", "kg×reps", datas misturadas, erro de data vago, sugestões apagadas, fresta da barra do chat.
**Renata (29, mãe, Personalizado):** cronômetro acabando escondido contava o tempo fora e fechava o treino; "Boa, registrado!" antes de enviar; foto HEIC travava em "Salvando…"; treino parado no 1º exercício virava "feito" e pulava o B; Igor respondia sem ver o comentário, sem ver que foi parcial e sem poder editar; pontos sem limite no banco; treino de domingo terminado na segunda; demo apagando fotos e dando +80 duas vezes; "pausado há pouco" parado.
**Bia (19, celular velho, sinal ruim):** boot pendurado com 4G travado; fonte do Google travando a abertura; fila offline subindo na conta de outra pessoa; "Sair" sem sinal virando "Conta sem perfil"; fila parada mesmo online; item ruim travando a fila; PDF quebrado depois de 1 toque sem sinal (erro em inglês); story que não fazia nada quando o compartilhar falhava; Pontos/Perfil 10 s; página do PDF só com o HIIT.

### Corrigido
- [x] Fila com dono (aluna_id do celular): não sobe na conta de outra; Sair avisa o que não subiu; treino pausado guardado pra dona (`sessao@id`).
- [x] Sair sem sinal limpa a sessão do celular (signOut local); sem perfil e sem rede: "Sem internet pra carregar sua conta" + tentar de novo.
- [x] Abertura com 4G travado: com perfil guardado abre em até 4 s; splash não diz mais "só na 1ª vez" pra quem já usa; fonte do Google não bloqueia mais a página.
- [x] Fila tenta na hora (com sinal), a cada 45 s e ao voltar pro app; erro do banco (id antigo do treino) reenvia sem os ids e segue pros próximos.
- [x] Último exercício nunca fecha sozinho: se faltou algo, pop-up "Faltam N"; com o app escondido fica na tela. "Já fiz" nos primeiros 10 s pergunta "Já tinha feito?".
- [x] Mesma conta em todo lugar: "X de 7 exercícios feitos + opcional", "Faltam N (M pela metade)", card com exercícios completos ("Treino registrado · N séries" se nenhum completo).
- [x] Chave com séries pela metade pergunta "Fiz todas, marcar / Só as que marquei"; chave já ligada avança (não desliga); concluir vai pro próximo que falta (pulado: avisa).
- [x] Lista 1 2 3… no topo do treino pra ir direto (aparelho ocupado); "+ série / − série".
- [x] kg com letra vira número na hora; reps "12+4+4" salvas como 20.
- [x] Cronômetro de exercício que acaba com o app escondido: tempo fora descontado e aviso "acabou há N min"; celular no bolso no descanso conta até o fim do descanso + 3 min.
- [x] Pausar/voltar 2× não perde o descanso (volta minimizado no Continuar).
- [x] Feedback: "Boa! Falta só enviar"; Início mostra "Falta enviar · Enviar agora"; depois de 2 h registra sozinho com o que ela marcou.
- [x] Foto que não abre (HEIC): avisa na hora, não guarda no rascunho, nunca trava em "Salvando…".
- [x] Treino parado com menos da metade: não vira "Treino de hoje feito"; Início oferece repetir ou "seguir pro próximo".
- [x] Treino pausado de um dia e terminado no outro conta no dia da maioria das séries (card com a data certa).
- [x] Descanso: "Pular descanso" em destaque, +15s discreto; toque duplo ignorado ao abrir/fechar; marcar séries atrasadas logo após pular não abre outro descanso.
- [x] Cronômetro de lado: "Lado 1 de 2 / Lado 2 de 2", botão "▶ 1 min cada lado"; pausar no cronômetro de exercício.
- [x] Sessão: Ver execução, Dúvida e Dor sempre à vista; dica e trocas em "Dica e opções" (séries sobem na tela); "1ª vez" some depois de marcar; halter x máquina; dica do ⏱ só no começo.
- [x] Lista do treino explica pirâmide/drop/bi-set; sem vídeo = botão "i" que abre a ficha (com IA); vídeo em gravação tem "Tirar dúvida com a IA" e "Chamar o Igor no WhatsApp"; links de WhatsApp na busca e nos prêmios.
- [x] Recorde comemorado no card; cardio de 20 min não é oferecido quando nada foi completado; Início com semana fechada diz "só se quiser treinar a mais".
- [x] Aviso (toast) sobe pro topo com pop-up aberto; "exercício ✓" some em 2,5 s.
- [x] 1º acesso: "Não é você? Sair", WhatsApp do Igor, "a mesma de cima"; login com senha "(62) 99999-0000" tenta só os números; dica da senha inicial embaixo do campo.
- [x] Contraste: bordas dos campos/opções e sugestão em itálico acima de 3:1/4,5:1; sugestões do tira-dúvidas com contorno; títulos de programa em rem; barra do chat colada nas abas medidas.
- [x] Histórico "22 kg, 12 vezes"; datas iguais no gráfico e na lista; erro da data de nascimento diz o que fazer.
- [x] Anamnese com pressão/coração/diabetes/cirurgia/gravidez: orientação na hora (liberação médica antes de HIIT); painel com selo "⚠ saúde" e botão "ficha" com as respostas; IA do demo responde isso antes da regra do cardio.
- [x] Painel: Responder mostra aluna, treino, nota e comentário; "X de Y exercícios · N min" e selo "parou no meio"; editar resposta.
- [x] Evolução › Meus treinos (diário com as séries de cada dia).
- [x] PDF: import que falhou sem sinal tenta de novo, sem erro em inglês; HIIT opcional não ganha página sozinho.
- [x] Story: compartilhar que falha (não cancelado) baixa a imagem; "Gerando imagem…".
- [x] Pontos e Perfil carregam em paralelo e abrem com o que tem no celular em até 3 s.
- [x] Demo: corrigir a cintura no mesmo dia não apaga fotos; +80 da foto 1x por mês; "pausado há pouco" se atualiza.
- [x] Voltar do Android na aba Treino não repete a mesma tela. Cache do app v17. Teste novo: `tests/rodada-2610.mjs`.

### Pendente
- [ ] Rodar supabase/migracao-008-pontos-protegidos.sql (aluna não consegue se dar pontos pelo console; story 30/dia, foto 80/mês). Também está no fim do schema.sql.
- [ ] Treino com só 1 série marcada ainda vale +50 e conta no desafio/semana no banco (exercicios_feitos = exercícios com 1+ série): regra de pontos do Igor. O app já não chama de "treino feito".
- [ ] Resposta editada pelo Igor não volta a aparecer como "nova" pra aluna (precisaria de coluna "editada_em" no banco): decisão do Igor se vale a migração.
- [ ] Editor de treino do Igor apaga e recria os exercícios (ids novos): a fila agora se recupera, mas o ideal é atualizar no lugar (mexe no fluxo de publicar treino).
- [ ] Seguem: migrações 004/006/007 (se ainda não rodaram), publicar função assistente, Kiwify, WhatsApp, vídeos, fotos dos prêmios, drop set por queda, capa do PDF clara, i18n por idioma, regra de troca dos pontos.


### 25/10 (manual, com o Igor no Mac)
- [x] Migrações 006/007/008 + 009 (O time) + 010 (cadastro só pelo admin) rodadas em produção e conferidas.
## 2026-10-26 (decisão do Igor: só treino completo pontua)
- [x] +50, meta da semana e desafio do mês só contam treino completo (todos os exercícios obrigatórios; o HIIT opcional não precisa). Treinos de antes de 26/10 seguem a regra antiga.
- [x] App: Início conta só completos no desafio/meta; feedback avisa antes de enviar que incompleto não pontua; card mostra "incompleto: sem pontos"; Pontos diz "Vale o treino completo". O banco recebe exercicios_feitos = exercícios completos e exercicios_total = obrigatórios.
- [ ] Rodar supabase/migracao-011-so-treino-completo-pontua.sql (também no fim do schema.sql). Sem ela o banco ainda dá +50 pra treino incompleto (o app já mostra a regra nova).

## 2026-10-26 (2ª rodada automática do dia, 5 críticas: Júlia, Carla, Márcia, Renata, Bia · 50 pontos, ~44 únicos)
**Júlia (23, iniciante, iPhone):** Início "7 de 8" com treino completo; "indique uma amiga" prometia pontos sem caminho; aviso "Semana começa pelo A" cobrindo o Iniciar (1º toque perdido); "Lado 1 de 2" começando em 2:00; "anota a placa" no Leg Press/Smith e "halter" no Goblet com anilha; passeio da segunda apontando o treino do dia em cima da escolha da semana; aba Treino ignorando a escolha da semana; números da lista ≠ quadradinhos da sessão; HIIT sem explicação; story com metade vazia e "Treino A".
**Carla (34, Android lento):** card/story "TREINO FEITO" em treino incompleto (+ oferta de cardio); 🔥 subindo com 1 série; descanso apontando a série errada quando marca fora de ordem; recorde e "Última" com 29 kg × 3; "Fácil? Sobe a carga" sem bater as reps; "0 de 8" no Início/Continuar; "Recomeçar do zero" oferecendo registrar; aviso cobrindo a próxima série; sugestão da pirâmide vinda de dia parcial (suspeita); voltar do Android passando por A, B…
**Márcia (52, fonte grande):** anamnese apagando dor/peso/altura no Voltar; Evolução estourando a tela com letra grande; "+ opcional" sem ter feito o HIIT; senha de 6 espaços aceita; feedback sem dizer qual escala falta; aviso vermelho com contraste 3,3:1; fim incompleto comemorando com aviso de pontos miúdo; opções da semana sem cara de botão; abas só com ícone em 300 px; ▶ apagado nos vídeos em gravação e textos cortados.
**Renata (29, mãe, Personalizado):** ⏸ no cronômetro + Pausar marcava a série inteira; Pausar com cronômetro rodando registrava em vez de pausar; saídas de 4,5 min contavam inteiras; celular largado com a tela acesa pra sempre; tempo na "? Dúvida" não descontado; cronômetro retomado ainda "PAUSADO" e "min fora" errado; 🔥 subindo com incompleto; "‹ Pausar" sumindo ao rolar; contagens diferentes no Início; refazer 1 foto do mês exigia as 3.
**Bia (19, celular velho, sinal ruim):** atualização do app apagava PDF/capas guardados; "Gerando PDF…" travado pra sempre no 4G parado; página do PDF só com o HIIT; fonte do Google nunca guardada; Início baixando tudo a cada toque; splash eterno sem sinal ("só na 1ª vez"); story do resumo da semana sem +30; "internet lenta" quando é Wi-Fi sem internet; story demorando 8 s pra avisar; treino de academia pra quem treina em casa sem aviso.

### Corrigido
- [x] Pausar o treino com o cronômetro de exercício rodando ou parado no ⏸: congela onde estava (não marca a série); no Continuar ele volta parado com "Seu cronômetro ficou parado em 0:20". Cronômetro parado não perde tempo.
- [x] "1 min cada lado": mostra o tempo do lado (1:00 → 0:00, duas vezes); retomar volta a dizer "Lado 1 de 2"; botão Pausar não quebra linha.
- [x] Tempo fora: desconta tudo que passar de 2 min (ou do fim do descanso/cronômetro + 3 min), não só acima de 5 min; vale também na "? Dúvida" no meio do treino. Aviso: "tirei N min de tempo parado".
- [x] 10 min sem toque e nada rodando: pausa sozinho, solta a tela e não conta o tempo parado.
- [x] Card e story de treino incompleto: "Treino registrado" com "2/7 exercícios", sem oferta de cardio. Sequência 🔥 só conta semana com treino completo (igual meta e desafio).
- [x] Recorde e "Última" só com série que bateu o mínimo de reps da meta; dica "Fez as 12: tenta subir" / "Mantém o peso e busca as 15" no lugar de "Fácil? Sobe a carga". Sugestão da pirâmide vem do último dia com todas as séries.
- [x] Série marcada fora de ordem: o descanso aponta a 1ª que falta.
- [x] Contagem igual em todo lugar ("0 de 7" no Início, "Continuar (0/7)", topo "· 1 opcional" e "+ opcional ✓" só quando fez o HIIT). Lista do treino e quadradinhos com o mesmo número (bi-set "2-3", opcional "+").
- [x] "Recomeçar do zero" o mesmo treino só pergunta se apaga as séries (não grava treino pela metade).
- [x] Fim incompleto: título "Treino incompleto (1 de 7)" e aviso de pontos num card; confirmação diz "sem pontos". Feedback diz qual escala falta, rola até ela e contorna.
- [x] Anamnese guarda o que ela digitou também no Voltar, no Depois e no voltar do celular.
- [x] Senha com espaço no começo/fim (ou só espaços) recusada; campo sem maiúscula/corretor automático.
- [x] Indique uma amiga: texto honesto (ela fala o código pro Igor no WhatsApp e os +300 entram pra quem indicou).
- [x] Avisos deixam o toque passar pro botão de baixo; na sessão ficam em cima. Aviso de erro com contraste 5,6:1. "Esqueci a senha" fica na tela e lembra do spam.
- [x] Dica da 1ª vez: "Anilhas: soma das anilhas" no Leg Press/Smith/Hack e com anilha; halter só pra halter.
- [x] Segunda-feira: passeio explica a escolha da semana; iniciar um treino pela aba Treino vira o começo da semana (com aviso); repetir treino pela metade vale também na semana escolhida.
- [x] HIIT explicado na lista e na sessão. Voltar do Android na aba Treino sai da aba.
- [x] Evolução/abas com letra grande em 300 px sem estourar; abas sempre com nome; opções da semana com borda e "›"; ▶ visível; cabeçalho das séries quebra em vez de cortar; títulos de programa quebram; "‹ Pausar" fixo no topo da sessão.
- [x] Refazer 1 foto do mês quando já mandou as 3; cintura mostra a data da medida.
- [x] SW v20: PDF, capas e fontes ficam guardados entre versões; o que a 1ª abertura baixou (demo, capas) também; fonte do Google agora entra no cache. Splash sem sinal avisa e tem "Tentar de novo".
- [x] PDF: desiste em 25 s com aviso ("internet muito lenta"), nova tentativa funciona; HIIT opcional não ganha folha sozinho (6 → 5 páginas).
- [x] Início e "Última" da aba Treino não baixam tudo a cada toque (no máximo a cada 3 min).
- [x] Story do resumo da semana dá +30 (mesmo limite do dia); aviso da imagem sai na hora e os pontos depois. "Sem conexão com o servidor" no lugar de "internet lenta".
- [x] Story: nome do grupo ("Treino A · Quadríceps"), recorde ou "Nº treino da semana" em cima, @ acima da barra do Instagram, espera a fonte da marca.
- [x] Quem treina em casa com treino de academia: card "Chamar o Igor" pra adaptar (some no Ok).
- [x] Menores: descanso recarregado volta em tela cheia se estava em tela cheia; dica do ⏱ não volta depois de usar; "Senha criada" curto; botões do pop-up de senha quebram linha; demo sem "· 0:32" e responder o feedback fictício funciona.
- [x] Teste novo: `tests/rodada-2610b.mjs`.

### Pendente
- [ ] Descanso diferente por exercício ajustado pela aluna (como no Mfit): regra de treino do Igor (hoje ele define no editor; ela só tem +15s).
- [ ] Pontos da indicação continuam manuais (o Igor dá os +300). Automático precisaria de campo "código de quem indicou" no cadastro do painel + gatilho no banco: decisão do Igor.
- [ ] "Sou nova, quero começar" segue com o link provisório da Kiwify; treino adaptado pra casa (dado do Igor).
- [ ] Seguem: migração 011 (só treino completo pontua, se ainda não rodou), publicar função assistente, WhatsApp, vídeos, fotos dos prêmios, drop set por queda, capa do PDF clara, i18n por idioma.

## 2026-10-27 (rodada automática, 5 críticas: Júlia, Carla, Márcia, Renata, Bia · 50 pontos, ~44 únicos)
**Júlia (23, iniciante, iPhone):** IA do demo mandava ligar 192 pra "o crucifixo trabalha o peito?"; "qual peso no primeiro dia?" respondia "musculação primeiro"; "não consigo ver o vídeo" caía no "medo"; Express virava "8/8" (só as séries pesadas); fim do Express oferecia cardio de 20 min; Express ficava ligado pra sempre e o Início dizia 40 min; Perfil prometia alarme do descanso no iPhone; "como ganho pontos/o que é Express" sem resposta no demo; "Ver o passeio de novo" não fazia nada no demo; título "FORTALECI-MENTO", "ENVIAR ➤" em 2 linhas, "0:15" no feedback, escalas sem explicação.
**Carla (34, Android lento):** desmarcar série depois de concluir mantinha o exercício como completo e a carga desmarcada; séries digitadas sem ✓ eram jogadas fora no fim; Express aparecia "parcial" e a "Última" ignorava a carga nova; trocar por exercício que já está no treino misturava as cargas; corrigir a última série exigia voltar de tela; apagar registro no histórico não atualizava a "Última" do treino aberto; kg apagado gravava a carga antiga escondida; "+ série" no A1 do bi-set sem A2; desmarcar não parava o descanso; avisos em cima do "✎ anotar" e do "Continuar".
**Márcia (52, fonte grande):** IA mandava HIIT pra "minha pressão é alta"; abas "Pon···/Evoluç···" com letra grande e 10,5 px em 300 px; "Quadrí/ceps" na escolha da semana; título e cabeçalho das séries partidos em 300 px; erro antigo da senha na tela durante o salvar; aviso vermelho da anamnese não sumia depois de preencher; aviso de saúde preso sem botão de fechar; "620 kg" com mensagem de "digita só o número"; login vazio só com balão do navegador; título repetido no pop-up de senha e "Altura (m)" sem dizer que aceita 158.
**Renata (29, mãe, Personalizado):** voltar depois de 40 min fora deixava o relógio negativo e zerava o tempo; Express sugeria a carga da série errada (22/25 em vez de 22/28); pop-up "Terminou? ganhar os pontos" em treino pausado e incompleto; Express "parcial" e "−3 kg"; Igor não sabia que foi Express; Início prometia 40 min e abria Express; "? Dúvida" largada mantinha a tela acesa e o relógio contando; volta com feedback aberto mostrava "Treino de hoje" de novo; não dá pra responder o Igor no app; avisos fixos cobrindo "‹ Pausar" e o relógio.
**Bia (19, celular velho, sinal ruim):** 1 min de spinning valia treino completo (+50, desafio, meta); voltar do Android matava a aula; recarregar perdia a aula; fila travava pra sempre depois de Wi-Fi sem internet; "Aula feita! Conta como treino" sem registrar nada; toque duplo no Começar pulava o aquecimento; spinning sem sinal sem aviso e fora da meta, e "feito sem sinal" com sinal; boneco a 60 quadros/s até pausado; spinning sem card/story; Spinning sem sinal e sem app instalado não abria nem avisava; título do bloco encostando na dica.

### Corrigido
- [x] Volta depois de muito tempo fora: o tempo fora é descontado uma vez só, a volta conta como toque (não expulsa pra Início), relógio nunca negativo; a hora que ela saiu não é sobrescrita se a tela apagar duas vezes.
- [x] "? Dúvida" largada 10 min: pausa o treino e solta a tela, igual na sessão.
- [x] Pop-up "Terminou o treino?" não aparece em treino pausado; com incompleto diz "não pontua" e, faltando mais da metade, "Ainda tô treinando" vem em destaque.
- [x] Desmarcar série: o exercício volta a faltar (chave desligada, sem ✓), a "Última" volta pras séries que continuam marcadas e o descanso daquela série para.
- [x] Séries com kg/reps digitados sem ✓: o fim pergunta "Marco como feitas?"; com 1 exercício faltando, o pop-up diz qual.
- [x] Express: pirâmide fica 1ª e última série (12/8) com a carga certa de cada uma (e salva como série 1 e 3); lembrado só no dia; Início mostra "⚡ Express ~25 min"; sessão diz "· ⚡ Express"; sem oferta de cardio no fim; o Igor vê "⚡ Express" no recado; histórico não chama o dia de "parcial" e a "Última" usa a carga do Express.
- [x] Trocar por exercício que já está no treino: pergunta antes ("as cargas dos dois ficam juntas").
- [x] "‹ Corrigir {exercício}" no topo por 3 min depois de fechar um exercício (corrige a última série sem caçar o Anterior).
- [x] Apagar registro no histórico com o treino aberto: a "Última" e a sugestão do exercício atualizam na hora.
- [x] O ✓ (e o "Fiz, marcar") sempre preenche o kg/reps que vão ser salvos; kg apagado depois = sem carga (não grava escondido).
- [x] "+ série" no bi-set acrescenta no A1 e no A2.
- [x] Spinning: só aula com 90% feita conta como treino completo (+50, desafio, semana); incompleta diz "não pontua"; menos de 1 min = "Aula pulada"; voltar do celular e "Sair" pausam e perguntam (Continuar / Registrar e sair / Sair sem registrar); aula fica guardada no celular e, ao reabrir, o app oferece continuar/registrar/descartar; toque duplo no Começar não pula o aquecimento ("Pular bloco" discreto, "Pausar" em destaque); boneco a ~25 quadros/s e parado quando a roda para; tela solta depois de 10 min pausada; "Postar no story" com card "AULA FEITA" (+30); sem sinal avisa que tá guardado e já conta na meta; sem sinal e sem app instalado avisa em vez de não fazer nada; título do bloco não encosta na dica.
- [x] Fila de envio: cada chamada desiste em 15 s (Wi-Fi sem internet não trava a fila pra sempre); com sinal o aviso é "Registrado ✓" (não "feito sem sinal").
- [x] Volta com o feedback aberto há 2 h: registra e redesenha o Início com o treino já contado.
- [x] IA do demo: "peito" sozinho não é emergência (dor/aperto no peito continua); respostas novas pra peso do 1º dia, vídeo, Express, pontos e pirâmide/drop; "não consigo ver"/"extremamente" não caem no "medo"; "primeiro" só com musculação/cardio; "pressão é alta" e quem marcou cuidado de saúde na anamnese recebem a orientação de liberação médica em vez de HIIT.
- [x] Perfil no iPhone: texto honesto ("com a tela apagada o iPhone não apita"). "Ver o passeio de novo" abre o passeio (também no demo).
- [x] Letra grande: abas com nome curto inteiro ("Pts", "Evol.") quando não cabe e tamanho mínimo em rem; escolha da semana vira 1 coluna sem partir palavra; título do exercício encolhe em 300 px; cabeçalho "Nº / ⏱" no lugar de "SÉRI-E / DESCANS-O"; título dos programas no Início não parte palavra.
- [x] Avisos: o que fica na tela tem "✕"; na sessão aparecem abaixo do "‹ Pausar" e do relógio; "Pausei seu treino" some no Continuar; na aba Treino ficam acima do Continuar/Iniciar.
- [x] Senha: erro antigo some e o botão diz "Salvando…"; pop-up do Perfil com título "Trocar senha" e exemplo no "repete". Anamnese: aviso vermelho some ao digitar; "Pode ser 1,58 ou 158" na altura. Peso fora da faixa: "620 kg? Confere se não sobrou um número". Login vazio: aviso do app embaixo do campo.
- [x] Feedback: duração "15 min" (não "0:15") e linha "Esforço = quanto cansou. Nota = quanto você curtiu."; "Enviar ➤" numa linha.
- [x] SW v24. Teste novo: `tests/rodada-2710.mjs`; `express.mjs`, `idiomas.mjs` e `rodada-2610b.mjs` ajustados (Express só no dia; aba com nome curto).

### Pendente
- [ ] Responder o Igor dentro do app (conversa na mesma resposta): precisa de coluna nova no banco (ex.: sessoes.resposta_aluna) e mudar o painel — decisão do Igor.
- [ ] Express vale +50 e conta no desafio igual ao Completo: regra de pontos do Igor (o app agora avisa ele que foi Express).
- [ ] Spinning incompleto só deixa de dar +50 no banco depois da migração 011 (só treino completo pontua); sem ela o banco ainda dá pontos pra aula curta (o app já diz "não pontua").
- [ ] Comemoração do desafio batido quando o treino é registrado sozinho na volta (hoje só aparece "Batido! 🎉" no card do desafio).
- [ ] SUSPEITA (só no demo): sugestão da pirâmide do Smith fixa em 22/25/28 depois de um treino com 40/42/44 — no demo as séries anteriores são fixas; não dá pra confirmar no app real sem banco.
- [ ] Seguem: migração 011 (se ainda não rodou), publicar função assistente, WhatsApp, vídeos, fotos dos prêmios, drop set por queda, capa do PDF clara, i18n por idioma, link definitivo da Kiwify.

