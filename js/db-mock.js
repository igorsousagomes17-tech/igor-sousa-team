// Modo DEMO: mesma interface do db.js, dados fictícios em memória (nada é enviado).
const LS = { get(k, d = null) { try { const v = localStorage.getItem('demo:' + k); return v ? JSON.parse(v) : d; } catch { return d; } }, set(k, v) { try { localStorage.setItem('demo:' + k, JSON.stringify(v)); } catch {} }, del(k) { try { localStorage.removeItem('demo:' + k); } catch {} } };
export { LS };
const wait = (ms = 120) => new Promise(r => setTimeout(r, ms));
const id = () => Math.random().toString(36).slice(2, 10);
const iso = (d) => new Date(d).toISOString();
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(7, 30); return d; };

const ex = (ordem, nome, series, reps, descanso_s, extra = {}) => ({ id: id(), ordem, nome, series, reps, descanso_s, video_url: null, ...extra });
const PLANO = { id: 'p1', mes: new Date(new Date().setDate(1)).toISOString().slice(0, 10), titulo: 'Treino mensal', obs: 'Mês de carga. Anota tudo!', treinos: [
  { id: 't1', letra: 'A', nome: 'Inferior · glúteo e quadríceps', duracao_min: 40, ordem: 0, exercicios: [ex(1, 'Mobilidade quadril 90/90', 1, '1 min cada', 0, { dica: 'mobilidade antes de tudo' }), ex(2, 'Agachamento no Smith', 4, '10', 60, { dica: 'pé na largura do quadril', alternativa: 'Agachamento livre' }), ex(3, 'Agachamento goblet (calcanhar elevado)', 3, '12', 60, { biset_com: 2 }), ex(4, 'Elevação pélvica', 4, '12', 60, { dica: 'segura 1s em cima' }), ex(5, 'Búlgaro com halter', 3, '10 cada', 60), ex(6, 'Cadeira extensora', 3, '15', 45), ex(7, 'HIIT na bike', 1, '10 min', 0, { dica: '30s forte / 30s leve' })] },
  { id: 't2', letra: 'B', nome: 'Superior · costas e ombro', duracao_min: 40, ordem: 1, exercicios: [ex(1, 'Puxada alta', 4, '10', 60), ex(2, 'Remada baixa', 3, '12', 60), ex(3, 'Elevação lateral', 3, '15', 45), ex(4, 'Dead bug', 3, '10 cada', 30), ex(5, 'Prancha', 3, '30s', 30)] },
  { id: 't3', letra: 'C', nome: 'Inferior · posterior e glúteo', duracao_min: 40, ordem: 2, exercicios: [ex(1, 'Mobilidade de tornozelo', 1, '1 min', 0), ex(2, 'Mesa flexora', 4, '12', 60), ex(3, 'Elevação pélvica', 4, '10', 60), ex(4, 'Abdução na máquina', 3, '20', 45), ex(5, 'Passada', 3, '12 cada', 60)] },
  { id: 't4', letra: 'D', nome: 'Superior · peito, braço e core', duracao_min: 40, ordem: 3, exercicios: [ex(1, 'Supino na máquina', 4, '10', 60), ex(2, 'Rosca direta', 3, '12', 45), ex(3, 'Tríceps na paralela', 3, '12', 45), ex(4, 'Abdominal infra', 3, '15', 30), ex(5, 'Prancha lateral', 3, '20s cada', 30)] }] };

const perfilDemo = { id: 'demo', role: 'aluna', nome: 'Ana Paula (demo)', whatsapp: '62999990000', objetivo: 'Emagrecer', dias_semana: 4, local_treino: 'academia', limitacoes: 'atenção lombar', peso_kg: 64.2, altura_m: 1.65, ativa: true, pontos: 1240, cod_indicacao: 'ANA4F2', created_at: iso(daysAgo(95)) };
let state = LS.get('state') || { logado: false, perfil: perfilDemo, sessoes: [
  ...[1, 2, 4, 6, 8, 9, 11, 13, 15, 16, 18, 20, 22, 23, 25, 27, 29, 31, 34, 36, 38, 40, 43, 45, 47, 50, 52, 55, 58, 61, 64, 67].map((n, i) => ({ id: 's' + i, titulo: 'Treino ' + 'ABCD'[i % 4], finalizada_em: iso(daysAgo(n)), duracao_s: 2100 + (i % 5) * 120, exercicios_feitos: 7, exercicios_total: 7, esforco: 6 + (i % 3), nota: 8 + (i % 2), comentario: i === 1 ? 'senti a lombar no búlgaro' : null, resposta_igor: i === 1 ? 'Vi que sentiu a lombar no búlgaro. Na próxima faz com a perna de trás mais baixa, te mando o vídeo.' : null }))],
  pontos: [{ motivo: 'treino', pontos: 50, created_at: iso(daysAgo(1)) }, { motivo: 'story', pontos: 30, created_at: iso(daysAgo(1)) }, { motivo: 'semana', pontos: 100, created_at: iso(daysAgo(3)) }, { motivo: 'evolucao', pontos: 80, created_at: iso(daysAgo(20)) }],
  evolucao: [{ data: daysAgo(92).toISOString().slice(0, 10), peso_kg: 68, cintura_cm: 77 }, { data: daysAgo(20).toISOString().slice(0, 10), peso_kg: 64.2, cintura_cm: 72 }], series: [] };
const save = () => LS.set('state', state);

export const sb = { auth: { onAuthStateChange() {}, async getSession() { return { data: { session: null } }; } }, from() { return { select() { return this; }, eq() { return this; }, async single() { return { data: state.perfil }; } }; }, async rpc() { return { data: 'ana@gmail.com' }; } };
export async function sessionUser() { return state.logado ? { id: 'demo' } : null; }
export async function login(email, senha) { await wait(400); if (!email) throw new Error('x'); state.logado = true; state.perfil.role = /igor/i.test(email) ? 'admin' : 'aluna'; state.perfil.nome = /igor/i.test(email) ? 'Igor Sousa' : perfilDemo.nome; save(); return { id: 'demo' }; }
export async function logout() { state.logado = false; save(); }
export async function trocarSenha() { await wait(); }
export async function esqueciSenha() { await wait(); }
export async function perfil() { return state.perfil; }
export async function salvarPerfil(p) { Object.assign(state.perfil, p); save(); return state.perfil; }
export async function planoAtual() { return PLANO; }
export async function programas() { return [
  { slug: 'corrida', titulo: 'Fortalecimento pra corrida', subtitulo: '8 treinos · 25 min', capa_url: 'icons/corrida_s.jpg', programa_treinos: [{ id: 'pc1', nome: 'Base 1 · pernas e core', duracao_min: 25, exercicios: [{ nome: 'Agachamento búlgaro', series: 3, reps: '10 cada', descanso_s: 45 }, { nome: 'Elevação de panturrilha unilateral', series: 3, reps: '15 cada', descanso_s: 30 }, { nome: 'Ponte unilateral', series: 3, reps: '12 cada', descanso_s: 30 }, { nome: 'Prancha com toque no ombro', series: 3, reps: '20', descanso_s: 30 }] }] },
  { slug: 'abdomen', titulo: 'Abdômen 10 min', subtitulo: '6 treinos', capa_url: 'icons/abdomen_s.jpg', programa_treinos: [{ id: 'pa1', nome: 'Abdômen 1', duracao_min: 10, exercicios: [{ nome: 'Dead bug', series: 3, reps: '10 cada', descanso_s: 20 }, { nome: 'Prancha', series: 3, reps: '30s', descanso_s: 20 }, { nome: 'Abdominal infra', series: 3, reps: '15', descanso_s: 20 }] }] },
  { slug: 'mobilidade', titulo: 'Mobilidade', subtitulo: '5 rotinas · 8 min', capa_url: 'icons/mobilidade_s.jpg', programa_treinos: [{ id: 'pm1', nome: 'Quadril e lombar', duracao_min: 8, exercicios: [{ nome: '90/90', series: 2, reps: '1 min cada', descanso_s: 0 }, { nome: 'Gato-camelo', series: 2, reps: '10', descanso_s: 0 }, { nome: 'Alongamento do piriforme', series: 2, reps: '45s cada', descanso_s: 0 }] }] },
  { slug: 'casa', titulo: 'Treino em casa', subtitulo: '4 treinos · sem aparelho', capa_url: 'icons/casa_s.jpg', programa_treinos: [] }]; }
export async function recadoAtual() { return { texto: '"Essa semana é de carga. Anota tudo!" · 0:32', midia_url: null }; }
export async function desafioAtual() { return { titulo: 'Desafio do mês', meta_treinos: 16, pontos_bonus: 200 }; }
export async function iniciarSessao(_, { treino_id, programa_treino_id, titulo, total }) { const s = { id: 's' + id(), titulo, exercicios_total: total, finalizada_em: null }; state.sessoes.unshift(s); save(); return s; }
export async function salvarSeries(sessaoId, rows) { state.series.push(...rows.map(r => ({ ...r, sessao_id: sessaoId }))); save(); }
export async function finalizarSessao(sessaoId, patch) { const s = state.sessoes.find(x => x.id === sessaoId); Object.assign(s, patch, { finalizada_em: iso(new Date()) }); state.perfil.pontos += 50; state.pontos.unshift({ motivo: 'treino', pontos: 50, created_at: iso(new Date()) }); save(); return s; }
export async function ultimaCarga(_, nome) { const r = [...state.series].reverse().find(x => x.exercicio_nome === nome && x.kg); return r || (nome === 'Agachamento no Smith' ? { kg: 28, reps: 10 } : null); }
export async function minhasSessoes() { return state.sessoes.filter(s => s.finalizada_em); }
export async function registrarPontos(_, motivo, pontos, ref) { if (state.pontos.find(p => p.motivo === motivo && p.ref === ref)) return false; state.pontos.unshift({ motivo, pontos, ref, created_at: iso(new Date()) }); state.perfil.pontos += pontos; save(); return true; }
export async function meusPontos() { return state.pontos; }
export async function evolucao() { return state.evolucao; }
export async function salvarEvolucao(_, row, file) { const r = { ...row }; if (file) r.foto_path = URL.createObjectURL(file); state.evolucao = state.evolucao.filter(e => e.data !== row.data).concat(r).sort((a, b) => a.data.localeCompare(b.data)); save(); return r; }
export async function fotoUrl(p) { return p && p.startsWith('blob:') ? p : null; }
export const admin = {
  async alunas() { return [['Marcela D.', 0, 16, 2100], ['Ludimila M.', 1, 15, 1900], ['Ana Paula', 1, 14, 1240], ['Lorena S.', 4, 6, 420], ['Patrícia M.', 6, 3, 310], ['Fabiana R.', 9, 1, 150], ['Nova aluna', 999, 0, 0]].map(([nome, d, m, pts], i) => ({ id: 'a' + i, nome, whatsapp: '62999990000', ativa: i !== 6 || true, pontos: pts, dias_semana: 4, ultimo_treino: d === 999 ? null : iso(daysAgo(d)), dias_sem_treinar: d, treinos_mes: m })); },
  async feedbacks() { return [{ id: 'f1', titulo: 'Treino A', finalizada_em: iso(new Date()), esforco: 7, nota: 9, comentario: 'senti a lombar no búlgaro', resposta_igor: null, profiles: { nome: 'Ana Paula' } }, { id: 'f2', titulo: 'Treino C', finalizada_em: iso(daysAgo(1)), esforco: 5, nota: 8, comentario: 'tá leve, sobe carga', resposta_igor: 'Bora subir 2 kg na mesa flexora então!', profiles: { nome: 'Marcela D.' } }]; },
  async responder() { await wait(); }, async anamneses() { return []; }, async planoDe() { return PLANO; }, async salvarPlano() { await wait(); }, async publicarRecado() { await wait(); }, async setAtiva() { await wait(); }
};
