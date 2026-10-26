# Spinning guiado — base das aulas (26/10/2026)
Pedido do Igor: copiar a metodologia das aulas de spinning mais vistas do último ano + artigos; aulas de 10, 15, 20, 25 e 30 min (5 de cada), aula do mês em rodízio. Sem vídeo: boneco animado senta/levanta e pedala no ritmo do bloco.

## As 5 aulas mais vistas no YouTube (out/2025–out/2026, views lidas em 26/10/2026)
1. Carol Borba — Cardio HIIT na bike, 15 min — 465 mil — https://www.youtube.com/watch?v=cF639qQyXX8
2. CICLO+ (prof. Pâmela) — Ep. 1 Move, 49 min — 308 mil — https://www.youtube.com/watch?v=gd0LbOyPvXQ
3. Carol Borba — Spinning e abdômen, 24 min — 248 mil — https://www.youtube.com/watch?v=D5Q0Kryt21Q
4. Carol Borba — Aulão fácil, 15 min — 226 mil — https://www.youtube.com/watch?v=PA6Wl55Xg4Y
5. Laice Rodrigues — Aula completa, 20 min — 159 mil — https://www.youtube.com/watch?v=pTPDQx07yvg
Referência gringa com RPM e escala: Kaleigh Cohen — 20 min POP — https://www.youtube.com/watch?v=n5FmSIoPVhQ

Padrão das mais vistas: aquecimento curto (2–3 min), um bloco por música, contagem 4-3-2-1 na troca, recuperação ativa (nunca parar), o fim é o trecho mais pesado. Nenhuma das brasileiras fala de cadência, escala de esforço nem ajuste da bike — é aí que o app se diferencia.

## Evidência
- Revisão sistemática 2026 (Front Sports Act Living): spinning é de alta demanda; 20 min a 80–90% FCmáx já dão efeito. https://doi.org/10.3389/fspor.2026.1715110
- Chavarrias et al., 2019 (Medicina): melhora aptidão aeróbia, pressão, lipídios e composição corporal. https://doi.org/10.3390/medicina55080452
- Muñoz-González et al., 2020 (IJERPH): escala de esforço controla a intensidade tão bem quanto a FC. https://doi.org/10.3390/ijerph17134824
- Spinning® (manual): plano 80–110 rpm, subida 60–80 rpm; nunca <60 nem >110. https://spinning.com/blogs/default-blog/back-basics-cadence-ranges-resistance-levels-common-corrections-every-instructor-know
- Atakan et al., 2021 (IJERPH): HIIT de baixo volume pra iniciante; descanso curto demais reduz prazer e adesão. https://doi.org/10.3390/ijerph18137201
- Ng et al., 2023 (Ann Acad Med Singap): rabdomiólise por spinning — 71% mulheres, 87% na 1ª aula. https://doi.org/10.47102/annals-acadmedsg.2022342
- Bini et al., 2011 (Sports Med): selim baixo aumenta compressão na patela. https://doi.org/10.2165/11588740-000000000-00000

## Regras usadas pelo gerador (tools/gerar-aulas-spin.py confere todas)
1. Aquecimento ≥3 min (10–15 min) e ≥5 min (20–30 min), esforço 3–4.
2. Desaquecimento 2 min + 1 min de alongamento nas aulas de 20+.
3. Cadência sempre 60–110 rpm (sprint 105, subida 65–70).
4. Em pé só com esforço ≥5 e 60–85 rpm; blocos de até 45 s; no máximo 30% da aula.
5. Esforço 10 nunca. Iniciante ("Pedal no ritmo") no máximo 6–7.
6. Tiro/sprint 15–20 s sentada, 1:2 trabalho/recuperação; intervalado 1:1.
7. Teto de tempo em esforço ≥7: 10 min → 3 · 15 → 4,5 · 20 → 7,5 · 25 → 9,5 · 30 → 11,5 min.
8. "Respira e bebe água" a cada ~6–8 min, sempre numa recuperação.
9. Fim mais forte (bloco final) antes do desaquecimento.
10. Aviso na lista: 1ª vez, urina escura/dor forte 1–3 dias depois → médico; pressão alta → sem tiros.

## Gasto calórico (vale pra todos os treinos)
MET da atividade (Compendium 2024) × basal por hora da aluna (Mifflin-St Jeor com peso, altura, idade e sexo) — js/kcal.js. Bike pelo esforço do bloco (4,0 leve → 11 máximo). Sempre mostrado como "~" e arredondado de 5 em 5.
