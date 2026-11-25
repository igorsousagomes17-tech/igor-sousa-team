// Testa o motor da atualização mensal automática (js/atualizacao.js), sem navegador:
//   node tests/atualizacao.mjs
// Sai com código 1 se alguma regra do Igor falhar.
import * as A from '../js/atualizacao.js';

let falhas = 0;
const ok = (cond, txt) => { if (cond) console.log('✓', txt); else { falhas++; console.log('✗', txt); } };

// ---------- datas: fecha no fim de semana, começa na segunda ----------
ok(A.fechamento('2026-11-25') === '2026-11-29', 'vence quarta 25/11 → fecha domingo 29/11');
ok(A.fechamento('2026-11-28') === '2026-11-28', 'vence sábado → fica no sábado');
ok(A.fechamento('2026-11-29') === '2026-11-29', 'vence domingo → fica no domingo');
ok(A.fechamento('2026-11-30') === '2026-12-06', 'vence segunda → estica até o domingo da semana');
ok(A.inicio('2026-11-28') === '2026-11-30' && A.inicio('2026-11-29') === '2026-11-30', 'sábado ou domingo → começa segunda 30/11');
ok(A.diaSemana(A.fimNovo('2026-11-30')) === 'domingo', 'treino novo de 4 semanas acaba num domingo');
const lote = A.loteDaSemana('2026-11-25');
ok(lote.fechamento === '2026-11-29' && lote.inicio === '2026-11-30' && lote.fim === '2026-12-27', 'lote da semana de 25/11: fecha 29/11, começa 30/11, vence 27/12');
ok(A.entraNoLote('2026-11-27', lote) && !A.entraNoLote('2026-12-02', lote), 'quem vence sexta entra no lote; quem vence quarta que vem fica pro outro');

// ---------- equipamento ----------
ok(A.equipamento('Agachamento goblet com halter') === 'halter', 'goblet = halter');
ok(A.equipamento('Cadeira extensora') === 'maquina' && A.equipamento('Leg press 45') === 'maquina', 'extensora e leg press = máquina');
ok(A.equipamento('Supino inclinado máquina') === 'maquina', 'supino máquina = máquina');
ok(A.equipamento('Remada curvada com halter') === 'halter', 'remada com halter = halter');

// ---------- base de teste ----------
const base = { mes: '2026-12-01', treinos: [
  { letra: 'A', nome: 'Inferior · quadríceps', duracao_min: 55, vagas: [
    { id: 'A1', opcoes: ['Mobilidade de tornozelo', 'Agachamento Cossaco'], series: 2, reps: '10', descanso_s: 30 },
    { id: 'A2', opcoes: ['Leg press 45', 'Agachamento goblet com halter', 'Agachamento Hack'], series: 4, reps: '12/10/8', descanso_s: 90, metodos: ['pirâmide', 'cadência 2s na descida', 'rest-pause na última'] },
    { id: 'A3', opcoes: ['Búlgaro com halteres', 'Afundo com halteres', 'Passada com halteres'], series: 3, reps: '10', descanso_s: 60, metodos: ['normal', 'pausa embaixo'], reps_opcoes: ['10', '8-10', '12'] },
    { id: 'A4', opcoes: ['Cadeira extensora', 'Extensora unilateral'], series: 3, reps: '12', descanso_s: 60, metodos: ['drop na última', 'isometria 3s'], biset_com: 'A5' },
    { id: 'A5', opcoes: ['Agachamento sumô com halter', 'Cadeira flexora'], series: 3, reps: '12', descanso_s: 60 },
  ] },
  { letra: 'B', nome: 'Superior · costas e bíceps', duracao_min: 55, vagas: [
    { id: 'B1', opcoes: ['Prancha', 'Dead bug'], series: 3, reps: '30s', descanso_s: 30 },
    { id: 'B2', opcoes: ['Abdominal infra', 'Abdominal na polia'], series: 3, reps: '15', descanso_s: 30 },
    { id: 'B3', opcoes: ['Puxada aberta', 'Remada curvada com halter', 'Remada serrote com halter'], series: 4, reps: '10-12', descanso_s: 60, metodos: ['normal', 'a cada 3 reps segura 3s', 'drop na última'] },
    { id: 'B4', opcoes: ['Rosca direta com halteres', 'Rosca martelo com halteres', 'Rosca Scott máquina'], series: 3, reps: '12', descanso_s: 45, metodos: ['normal', 'pico de contração'] },
  ] },
] };
const autorizados = ['Agachamento goblet com halter', 'Búlgaro com halteres', 'Afundo com halteres', 'Passada com halteres', 'Agachamento sumô com halter',
  'Remada curvada com halter', 'Remada serrote com halter', 'Rosca direta com halteres', 'Rosca martelo com halteres', 'Agachamento Hack', 'Cadeira flexora', 'Extensora unilateral', 'Dead bug', 'Mobilidade de tornozelo', 'Flexão de braço']
  .map(nome => ({ nome, origem: 'app' }));

// Aluna de academia de prédio: só halter, prancha, abdominal; o histórico do Mfit dela não tem máquina
const predio = { id: 'u-predio', nome: 'Aluna Prédio' };
const ctxPredio = A.contexto({ historico: ['Prancha', 'Abdominal infra', 'Agachamento goblet com halter', 'Búlgaro com halteres', 'Rosca direta com halteres', 'Agachamento Cossaco'], autorizados });
const rp = A.montarDaAluna(base, predio, ctxPredio);
const nomesP = rp.treinos.flatMap(t => t.exercicios.map(e => e.nome));
ok(!nomesP.some(n => A.equipamento(n) === 'maquina'), 'aluna de prédio: nenhuma máquina entrou (' + nomesP.join(', ') + ')');
ok(A.conferirAcrescimos(rp.treinos, ctxPredio).length === 0, 'aluna de prédio: tudo é dela ou acréscimo com halter autorizado');
ok(nomesP.includes('Agachamento goblet com halter') && nomesP.includes('Búlgaro com halteres'), 'aluna de prédio: manteve os exercícios que ela já faz');
ok(!nomesP.includes('Agachamento Hack'), 'Hack é autorizado mas é máquina: não entra como novo');
ok(ctxPredio.pode('Mobilidade de tornozelo').ok && ctxPredio.pode('Dead bug').ok, 'mobilidade e abdômen sem aparelho autorizados entram como novidade (Igor, 25/11)');
ok(!ctxPredio.pode('Flexão de braço').ok, 'peso do corpo fora de mobilidade/abdômen continua não entrando novo');
const semMob = A.montarDaAluna(base, { id: 'u-sem-mob' }, A.contexto({ historico: ['Prancha', 'Abdominal infra', 'Agachamento goblet com halter'], autorizados }));
ok(!semMob.avisos.some(a => /sem mobilidade/.test(a)), 'aluna sem mobilidade no histórico ganha mobilidade nova');

// Aluna de academia comum, que já faz máquinas
const comum = { id: 'u-comum', nome: 'Aluna Comum' };
const ctxComum = A.contexto({ historico: ['Leg press 45', 'Cadeira extensora', 'Cadeira flexora', 'Puxada aberta', 'Prancha', 'Abdominal infra', 'Mobilidade de tornozelo', 'Rosca Scott máquina'], autorizados });
const rc = A.montarDaAluna(base, comum, ctxComum);
ok(A.conferirAcrescimos(rc.treinos, ctxComum).length === 0, 'aluna comum: máquina só se ela já faz');
const bi = rc.treinos[0].exercicios.find(e => e.vaga === 'A4');
ok(bi?.biset_com && A.equipamento(bi.biset_com) === 'halter', 'bi-set da extensora: o B é com halter (' + bi?.biset_com + '), nunca extensora + flexora');
ok(!rc.avisos.some(a => /duas máquinas/.test(a)), 'sem bi-set de duas máquinas');

// Mesmo sorteio no mesmo mês, e o mês passado é mantido
const rc2 = A.montarDaAluna(base, comum, ctxComum);
ok(JSON.stringify(rc.treinos) === JSON.stringify(rc2.treinos), 'mesma aluna + mesmo mês = mesmo treino (dá pra refazer sem mudar)');
const manter = A.montarDaAluna({ ...base, mes: '2027-01-01' }, comum, ctxComum, { assinatura: rc.assinatura });
const iguais = manter.treinos.flatMap(t => t.exercicios).filter(e => rc.assinatura.escolhas[e.vaga] === e.nome).length;
ok(iguais === manter.treinos.flatMap(t => t.exercicios).length, 'mês seguinte: mantém os exercícios do mês passado (só muda método/reps)');

// Amigas: a segunda evita o que a primeira tem
const amigaA = { id: 'u-amiga-a', nome: 'Amiga A' }, amigaB = { id: 'u-amiga-b', nome: 'Amiga B' };
const histAmigas = ['Leg press 45', 'Agachamento goblet com halter', 'Búlgaro com halteres', 'Afundo com halteres', 'Cadeira extensora', 'Extensora unilateral', 'Cadeira flexora', 'Agachamento sumô com halter', 'Prancha', 'Dead bug', 'Abdominal infra', 'Abdominal na polia', 'Puxada aberta', 'Remada curvada com halter', 'Rosca direta com halteres', 'Rosca martelo com halteres', 'Mobilidade de tornozelo', 'Agachamento Cossaco'];
const ctxAm = A.contexto({ historico: histAmigas, autorizados });
const ra = A.montarDaAluna(base, amigaA, ctxAm);
const semEvitar = A.montarDaAluna(base, { id: 'u-amiga-b' }, ctxAm);
const rb = A.montarDaAluna(base, amigaB, ctxAm, { evitar: A.chaves(ra.treinos) });
const pSem = A.parecido(ra.treinos, semEvitar.treinos), pCom = A.parecido(ra.treinos, rb.treinos);
ok(pCom <= A.LIMITE_AMIGAS, `amigas com o mesmo histórico: ${pCom}% igual (limite ${A.LIMITE_AMIGAS}%), sem a checagem dava ${pSem}%`);
const conf = A.conferirLote([{ aluna_id: 'a', treinos: ra.treinos }, { aluna_id: 'b', treinos: ra.treinos }], [['b', 'a']]);
ok(conf.alertas.length === 1 && conf.alertas[0].amiga && conf.alertas[0].pct === 100, 'treino idêntico entre amigas vira alerta');
ok(A.parecido(ra.treinos, rp.treinos) < 100, 'parecido mede diferença');

// Regras do Igor
const ruim = { letra: 'X', nome: 'Inferior', exercicios: [{ nome: 'Cadeira extensora', biset_com: 'Cadeira flexora' }, { nome: 'Cadeira flexora' }] };
const pr = A.regrasTreino(ruim);
ok(pr.some(p => /duas máquinas/.test(p)) && pr.some(p => /mobilidade/.test(p)), 'pega extensora + flexora no bi-set e inferior sem mobilidade');
ok(A.regrasTreino({ letra: 'Y', nome: 'Superior', exercicios: [{ nome: 'Prancha' }, { nome: 'Tríceps coice com halter' }] }).length === 2, 'pega superior com 1 core só e tríceps coice');

// Pagamento: só avisa
ok(A.pagamento({ nome: 'Ana', pago_ate: '2026-12-10' }, { hoje: '2026-11-25' }).status === 'pago', 'Kiwify em dia = pago');
ok(A.pagamento({ nome: 'Bia Lima', pago_ate: '2026-11-10' }, { hoje: '2026-11-25' }).status === 'pendente', 'Kiwify vencida = pendente');
ok(A.pagamento({ nome: 'Carla Souza' }, { hoje: '2026-11-25', pix: ['Carla Souza'] }).status === 'pago', 'achou no Pix = pago');
ok(A.pagamento({ nome: 'Dani Reis' }, { hoje: '2026-11-25' }).status === 'nao_achei', 'sem nada = não achei');

// Saída
const app = A.paraApp(rc.treinos, rc.ordem);
ok(app.length === 2 && app.every(t => t.exercicios.every(e => e.nome && e.series)), 'vira linhas do app');
ok(A.paraTexto(app).startsWith('# '), 'vira texto do editor (o mesmo que vai pro Mfit)');

// ---------- base de dezembro de verdade (supabase/bases/2026-12.json) ----------
import fs from 'fs';
const dez = JSON.parse(fs.readFileSync(new URL('../supabase/bases/2026-12.json', import.meta.url), 'utf8'));
const nomesDez = [...new Set(dez.treinos.flatMap(t => t.vagas.flatMap(v => v.opcoes)))];
ok(dez.treinos.length === 6 && dez.treinos.reduce((s, t) => s + t.vagas.length, 0) <= 60, 'base de dezembro: 6 dias e cabe no limite de 60 exercícios do Mfit');
ok(dez.treinos.every(t => { const s = t.vagas.reduce((a, v) => a + v.series, 0); return s >= 22 && s <= 28; }), 'base de dezembro: 22 a 28 séries por dia (treino de 50-60 min)');
const cheia = A.montarDaAluna(dez, { id: 'u-dez' }, A.contexto({ historico: nomesDez, autorizados: [] }));
ok(cheia.avisos.length === 0, 'base de dezembro: aluna que faz tudo sai sem aviso (mobilidade, 2 de core, bi-sets)' + (cheia.avisos.length ? ': ' + cheia.avisos.join(' | ') : ''));
ok(A.grupo('Agachamento Cossaco') === 'Mobilidade' && A.grupo('Agachamento Lateral Alternado') === 'Mobilidade', 'cossaco e agachamento lateral alternado contam como a mobilidade do dia');
ok(!A.regrasTreino({ letra: 'E', nome: 'Costas e bíceps (superior posterior)', exercicios: [{ nome: 'Pallof Press' }, { nome: 'Abdominal Infra Solo' }] }).length, '"superior posterior" é dia de superior, não de inferior');
const predioDez = A.montarDaAluna(dez, { id: 'u-predio-dez' }, A.contexto({ historico: nomesDez.filter(n => ['halter', 'peso_corpo', 'elastico', 'barra'].includes(A.equipamento(n))), autorizados: nomesDez.map(nome => ({ nome, origem: 'mfit' })) }));
ok(!predioDez.treinos.flatMap(t => t.exercicios).some(e => A.equipamento(e.nome) === 'maquina'), 'base de dezembro: aluna de prédio não recebe máquina');
ok(predioDez.treinos.some(t => t.exercicios.filter(e => e.nome === 'Stiff com Halteres').length) && predioDez.treinos.filter(t => t.exercicios.some(e => e.nome === 'Stiff com Halteres')).length >= 2, 'o mesmo exercício pode aparecer em dias diferentes (stiff no glúteo e no posterior)');

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
process.exit(falhas ? 1 : 0);
