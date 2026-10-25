# Regras do Igor (24/10/2026) — a implementar hoje

## 1. Ordem da semana escolhida pela aluna
- No 1º dia da semana (domingo/segunda ou o 1º dia em que ela vai treinar), o app pergunta:
  "Qual grupamento você quer começar essa semana?" → Quadríceps · Glúteo · Posterior · Superior.
- A partir da escolha, o app reorganiza a ORDEM dos treinos da semana começando pelo escolhido.
- O treino continua o mesmo (mesmos exercícios, séries, cargas): muda só a logística/distribuição dos dias.

## 2. Volume maior pro foco dela
- Se a aluna escolheu foco (ex.: anamnese "foco em glúteo e quadríceps"), o grupamento foco recebe mais volume semanal.
- Referência do Igor: foco = ~27 séries/semana; demais grupamentos = ~15 séries/semana.
  (ex.: foco quadríceps → 27 séries de quadríceps e 15 pras demais)
- Pendente de definir com o Igor hoje: como distribuir as séries extras (em quais treinos/exercícios), regra quando ela tem 2 focos, e limite de tempo por treino (regra dele: máx. 40 min).

## Técnico (rascunho)
- Treinos ganham um "grupamento" (quadriceps | gluteo | posterior | superior) — no editor do Igor.
- Tabela/registro da escolha semanal da aluna (semana ISO + grupamento) e "Treino de hoje" segue essa ordem.
- Volume: contar séries por grupamento na semana (incluindo bi-sets) e somar séries nos exercícios-base do foco até a meta.

## 3. Treino-base do mês + adaptação automática por aluna (Igor, 24/10 07:56)
Fluxo:
1. Claude monta o TREINO-BASE do mês (padrão 6x, regras do Igor) → manda pro Igor → Igor corrige → Claude sobe no sistema.
2. Cada aluna recebe o MESMO treino-base, mas o app entrega uma versão adaptada à anamnese/feedback dela:
   - Dias por semana (ex.: base 6x, aluna treina 4x → reorganizar em 4 dias mantendo o volume semanal).
   - Tempo por treino (anamnese: 30/40/60 min) → caber no tempo sem perder séries (bi-sets, menos descanso, mais dias).
   - Foco (ex.: glúteo ~20 séries/semana, demais ~15 — números são referência, não regra fixa; antes ele citou 27/15).
   - Limitações/dores (anamnese) → usar alternativas aprovadas.
   - Feedback (esforço/nota/comentário) → ajustar ao longo do mês.
   - Ordem da semana pela escolha dela (regra 1).
3. Mesmo treino pra todas, cada app mostra "pensadinho" pra ela.

Proposta técnica (motor de adaptação):
- Treino-base com metadados por exercício: grupamento, papel (base/composto, acessório, isolador, mobilidade, core, cardio), séries, tempo estimado, alternativas.
- Motor (determinístico, sem IA, testável): meta de séries/semana por grupamento (foco vs demais) → divide nos N dias da aluna → preenche com exercícios do base por prioridade (base > acessório > isolador) → ajusta séries → checa tempo (≤ tempo dela; usa bi-set agonista/antagonista, com halter, nunca 2 máquinas) → aplica limitações.
- Resultado salvo como plano da aluna (o Igor vê e pode editar no painel antes/depois).
- Personalizado: sai como rascunho pro Igor aprovar; Básico: direto (decisão anterior dele).

## Status (24/10, decisões do Igor)
- [x] Grupo que abre a semana: a aluna escolhe **toda semana** (card no início, antes do 1º treino da semana). Escolha fica no celular; "seguir a ordem normal" pula a pergunta naquela semana. Teste: tests/semana-flexivel.mjs.
- [ ] Volume do foco: Igor pediu pra perguntar depois (lembrete agendado pra 25/10 à noite).
- [ ] Check-in com dor (2 exercícios de alívio): esperar o Igor gravar os exercícios (mapa de filmagem) e aí montar.
