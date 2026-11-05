# Plano de corrida (estilo Runna)

Programa extra opcional, liberado nos dois planos, pra rua ou esteira. Código: `js/corrida.js`; telas em `js/app.js` (rotas `corrida` e `corridaTreino`).

## Como o plano é montado
- **Entrada da aluna:** meta (5, 10 ou 21 km), dias por semana (2 a 4), tempo recente (opcional) e data da prova (opcional).
- **Semanas:** até a prova (mín. 4, máx. 16; prova a mais de 16 semanas = o plano começa mais tarde). Sem data: 8 (5 km), 10 (10 km), 12 (21 km), 10 pra quem começa do zero.
- **Fases:** Base (~40%) → Construção → Pico → Polimento → Semana da prova. A cada 4 semanas, semana de alívio (volume 80%).
- **Sessões da semana:** 2 dias = qualidade + longão; 3 = qualidade + leve + longão; 4 = qualidade + leve + 2ª qualidade + longão.
- **Qualidade:** Base = leve + acelerações de 20 s; Construção = alterna limiar (3–4 × 5–8 min) e tiros de 3 min (4–6 ×); Pico = específico da meta (5 km: 5 × 4 min forte; 10 km: limiar longo 2 × 12 min; 21 km: 3 × 10 min ritmo de meia + longão com 20 min finais no ritmo de meia).
- **Longão:** cresce de 30→50 min (5 km), 40→75 (10 km), 50→115 (21 km), teto 120 min.
- **Teste de 3 km na semana 4** (planos de 8+ semanas) e a **prova** no fim: depois deles o app pede o tempo e recalcula os ritmos.
- **Do zero** (só 5 km): corre/caminha subindo no máximo um degrau por semana (1/2 min × 8 → 30 min contínuos).

## Ritmos
VDOT de Daniels & Gilbert (1979) a partir do tempo da aluna. Frações do VDOT por zona: trote 58–64%, leve 62–70%, moderado 78–81%, ritmo de meia 83–85%, limiar 86–89%, forte (intervalado) 95–99%, tiro 103–108%; ritmo de prova = tempo previsto pra meta. Sem tempo: cada zona vai pela sensação (teste da fala).

## Calorias
ACSM: corrida VO2 = 0,2·v + 3,5; caminhada VO2 = 0,1·v + 3,5 (v em m/min), MET = VO2/3,5, multiplicado pela basal dela (mesma base do `kcal.js`).

## Registro
Treino guiado por tempo (sem GPS). Vai pro histórico como `Corrida · <nome do treino>`; só pontua com 90% feito (mesma regra do spinning). Plano e treinos feitos ficam no celular dela (`corridaPlano`), igual ao nível do Hyrox.

## Fase 2 (precisa de mudança no banco)
Igor ver e ajustar o plano de cada aluna no painel; puxar distância/pace do Strava ou do relógio.
