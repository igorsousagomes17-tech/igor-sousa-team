// 44 exercícios novos (14/11). Boneco olha pra +X; lado direito = +Z.
// sh = [flexão, abdução, rotação]; com rotação 90 a "flexão" vira abdução e o cotovelo dobra pra cima; com -90 o cotovelo dobra pra dentro.
const SUP = (y, z = 90) => ({ p: [0, y, 0], r: [0, 0, z] });        // deitado de barriga pra cima, cabeça pra -X
const PRONO = (y, z = -90) => ({ p: [0, y, 0], r: [0, 0, z] });     // de bruços, cabeça pra +X
const PE = (hinge = 0) => ({ p: [0, null, 0], r: [0, 0, -hinge] });   // em pé; hinge = inclina o corpo pra frente no quadril
const FRENTE = { p: [0, null, 0], r: [0, -90, 0] };                    // em pé, de frente pra câmera lateral
const sent = y => ({ p: [0, y, 0], r: [0, 0, 0] });
const banco = (x = -.15, h = .42, c = 1.25) => ['caixa', [x, h / 2, 0], [c, h, .32]];
const assento = (y, x = -.05) => ['caixa', [x, y / 2, 0], [.42, y, .4]];
const encosto = (x, y, h = .7, ang = 0) => ['caixa', [x, y + h / 2, 0], [.08, h, .4], undefined, [0, 0, ang]];
const colchonete = ['caixa', [-.3, .01, 0], [1.9, .02, .6], 0x47474d];
const pernasSent = { hpL: [90, 8, 0], hpR: [90, 8, 0], knL: 90, knR: 90 };
const pesNoBanco = { hpL: [20, 8, 0], hpR: [20, 8, 0], knL: 100, knR: 100 };
const joelhoDobrado = { hpL: [55, 6, 0], hpR: [55, 6, 0], knL: 100, knR: 100 };
const m = (...o) => Object.assign({}, ...o);
const ambos = (k, v) => ({ [k + 'L']: v, [k + 'R']: v });
const braco = (sh, el) => m(ambos('sh', sh), ambos('el', el));
const barraAlta = h => [['caixa', [0, h, 0], [.05, .05, 1.3], 0xb9b9be], ['caixa', [-.5, h / 2, -.65], [.08, h + .05, .08]], ['caixa', [-.5, h / 2, .65], [.08, h + .05, .08]], ['caixa', [-.25, h, -.65], [.5, .06, .06]], ['caixa', [-.25, h, .65], [.5, .06, .06]]];

export const EX = [
  // ---------------- BRAÇOS ----------------
  { id: 'rosca-direta-barra', nome: 'Rosca Direta Barra Reta', cena: [['barra', 1.2, .12]],
    A: m(braco([4, 10, 0], 8)), B: m(braco([14, 10, 0], 140)) },
  { id: 'rosca-scott-maquina', nome: 'Rosca Scott máquina', cena: [assento(.48), ['caixa', [.36, .92, 0], [.42, .05, .55], 0x6a6a70, [0, 0, -40]], ['barraCurta']],
    A: m({ root: sent(.6), sp: [0, 0, 18] }, pernasSent, braco([48, 10, 0], 12)), B: m({ root: sent(.6), sp: [0, 0, 18] }, pernasSent, braco([48, 10, 0], 125)) },
  { id: 'triceps-banco', nome: 'Tríceps Banco com Pernas Esticadas', cena: [['caixa', [-.42, .22, 0], [.4, .44, .9]]],
    A: m({ root: { p: [0, .5, 0], r: [0, 0, 0] } }, ambos('hp', [62, 6, 0]), braco([-45, 12, 0], 5)),
    B: m({ root: { p: [0, .26, 0], r: [0, 0, 0] } }, ambos('hp', [78, 6, 0]), braco([-80, 12, 0], 90)) },
  { id: 'triceps-paralela-maquina', nome: 'Tríceps Paralela Máquina', cena: [assento(.48), ['caixa', [-.3, .95, 0], [.08, .9, .4]]],
    A: m({ root: sent(.6) }, pernasSent, braco([-10, 14, 0], 100)), B: m({ root: sent(.6) }, pernasSent, braco([-8, 12, 0], 6)) },
  { id: 'triceps-testa-barra-w', nome: 'Tríceps Testa com Barra W', cena: [banco(), ['barraW']],
    A: m({ root: SUP(.55) }, pesNoBanco, braco([95, 12, 0], 4)), B: m({ root: SUP(.55) }, pesNoBanco, braco([108, 12, 0], 115)) },
  // ---------------- CORE ----------------
  { id: 'abdominal-barra', nome: 'Abdominal Barra (elevação de joelhos na barra)', cena: barraAlta(2.36),
    A: m({ root: { p: [0, 1.26, 0], r: [0, 0, 0] } }, braco([180, 12, 0], 0)), B: m({ root: { p: [0, 1.26, 0], r: [0, 0, 6] } }, braco([180, 12, 0], 0), ambos('hp', [100, 6, 0]), ambos('kn', 95)) },
  { id: 'abdominal-canivete', cam: { zoom: .82 }, nome: 'Abdominal Canivete', cena: [colchonete],
    A: m({ root: SUP(.13) }, braco([175, 10, 0], 0)), B: m({ root: SUP(.14, 62) }, { sp: [0, 0, 30] }, braco([95, 10, 0], 0), ambos('hp', [70, 6, 0])) },
  { id: 'abdominal-flexao-lateral', cam: { zoom: .82 }, nome: 'Abdominal flexão lateral solo', cena: [colchonete],
    poses: [m({ root: SUP(.14) }, { sp: [0, 0, 22] }, joelhoDobrado, braco([8, 10, 0], 0)),
      m({ root: SUP(.14) }, { sp: [24, 0, 22] }, joelhoDobrado, braco([8, 10, 0], 0)),
      m({ root: SUP(.14) }, { sp: [-24, 0, 22] }, joelhoDobrado, braco([8, 10, 0], 0))] },
  { id: 'abdominal-infra-solo', cam: { zoom: .82 }, nome: 'Abdominal Infra Solo', cena: [colchonete],
    A: m({ root: SUP(.13) }, braco([0, 12, 0], 0), ambos('hp', [8, 4, 0])), B: m({ root: SUP(.13) }, braco([0, 12, 0], 0), ambos('hp', [92, 4, 0])) },
  { id: 'abdominal-maquina', nome: 'Abdominal Máquina', cena: [assento(.48), ['caixa', [-.3, .95, 0], [.08, .9, .45]]],
    A: m({ root: sent(.6), sp: [0, 0, -4] }, pernasSent, braco([150, 22, 0], 135)), B: m({ root: sent(.6), sp: [0, 0, 42] }, pernasSent, braco([150, 22, 0], 135)) },
  { id: 'abdominal-remador', cam: { zoom: .82 }, nome: 'Abdominal Remador', cena: [colchonete],
    A: m({ root: SUP(.13) }, braco([175, 10, 0], 0), ambos('hp', [5, 4, 0])), B: m({ root: SUP(.15, 35) }, braco([75, 10, 0], 0), ambos('hp', [115, 6, 0]), ambos('kn', 125)) },
  { id: 'prancha-lateral-baixa', cam: { zoom: .82 }, nome: 'Prancha Isométrica Lateral Baixa', cena: [colchonete],
    A: m({ root: { p: [0, null, 0], q: [['z', 90], ['x', 90], ['z', -16]] } }, { shR: [0, 88, 0], elR: 90, shL: [0, 8, 0], elL: 40 }),
    B: m({ root: { p: [0, null, 0], q: [['z', 90], ['x', 90], ['z', -11]] } }, { sp: [-6, 0, 0], shR: [0, 92, 0], elR: 90, shL: [0, 8, 0], elL: 40 }) },
  { id: 'prancha-peso-alternando', cam: { zoom: .82 }, nome: 'Prancha Peso Alternando', cena: [colchonete, ['halteres']],
    poses: [m({ root: { p: [0, null, 0], r: [0, 0, -78] } }, braco([82, 14, 0], 0), ambos('hp', [0, 10, 0]), ambos('an', 60)),
      m({ root: { p: [0, null, 0], r: [0, 0, -78] } }, { shL: [82, 14, 0], elL: 0, shR: [20, 18, 0], elR: 95 }, ambos('hp', [0, 10, 0]), ambos('an', 60)),
      m({ root: { p: [0, null, 0], r: [0, 0, -78] } }, { shR: [82, 14, 0], elR: 0, shL: [20, 18, 0], elL: 95 }, ambos('hp', [0, 10, 0]), ambos('an', 60))] },
  // ---------------- COSTAS ----------------
  { id: 'barra-graviton', nome: 'Barra fixa no Graviton', cena: [...barraAlta(2.2), ['assentoRaiz', -.12, -.55, [.45, .06, .5]]],
    A: m({ root: { p: [0, 1.1, 0], r: [0, 0, 0] } }, { shL: [168, 0, 90], shR: [168, 0, 90], elL: 6, elR: 6 }, ambos('kn', 95)),
    B: m({ root: { p: [0, 1.52, 0], r: [0, 0, -4] } }, { shL: [45, 0, 90], shR: [45, 0, 90], elL: 128, elR: 128 }, ambos('kn', 95)) },
  { id: 'pulldown-polia-dupla', nome: 'Pulldown Polia Dupla', cena: [assento(.48), ['cabo', [0, 2.3, -.45], 'maoL'], ['cabo', [0, 2.3, .45], 'maoR'], ['caixa', [.05, 2.32, 0], [.1, .08, 1.0]]],
    A: m({ root: sent(.6) }, pernasSent, { shL: [160, 0, 90], shR: [160, 0, 90], elL: 8, elR: 8 }), B: m({ root: sent(.6), sp: [0, 0, -8] }, pernasSent, { shL: [35, 0, 90], shR: [35, 0, 90], elL: 125, elR: 125 }) },
  { id: 'puxada-fechada-barra', nome: 'Puxada Fechada barra reta', cena: [assento(.48), ['barraCurta'], ['cabo', [.1, 2.4, 0]]],
    A: m({ root: sent(.6), sp: [0, 0, -6] }, pernasSent, braco([172, 10, 0], 0)), B: m({ root: sent(.6), sp: [0, 0, -18] }, pernasSent, braco([25, 12, 0], 125)) },
  { id: 'remada-alta-polia', nome: 'Remada Alta na Polia Baixa com Barra Reta', cena: [['barraCurta'], ['cabo', [.45, .1, 0]], ['coluna', .52]],
    A: { shOrd: 'XYZ', shL: [0, 8, -90], shR: [0, 8, -90], elL: 6, elR: 6 }, B: { shOrd: 'XYZ', shL: [0, 82, -90], shR: [0, 82, -90], elL: 128, elR: 128 } },
  { id: 'remada-alta-barra-w', nome: 'Remada Alta com Barra W', cena: [['barraW']],
    A: { shOrd: 'XYZ', shL: [0, 8, -90], shR: [0, 8, -90], elL: 6, elR: 6 }, B: { shOrd: 'XYZ', shL: [0, 84, -90], shR: [0, 84, -90], elL: 130, elR: 130 } },
  // ---------------- GLÚTEO / MOBILIDADE ----------------
  { id: 'abducao-tronco-frente', nome: 'Abdução de Quadril Máquina com Corpo a Frente', cena: [assento(.48)],
    A: m({ root: sent(.6), sp: [0, 0, 40] }, braco([50, 10, 0], 40), { hpL: [90, 4, 0], hpR: [90, 4, 0], knL: 90, knR: 90 }),
    B: m({ root: sent(.6), sp: [0, 0, 40] }, braco([50, 10, 0], 40), { hpL: [90, 34, 0], hpR: [90, 34, 0], knL: 90, knR: 90 }) },
  { id: 'ativacao-gluteo-deitado', nome: 'Ativação de glúteos deitado (concha)', cena: [colchonete], cam: { ang: 55, zoom: .82 },
    A: m({ root: { p: [0, .2, 0], q: [['z', 90], ['x', -90]] } }, { shR: [150, 0, 0], elR: 120, shL: [20, 10, 0], elL: 60 }, ambos('hp', [45, 0, 0]), ambos('kn', 90)),
    B: m({ root: { p: [0, .2, 0], q: [['z', 90], ['x', -90]] } }, { shR: [150, 0, 0], elR: 120, shL: [20, 10, 0], elL: 60 }, { hpL: [45, 40, 0], hpR: [45, 0, 0] }, ambos('kn', 90)) },
  { id: 'pull-through-polia', nome: 'Pull-through na polia', cena: [['corda'], ['cabo', [-.75, .1, 0]], ['coluna', -.8]],
    A: m({ root: PE(55) }, ambos('hp', [60, 14, 0]), ambos('kn', 18), braco([40, 6, 0], 0)), B: m({ root: PE(0) }, ambos('hp', [0, 14, 0]), ambos('kn', 4), braco([-4, 6, 0], 0)) },
  { id: 'agachamento-cossaco', nome: 'Agachamento Cossaco (mobilidade)', cam: { ang: 20 },
    poses: [m({ root: { p: [0, null, 0], r: [0, -90, 0] } }, { hpL: [8, 40, 0], hpR: [8, 40, 0] }, braco([70, 10, 0], 60)),
      m({ root: { p: [.12, null, 0], r: [0, -90, 0] }, sp: [0, 0, 25] }, { hpR: [112, 30, 0], knR: 135, hpL: [5, 55, 0], knL: 0, anL: 20 }, braco([80, 10, 0], 50)),
      m({ root: { p: [-.12, null, 0], r: [0, -90, 0] }, sp: [0, 0, 25] }, { hpL: [112, 30, 0], knL: 135, hpR: [5, 55, 0], knR: 0, anR: 20 }, braco([80, 10, 0], 50))] },
  { id: 'alongamento-posteriores', nome: 'Alongamento de Posteriores',
    A: m({ root: PE(10) }, ambos('hp', [10, 6, 0]), braco([10, 8, 0], 5)), B: m({ root: PE(78) }, { sp: [0, 0, 18] }, ambos('hp', [80, 6, 0]), braco([95, 8, 0], 0)) },
  { id: 'mobilidade-quadril', nome: 'Mobilidade de quadril (abre e fecha o joelho)', cam: { ang: 50 },
    poses: [m(braco([0, 40, 0], 20)), m(braco([0, 40, 0], 20), { hpR: [90, 4, 0], knR: 95 }), m(braco([0, 40, 0], 20), { hpR: [80, 55, 25], knR: 95 })] },
  // ---------------- OMBRO ----------------
  { id: 'biceps-desenvolvimento', nome: 'Bíceps mais desenvolvimento', cena: [['halteres']],
    poses: [m(braco([4, 12, 0], 8)), m(braco([12, 12, 0], 140)), m({ shL: [160, 0, 90], shR: [160, 0, 90], elL: 5, elR: 5 })] },
  { id: 'elevacao-frontal-halteres', nome: 'Elevação Frontal com Halteres', cena: [['halteres']],
    A: m(braco([4, 10, 0], 8)), B: m(braco([92, 10, 0], 8)) },
  { id: 'elevacao-frontal-polia-barra', nome: 'Elevação Frontal na Polia Baixa (pronada)', cena: [['barraCurta'], ['cabo', [-.45, .1, 0]], ['coluna', -.52]],
    A: m(braco([4, 8, 0], 6)), B: m(braco([92, 8, 0], 6)) },
  { id: 'elevacao-frontal-polia-corda', nome: 'Elevação Frontal na Polia com Corda', cena: [['corda'], ['cabo', [-.45, .1, 0]], ['coluna', -.52]],
    A: m(braco([4, 6, 0], 6)), B: m(braco([92, 6, 0], 6)) },
  { id: 'manguito-rotador-externo', nome: 'Manguito Rotador Externo', cena: [['cabo', [.05, 1.05, -.8], 'maoR'], ['coluna', .05, -.85]], cam: { ang: 60 },
    A: { shR: [0, 6, -30], elR: 90 }, B: { shR: [0, 6, 75], elR: 90 } },
  // ---------------- OUTROS ----------------
  { id: 'double-db-snatch', nome: 'Double DB Snatch', cena: [['halteres']],
    A: m({ root: PE(45) }, ambos('hp', [70, 12, 0]), ambos('kn', 75), braco([38, 14, 0], 0)), B: m({ root: PE(0) }, ambos('hp', [0, 12, 0]), braco([178, 14, 0], 0), ambos('an', -10)) },
  { id: 'kettlebell-swing', nome: 'Kettlebell swing', cena: [['kettle']],
    A: m({ root: PE(62) }, ambos('hp', [68, 16, 0]), ambos('kn', 30), braco([45, 2, 0], 0)), B: m({ root: PE(-4) }, ambos('hp', [-2, 16, 0]), braco([92, 2, 0], 0)) },
  // ---------------- PANTURRILHA ----------------
  { id: 'panturrilha-leg-press-horizontal', cam: { zoom: .82 }, nome: 'Panturrilha no Leg Press Horizontal', cena: [['caixa', [-.2, .35, 0], [.6, .1, .5]], ['caixa', [-.48, .7, 0], [.08, .7, .5], undefined, [0, 0, 25]], ['placaPes', 'R']],
    A: m({ root: { p: [0, .48, 0], r: [0, 0, 65] } }, ambos('hp', [30, 8, 0]), ambos('an', 30), braco([5, 25, 0], 20)), B: m({ root: { p: [0, .48, 0], r: [0, 0, 65] } }, ambos('hp', [30, 8, 0]), ambos('an', -28), braco([5, 25, 0], 20)) },
  { id: 'panturrilha-sentado', nome: 'Panturrilha Sentado Máquina', cena: [['assentoRaiz', -.05, -.16, [.42, .06, .4]], ['assentoRaiz', -.1, -.4, [.1, .45, .1]], ['caixa', [.42, .05, 0], [.25, .1, .4]]],
    A: m({ root: { p: [0, null, 0], r: [0, 0, 0] } }, pernasSent, ambos('an', 18), braco([40, 10, 0], 50)), B: m({ root: { p: [0, null, 0], r: [0, 0, 0] } }, pernasSent, ambos('an', -30), braco([40, 10, 0], 50)) },
  // ---------------- PEITO ----------------
  { id: 'crucifixo-inverso-halteres', nome: 'Crucifixo Inverso com Halteres', cena: [['halteres']],
    A: m({ root: PE(65), shOrd: 'ZXY' }, ambos('hp', [70, 8, 0]), ambos('kn', 20), braco([65, 5, 0], 12)), B: m({ root: PE(65), shOrd: 'ZXY' }, ambos('hp', [70, 8, 0]), ambos('kn', 20), braco([65, 80, 0], 15)) },
  { id: 'supino-inclinado-baixo', nome: 'Supino com Halteres Inclinado Baixo', cena: [['caixa', [-.2, .25, 0], [.9, .5, .32]], ['caixa', [-.55, .6, 0], [.75, .08, .32], undefined, [0, 0, -18]], ['halteres']],
    A: m({ root: SUP(.6, 72) }, pesNoBanco, braco([90, 14, 0], 2)), B: m({ root: SUP(.6, 72) }, pesNoBanco, braco([8, 72, 0], 95)) },
  { id: 'supino-reto-barra', nome: 'Supino Reto com Barra Reta', cena: [banco(), ['caixa', [-.42, .65, -.55], [.06, 1.3, .06]], ['caixa', [-.42, .65, .55], [.06, 1.3, .06]], ['barra', 1.6, .18]],
    A: m({ root: SUP(.55) }, pesNoBanco, braco([90, 20, 0], 2)), B: m({ root: SUP(.55) }, pesNoBanco, braco([8, 74, 0], 95)) },
  // ---------------- POSTERIOR ----------------
  { id: 'mesa-flexora-unilateral', cam: { zoom: .82 }, nome: 'Mesa Flexora Unilateral com Parciais', cena: [['caixa', [.15, .4, 0], [1.4, .1, .45]], ['caixa', [.15, .2, 0], [.2, .4, .2]]],
    A: m({ root: PRONO(.58) }, braco([160, 10, 0], 60)), B: m({ root: PRONO(.58) }, braco([160, 10, 0], 60), { knR: 110 }) },
  { id: 'stiff-kettlebell', nome: 'Stiff com kettlebell', cena: [['kettle']],
    A: m({ root: PE(0) }, ambos('hp', [0, 8, 0]), ambos('kn', 8), braco([2, 2, 0], 0)), B: m({ root: PE(72) }, ambos('hp', [74, 8, 0]), ambos('kn', 18), braco([68, 2, 0], 0)) },
  // ---------------- QUADRÍCEPS ----------------
  { id: 'afundo-alternado-step', nome: 'Afundo alternado no Step', cena: [['stepSob', 'L'], ['stepSob', 'R']],
    poses: [m(braco([4, 12, 0], 10)), m({ root: { p: [.3, null, 0], r: [0, 0, 0] }, apoio: ['toeL'] }, { hpR: [88, 4, 0], knR: 92, hpL: [-28, 4, 0], knL: 55, anL: -55 }, braco([4, 12, 0], 10)),
      m(braco([4, 12, 0], 10)), m({ root: { p: [.3, null, 0], r: [0, 0, 0] }, apoio: ['toeR'] }, { hpL: [88, 4, 0], knL: 92, hpR: [-28, 4, 0], knR: 55, anR: -55 }, braco([4, 12, 0], 10))] },
  { id: 'agachamento-remada-alta-kb', nome: 'Agachamento com Remada Alta Kettlebell', cena: [['kettle']],
    poses: [m({ shOrd: 'XYZ' }, ambos('hp', [0, 18, 15]), braco([0, 3, -90], 0)), m({ root: PE(20), shOrd: 'XYZ' }, ambos('hp', [110, 22, 15]), ambos('kn', 115), ambos('an', 25), braco([0, 3, -90], 0)),
      m({ shOrd: 'XYZ' }, ambos('hp', [0, 18, 15]), braco([0, 3, -90], 0)), m({ shOrd: 'XYZ' }, ambos('hp', [0, 18, 15]), braco([0, 80, -90], 130))] },
  { id: 'agachamento-isometrico', nome: 'Agachamento Isométrico (na parede)', cena: [['caixa', [-.34, 1.0, 0], [.06, 2.0, 1.2], 0x48484e]],
    A: m({ root: { p: [-.16, null, 0], r: [0, 0, 0] } }, ambos('hp', [88, 8, 0]), ambos('kn', 88), braco([0, 10, 0], 20)), B: m({ root: { p: [-.16, null, 0], r: [0, 0, 0] } }, ambos('hp', [92, 8, 0]), ambos('kn', 92), braco([0, 10, 0], 20)) },
  { id: 'agachamento-lateral-alternado', nome: 'Agachamento Lateral Alternado', cam: { ang: 20 },
    poses: [m({ root: FRENTE }, braco([60, 10, 0], 70)),
      m({ root: { p: [.15, null, 0], r: [0, -90, 0] }, sp: [0, 0, 22] }, { hpR: [90, 30, 0], knR: 100, hpL: [8, 45, 0], knL: 0, anL: 15 }, braco([85, 10, 0], 60)),
      m({ root: FRENTE }, braco([60, 10, 0], 70)),
      m({ root: { p: [-.15, null, 0], r: [0, -90, 0] }, sp: [0, 0, 22] }, { hpL: [90, 30, 0], knL: 100, hpR: [8, 45, 0], knR: 0, anR: 15 }, braco([85, 10, 0], 60))] },
  { id: 'agachamento-sumo-maquina', nome: 'Agachamento sumô máquina', cena: [['caixa', [.5, .55, 0], [.08, 1.1, .5]], ['caixa', [.32, 1.0, 0], [.4, .05, .5]]],
    A: m(ambos('hp', [0, 26, 25]), braco([45, 10, 0], 60), ambos('an', 0)), B: m({ root: PE(15) }, ambos('hp', [100, 34, 30]), ambos('kn', 105), ambos('an', 22), braco([70, 10, 0], 40)) },
  { id: 'flexao-nordica-reversa', cam: { zoom: .82 }, nome: 'Flexão Nórdica Reversa', cena: [colchonete],
    A: m({ root: { p: [0, .5, 0], r: [0, 0, 0] } }, ambos('kn', 90), ambos('an', -60), braco([20, 10, 0], 90)),
    B: m({ root: { p: [-.21, .44, 0], r: [0, 0, 30] } }, ambos('kn', 120), ambos('an', -60), braco([20, 10, 0], 90)) },
];
// nome do exercício na biblioteca → arquivo
export const MAPA_NOVO = [
  ['Rosca Direta Barra Reta', 'rosca-direta-barra'], ['Rosca Scott maquina', 'rosca-scott-maquina'], ['Tríceps Banco com Pernas Esticadas', 'triceps-banco'],
  ['Triceps Paralela Máquina (Pegada Pronada)', 'triceps-paralela-maquina'], ['Tríceps Testa com Barra W', 'triceps-testa-barra-w'], ['Abdominal Barra', 'abdominal-barra'],
  ['Abdominal Canivete', 'abdominal-canivete'], ['Abdominal flexão lateral solo', 'abdominal-flexao-lateral'], ['Abdominal Infra Solo', 'abdominal-infra-solo'],
  ['Abdominal Máquina', 'abdominal-maquina'], ['Abdominal Remador', 'abdominal-remador'], ['Prancha Isometrica Lateral Baixa', 'prancha-lateral-baixa'],
  ['Prancha Peso Alternando', 'prancha-peso-alternando'], ['Barra fixa no Graviton', 'barra-graviton'], ['Pulldown Polia Dupla', 'pulldown-polia-dupla'],
  ['Puxada Fechada barra reta', 'puxada-fechada-barra'], ['Remada Alta na Polia Baixa com Barra Reta', 'remada-alta-polia'], ['Remada Alta com Barra W', 'remada-alta-barra-w'],
  ['Abdução de Quadril Máquina com Corpo a Frente', 'abducao-tronco-frente'], ['Ativação de glúteos deitado com pernas flexionadas', 'ativacao-gluteo-deitado'],
  ['Pull-through na polia', 'pull-through-polia'], ['Agachamento Cossaco (mobilidade)', 'agachamento-cossaco'], ['Alongamento de Posteriores', 'alongamento-posteriores'],
  ['Mobilidade de quadril', 'mobilidade-quadril'], ['Bíceps mais desenvolvimento', 'biceps-desenvolvimento'], ['Elevação Frontal com Halteres', 'elevacao-frontal-halteres'],
  ['Elevação Frontal na Polia Baixa (Pegada Pronada)', 'elevacao-frontal-polia-barra'], ['Elevação Frontal na Polia com Corda', 'elevacao-frontal-polia-corda'],
  ['Manguito Rotador Externo', 'manguito-rotador-externo'], ['Double DB Snatch', 'double-db-snatch'], ['Kettlebell swing', 'kettlebell-swing'],
  ['Panturrilha no Leg Press Horizontal', 'panturrilha-leg-press-horizontal'], ['Panturrilha Sentado Máquina', 'panturrilha-sentado'],
  ['Crucifixo Inverso com Halteres', 'crucifixo-inverso-halteres'], ['Supino com Halteres Inclinado Baixo', 'supino-inclinado-baixo'], ['Supino Reto com Barra Reta', 'supino-reto-barra'],
  ['Mesa Flexora Unilateral com Parciais', 'mesa-flexora-unilateral'], ['Stiff com kettlebell', 'stiff-kettlebell'], ['Afundo alternado no Step', 'afundo-alternado-step'],
  ['Agachamento com Remada Alta Ketlebell', 'agachamento-remada-alta-kb'], ['Agachamento Isométrico', 'agachamento-isometrico'], ['Agachamento Lateral Alternado', 'agachamento-lateral-alternado'],
  ['Agachamento sumô máquina', 'agachamento-sumo-maquina'], ['Flexão Nórdica Reversa', 'flexao-nordica-reversa'],
];
