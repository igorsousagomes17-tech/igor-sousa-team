// HYROX NA ACADEMIA — programa extra opcional (igual spinning, mobilidade etc.), liberado nos dois planos.
// 3 níveis (iniciante, intermediário, avançado), 3 treinos por mês. O mês roda num ciclo de 3 fases:
// Base → Específico (entra a corrida comprometida) → Simulado. Regras e fontes em docs/metodologia/hyrox.md.
// Os treinos usam o mesmo motor do treino do mês: circuito = exercícios ligados (igual bi-set/tri-set),
// séries = voltas, descanso só no fim de cada volta. Tempo ("3 min") abre o cronômetro sozinho.

// Estações adaptadas pra academia comum; o nome oficial da estação vai na alternativa (botão de troca).
const X = {
  corrida: (reps, dica) => ({ nome: 'Corrida na esteira', reps, carga: false, dica: dica || 'Ritmo que dá pra falar frases curtas. Esteira com 1% de inclinação.' }),
  ski: reps => ({ nome: 'Puxada em pé na polia alta (SkiErg)', reps, alternativa: 'SkiErg', dica: 'Em pé, braços estendidos, puxa até o quadril dobrando um pouco o joelho. Rápido e contínuo.' }),
  treno: reps => ({ nome: 'Leg press pesado (trenó)', reps, alternativa: 'Sled push', dica: 'Substitui o empurrar do trenó: carga pesada, sem travar o joelho em cima.' }),
  puxa: reps => ({ nome: 'Remada baixa pesada (puxada do trenó)', reps, alternativa: 'Sled pull', dica: 'Puxa com as costas e o quadril firme. Substitui o puxar do trenó.' }),
  burpee: reps => ({ nome: 'Burpee com salto à frente', reps, carga: false, dica: 'Peito no chão, levanta e salta pra frente com os dois pés. Aterrissa macio.' }),
  remo: reps => ({ nome: 'Remo ergômetro', reps, carga: false, alternativa: 'Bike', dica: 'Empurra com as pernas primeiro, depois puxa com os braços. Sem curvar a lombar.' }),
  farmer: reps => ({ nome: 'Farmer carry com halteres', reps, alternativa: 'Farmer carry com kettlebell', dica: 'Halter pesado em cada mão, ombro pra trás, passo rápido e curto.' }),
  lunge: reps => ({ nome: 'Afundo andando com halter no ombro (sandbag)', reps, alternativa: 'Afundo andando com sandbag', dica: 'Halter apoiado no ombro, tronco reto, joelho de trás quase encosta no chão.' }),
  wall: reps => ({ nome: 'Wall ball', reps, alternativa: 'Thruster com halteres', dica: 'Agacha fundo e joga a bola no alvo usando a força das pernas. Pega já descendo.' }),
  prancha: reps => ({ nome: 'Prancha', reps, carga: false, dica: 'Cotovelo embaixo do ombro, abdômen e glúteo firmes.' }),
  mob: () => ({ nome: 'Mobilidade de quadril', reps: '1 min cada lado', series: 1, descanso_s: 0, carga: false, dica: 'Solta o quadril antes de começar.' })
};
const s = (e, series, descanso_s = 60, extra = {}) => ({ ...e, series, descanso_s, ...extra });
// Circuito: itens seguidos, sem descanso entre eles; descanso só no fim da volta.
const circ = (voltas, descanso, itens) => ({ circ: true, voltas, descanso, itens });

// Monta a lista final com ordem e o encadeamento (cada item aponta pro próximo; o último aponta pro anterior)
export function montar(blocos) {
  const out = [];
  for (const b of blocos) {
    if (!b.circ) { out.push({ series: 3, descanso_s: 60, ...b, ordem: out.length + 1, biset_com: null }); continue; }
    const ini = out.length + 1, n = b.itens.length;
    b.itens.forEach((it, j) => out.push({ ...it, ordem: ini + j, series: b.voltas, descanso_s: j === n - 1 ? b.descanso : 0, biset_com: n > 1 ? (j < n - 1 ? ini + j + 1 : ini + j - 1) : null, circuito: n > 1 ? { voltas: b.voltas, itens: n } : undefined }));
  }
  return out;
}

export const NIVEIS = [
  { id: 'ini', nome: 'Iniciante', sub: 'Nunca fiz Hyrox ou corro pouco' },
  { id: 'int', nome: 'Intermediário', sub: 'Corro 3 a 5 km e já treino forte' },
  { id: 'ava', nome: 'Avançado', sub: 'Já fiz prova ou corro 5 km com folga' }
];
export const FASES = [
  { nome: 'Base', txt: 'Mês de construir o motor: corrida leve, força e técnica das estações.' },
  { nome: 'Específico', txt: 'Entra a corrida comprometida: correr logo depois de uma estação, igual na prova.' },
  { nome: 'Simulado', txt: 'Mês de juntar tudo: mini prova com corrida e estações seguidas.' }
];
// Fase do mês: roda Base → Específico → Simulado (todo mês muda o treino, igual aos outros programas)
// Ciclo começa em novembro/2026 (lançamento) na Base: nov Base, dez Específico, jan Simulado, fev Base...
export const faseDoMes = (d = new Date()) => (((d.getFullYear() * 12 + d.getMonth()) - (2026 * 12 + 10)) % 3 + 3) % 3;

// TREINOS[nível][fase] = 3 treinos. Máx. 40 min. Nada de duas máquinas no mesmo circuito.
const T = {
  ini: [
    [ // Base
      { nome: 'Estações + corrida leve', duracao_min: 30, blocos: [X.mob(), circ(3, 90, [X.corrida('3 min'), X.wall('10'), X.remo('250 m')]), s(X.prancha('30s'), 3, 30)] },
      { nome: 'Força pras estações', duracao_min: 35, blocos: [s({ nome: 'Agachamento goblet', reps: '12', dica: 'Halter colado no peito, desce controlando.' }, 3, 60), s(X.puxa('12'), 3, 60), s(X.lunge('10 cada perna'), 3, 60), s(X.farmer('40s'), 3, 60), s({ nome: 'Dead Bug', reps: '10 cada lado', carga: false, dica: 'Lombar colada no chão o tempo todo.' }, 3, 30)] },
      { nome: 'Motor leve', duracao_min: 30, blocos: [s(X.corrida('10 min', 'Leve, dá pra conversar. É aqui que o fôlego cresce.'), 1, 60), s(X.remo('4 min'), 1, 60), s(X.ski('1 min'), 3, 60), s(X.corrida('5 min', 'Leve de novo, soltando.'), 1, 0)] }
    ],
    [ // Específico
      { nome: 'Corrida comprometida', duracao_min: 32, blocos: [X.mob(), circ(4, 90, [X.corrida('3 min', 'Corre logo depois da estação: os primeiros 30s pesam, depois o ritmo volta.'), X.burpee('6'), X.lunge('8 cada perna')])] },
      { nome: 'Força pras estações', duracao_min: 35, blocos: [s(X.treno('10'), 4, 90), s({ nome: 'Elevação de Quadril', reps: '12', dica: 'Segura 1s em cima.' }, 3, 60), s(X.ski('45s'), 3, 45), s(X.farmer('40 m'), 3, 60), s({ nome: 'Pallof Press', reps: '10 cada lado', dica: 'Não deixa o tronco girar.' }, 3, 30)] },
      { nome: 'Tiros na esteira', duracao_min: 28, blocos: [s(X.corrida('5 min', 'Aquecimento leve.'), 1, 0), s(X.corrida('1 min', 'Forte: quase sem conseguir falar. No descanso, caminha na esteira.'), 6, 60), s(X.remo('500 m'), 1, 0)] }
    ],
    [ // Simulado
      { nome: 'Mini Hyrox (4 estações)', duracao_min: 35, blocos: [circ(1, 0, [X.corrida('4 min'), X.ski('2 min'), X.corrida('4 min'), X.treno('20'), X.corrida('4 min'), X.remo('500 m'), X.corrida('4 min'), X.wall('30')])] },
      { nome: 'Força leve (semana de prova)', duracao_min: 30, blocos: [s({ nome: 'Agachamento goblet', reps: '10', dica: 'Carga média, sem ir à falha.' }, 3, 60), s(X.puxa('10'), 3, 60), s(X.farmer('30 m'), 3, 60), s(X.prancha('40s'), 3, 30)] },
      { nome: 'Corrida comprometida curta', duracao_min: 28, blocos: [circ(3, 90, [X.wall('15'), X.corrida('3 min'), X.lunge('8 cada perna'), X.corrida('2 min')])] }
    ]
  ],
  int: [
    [
      { nome: 'Estações + corrida', duracao_min: 36, blocos: [X.mob(), circ(4, 90, [X.corrida('500 m'), X.wall('15'), X.remo('300 m')]), s(X.prancha('45s'), 3, 30)] },
      { nome: 'Força pras estações', duracao_min: 38, blocos: [s(X.treno('10'), 4, 90), s({ nome: 'Agachamento búlgaro com halter', reps: '10 cada perna', dica: 'Tronco levemente à frente.' }, 3, 60), s(X.puxa('12'), 4, 60), s(X.farmer('50 m'), 3, 60), s({ nome: 'Pallof Press', reps: '12 cada lado', dica: 'Não deixa o tronco girar.' }, 3, 30)] },
      { nome: 'Motor (limiar)', duracao_min: 35, blocos: [s(X.corrida('5 min', 'Aquecimento leve.'), 1, 0), s(X.corrida('4 min', 'Ritmo forte mas sustentável: frases curtas.'), 4, 90), s(X.ski('2 min'), 2, 60)] }
    ],
    [
      { nome: 'Corrida comprometida', duracao_min: 38, blocos: [X.mob(), circ(4, 90, [X.treno('15'), X.corrida('500 m', 'Sai do leg press e corre: segura o ritmo nos primeiros 200 m.'), X.burpee('10'), X.corrida('500 m')])] },
      { nome: 'Força + estações', duracao_min: 38, blocos: [s({ nome: 'Levantamento terra com halteres', reps: '10', dica: 'Coluna neutra, quadril pra trás.' }, 4, 90), s(X.lunge('12 cada perna'), 3, 60), s(X.ski('1 min'), 4, 45), s(X.wall('20'), 3, 60), s(X.farmer('50 m'), 3, 60)] },
      { nome: 'EMOM 30', duracao_min: 30, blocos: [circ(6, 0, [X.corrida('1 min', 'Começa no minuto cheio. Sobrou tempo? É seu descanso.'), X.remo('200 m'), X.wall('12'), X.burpee('6'), { ...X.ski('1 min'), dica: 'Último minuto da volta, sem parar.' }])] }
    ],
    [
      { nome: 'Meio Hyrox', duracao_min: 40, blocos: [circ(1, 0, [X.corrida('1 km'), X.ski('600 m'), X.corrida('1 km'), X.treno('25'), X.corrida('1 km'), X.burpee('15'), X.corrida('1 km'), X.wall('50')])] },
      { nome: 'Força leve (semana de prova)', duracao_min: 30, blocos: [s(X.treno('10'), 3, 90), s(X.puxa('10'), 3, 60), s(X.farmer('40 m'), 3, 60), s(X.prancha('45s'), 3, 30)] },
      { nome: 'Corrida comprometida', duracao_min: 35, blocos: [circ(3, 120, [X.lunge('12 cada perna'), X.corrida('500 m'), X.wall('20'), X.corrida('500 m'), X.farmer('50 m')])] }
    ]
  ],
  ava: [
    [
      { nome: 'Estações + corrida', duracao_min: 40, blocos: [circ(4, 90, [X.corrida('1 km'), X.ski('300 m'), X.wall('20')]), s(X.prancha('1 min'), 2, 30)] },
      { nome: 'Força pras estações', duracao_min: 40, blocos: [s(X.treno('8'), 5, 90), s({ nome: 'Agachamento búlgaro com halter', reps: '8 cada perna', dica: 'Carga alta, tronco levemente à frente.' }, 4, 60), s(X.puxa('10'), 4, 60), s(X.farmer('60 m'), 4, 60), s({ nome: 'Pallof Press', reps: '12 cada lado', dica: 'Não deixa o tronco girar.' }, 3, 30)] },
      { nome: 'Motor (limiar)', duracao_min: 38, blocos: [s(X.corrida('5 min', 'Aquecimento leve.'), 1, 0), s(X.corrida('1 km', 'Ritmo de prova: forte, mas igual do 1º ao último.'), 5, 90), s(X.remo('500 m'), 1, 0)] }
    ],
    [
      { nome: 'Corrida comprometida', duracao_min: 40, blocos: [circ(4, 90, [X.treno('20'), X.corrida('1 km', 'Sai da estação e encaixa o ritmo de prova em até 200 m.'), X.lunge('20 passos')])] },
      { nome: 'Força + estações', duracao_min: 40, blocos: [s({ nome: 'Levantamento terra com halteres', reps: '8', dica: 'Carga alta, coluna neutra.' }, 4, 90), s(X.puxa('12'), 4, 60), s(X.wall('25'), 4, 60), s(X.burpee('12'), 3, 45), s(X.farmer('80 m'), 3, 60)] },
      { nome: 'EMOM 36', duracao_min: 36, blocos: [circ(6, 0, [X.corrida('1 min', 'Começa no minuto cheio. Sobrou tempo? É seu descanso.'), X.ski('250 m'), X.wall('15'), X.burpee('8'), X.remo('250 m'), X.lunge('10 passos')])] }
    ],
    [
      { nome: 'Hyrox: 1ª metade', duracao_min: 40, blocos: [circ(1, 0, [X.corrida('1 km'), X.ski('1000 m'), X.corrida('1 km'), X.treno('30'), X.corrida('1 km'), X.puxa('30'), X.corrida('1 km'), X.burpee('80 m (ou 40)')])] },
      { nome: 'Hyrox: 2ª metade', duracao_min: 40, blocos: [circ(1, 0, [X.corrida('1 km'), X.remo('1000 m'), X.corrida('1 km'), X.farmer('200 m'), X.corrida('1 km'), X.lunge('100 m (ou 50)'), X.corrida('1 km'), X.wall('100 (ou 60)')])] },
      { nome: 'Força leve (semana de prova)', duracao_min: 30, blocos: [s(X.treno('8'), 3, 90), s(X.puxa('8'), 3, 60), s(X.wall('15'), 3, 60), s(X.prancha('1 min'), 2, 30)] }
    ]
  ]
};

export function treinosDoMes(nivel, d = new Date()) {
  const f = faseDoMes(d), lista = (T[nivel] || T.ini)[f];
  return lista.map((x, i) => ({ id: `hyrox-${nivel}-${f}-${i}`, nome: x.nome, duracao_min: x.duracao_min, exercicios: montar(x.blocos) }));
}
export const TODOS = T; // pros testes
