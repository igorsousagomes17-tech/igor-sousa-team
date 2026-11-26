// Teste sem navegador (26/11): regra dos feedbacks "pra responder" × "só 👏" e do alerta de saúde das anamneses no painel.
// node tests/feedbacks-saude.mjs
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/admin.js', import.meta.url), 'utf8');
const pega = nome => { const l = src.split('\n').find(x => x.startsWith(`const ${nome} =`)); if (!l) throw new Error('não achei ' + nome); return l; };
const nomes = ['precisa', 'escrever', 'soAplauso', 'APLAUSO', 'SAUDE_SERIO', 'SAUDE_CUIDADO', 'alertaSaude', 'cuidadosSaude', 'vistoKey', 'saudeVista', 'marcarSaudeVista', 'alertaPendente'];
const mem = {}; const db = { LS: { get: (k, d) => mem[k] ?? d, set: (k, v) => { mem[k] = v; } } };
const F = new Function('db', nomes.map(pega).join('\n') + `\nreturn { ${nomes.join(', ')} };`)(db);
let falhas = 0; const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) falhas++; };

// Feedbacks
const semTexto = { esforco: 10, nota: 8, comentario: null, resposta_igor: null };
const comTexto = { esforco: 10, nota: 10, comentario: 'treino matador', resposta_igor: null };
const notaBaixa = { esforco: 6, nota: 2, comentario: '', resposta_igor: null };
const respondido = { esforco: 10, nota: 8, comentario: null, resposta_igor: '👏' };
ok(F.soAplauso(semTexto) && !F.escrever(semTexto), '"No limite" sem texto vai pro 👏 (não conta como pra responder)');
ok(F.escrever(comTexto) && !F.soAplauso(comTexto), 'com texto: pra responder');
ok(F.escrever(notaBaixa), 'nota baixa sem texto: pra responder');
ok(!F.precisa(respondido) && !F.soAplauso(respondido), 'depois do 👏 sai da contagem');

// Anamnese
const nenhuma = { id: 'a', anamnese_em: '2026-11-01', saude: ['Nenhuma'], gestacao: 'nao' };
const remedio = { id: 'b', anamnese_em: '2026-11-01', saude: ['Tomo medicação contínua', 'Asma'], gestacao: 'pos_parto' };
const cirurgia = { id: 'c', anamnese_em: '2026-11-01', saude: ['Cirurgia (estética ou de saúde) no último ano', 'Pressão alta', 'Diabetes'], gestacao: 'nao' };
const peito = { id: 'd', anamnese_em: '2026-11-01', saude: ['Dor no peito quando faço esforço'], gestacao: 'nao' };
const gravida = { id: 'e', anamnese_em: '2026-11-01', saude: ['Nenhuma'], gestacao: 'gravida' };
const medico = { id: 'f', anamnese_em: '2026-11-01', saude: ['Médico disse pra só treinar com acompanhamento'] };
const nd = { id: 'g', anamnese_em: '2026-11-01', saude: [], gestacao: 'nd' };
ok(!F.alertaSaude(nenhuma) && !F.alertaSaude(nd), 'sem nada (ou gestação "prefere não dizer"): sem alerta');
ok(!F.alertaSaude(remedio) && F.cuidadosSaude(remedio).join() === 'Tomo medicação contínua,Asma,Pós-parto', 'medicação, asma, pós-parto: só "cuidado" na ficha');
ok(!F.alertaSaude(cirurgia) && F.cuidadosSaude(cirurgia).length === 3, 'cirurgia, pressão, diabetes: só "cuidado" na ficha');
ok(F.alertaSaude(peito) && F.alertaSaude(gravida) && F.alertaSaude(medico), 'dor no peito, grávida, médico pediu acompanhamento: alerta');
ok(F.alertaPendente(peito), 'alerta conta no painel antes de ver');
F.marcarSaudeVista(peito);
ok(!F.alertaPendente(peito) && F.alertaSaude(peito), '"Já vi" tira do contador, mas a ficha continua mostrando');
ok(F.alertaPendente({ ...peito, anamnese_em: '2026-12-01' }), 'se ela refizer a anamnese, o alerta volta');
ok(!F.alertaSaude(null) && !F.alertaPendente(undefined), 'sem anamnese: sem alerta');

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
process.exit(falhas ? 1 : 0);
