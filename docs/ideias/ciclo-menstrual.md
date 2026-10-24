# Ideia do Igor (24/10/2026): acompanhar o ciclo menstrual e adaptar o treino

Status: ANOTADO, aguardando 2 decisões do Igor antes de construir.

## O que a evidência diz (pesquisa 24/10)
- Fases em que a mulher costuma sofrer mais: TPM (fase lútea final, ~5-7 dias antes da menstruação: humor, fadiga, dor, inchaço) e os 1º-3º dias da menstruação (cólica / fluxo intenso).
  - Li et al. 2026, BMC Women's Health — exercício melhora afeto negativo, dor e fadiga na TPM. doi:10.1186/s12905-025-04242-9
- Desempenho: queda TRIVIAL no início da fase folicular (menstruação); recomendação é individualizar, não regra geral.
  - McNulty et al. 2020, Sports Med (meta-análise, 78 estudos).
  - Colenso-Semple et al. 2023, Front Sports Act Living (umbrella review): sem influência apreciável em força/hipertrofia.
- Mais dor muscular tardia e perda de força pós-treino no início da folicular → carga menor ou recuperação maior nesses dias.
  - Romero-Parra et al. 2021, J Strength Cond Res.
- Exercício REDUZ cólica (dismenorreia primária); musculação e exercícios lombo-pélvicos com bom efeito.
  - Xiang et al. 2025, Front Med. doi:10.3389/fmed.2025.1540557
  - Alghosi et al. 2026, J Midwifery Womens Health. doi:10.1111/jmwh.70084
  - Arroyo-Fernández et al. 2026, J Clin Med. doi:10.3390/jcm15124418
- Hipótese do Igor (adutora/abdutora/sumô/agachamento aumentariam o fluxo): NÃO achamos estudo que comprove. Tratar como opção de conforto (troca se ela sentir desconforto), não como proibição automática. Fluxo muito intenso recorrente → orientar avaliação médica (risco de anemia).

## Proposta de produto
1. Perfil → "Meu ciclo" (opcional, com consentimento explícito): data da última menstruação, duração média do ciclo e da menstruação, uso de anticoncepcional hormonal (se sim: sem previsão de fases, só check-in de sintomas).
2. O app calcula a fase do dia; card discreto na Início ("Fase: menstruação · dia 2").
3. Check-in automático (notificação) no início da TPM prevista e no 1º dia: "Como você tá essa semana?" → cólica, fluxo, cansaço, humor (0-3) + texto livre.
4. Adaptação SÓ se ela sinalizar desconforto: "modo semana difícil" (−1 série ou carga sugerida menor, trocas pré-aprovadas pelo Igor, bloco de mobilidade lombo-pélvica/alongamento). Bem → treino normal, com reforço de que treinar alivia a cólica.
5. Painel do Igor: alerta "semana difícil" com nome e sintomas → ele manda mensagem (proximidade).
6. IA tira-dúvidas recebe fase + check-in como contexto.
7. Após 2-3 ciclos: padrão individual (quando ela rende menos / sente mais).

## Privacidade (LGPD)
Dado de saúde sensível: opt-in com consentimento claro, só a aluna e o Igor veem, dá pra apagar a qualquer momento, nada em notificação na tela bloqueada que exponha o assunto (texto neutro: "Como você tá essa semana?").

## Decisões pendentes do Igor
1. Quais exercícios trocar na "semana difícil" e por quais (lista de trocas aprovadas).
2. Vale para os dois planos ou só Personalizado.

## Técnico (quando aprovado)
- Tabela ciclo (aluna_id, inicio_ultima, dur_ciclo, dur_menstr, anticoncepcional, consentiu_em) + checkins_ciclo (data, colica, fluxo, cansaco, humor, texto), RLS própria/admin.
- Lembrete: notificação via service worker (Android) / Web Push do servidor (iPhone, fase 2).
- Regra de troca: campo novo no exercício (ex.: alternativa_ciclo) definido pelo Igor no editor de treino.
