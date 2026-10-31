// Animações provisórias (boneco 3D, vista lateral + 3/4) dos exercícios que ainda não têm vídeo do Igor.
// O vídeo do Igor (link do YouTube ou arquivo enviado na Biblioteca de exercícios) sempre tem prioridade.
const sem = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[°º]/g, '').replace(/\s+/g, ' ').trim();
const MAPA = [
  [/^agachamento sumo.*step/, 'agachamento-sumo-step'],
  [/^(levantamento )?(terra )?sumo|^levantamento terra sumo/, 'levantamento-sumo'],
  [/^(romanian|romenia|romeno|rdl|levantamento romeno|stiff romeno).*barra/, 'rdl-barra'],
  [/^(romanian|romenia|romeno|rdl|levantamento romeno|stiff romeno).*halter/, 'rdl-halter'],
  [/^stiff.*halter/, 'stiff-halter'],
  [/^levantamento terra(?!.*(sumo|romeno|hexagonal|trap))/, 'levantamento-terra'],
  [/^afundo com (o )?(pe (de tras )?no )?stept? (atras|de tras).*smith/, 'afundo-step-smith'],
  [/^afundo com (o )?(pe (de tras )?no )?stept? (atras|de tras)/, 'afundo-step-halter'],
  [/bulgaro.*smith/, 'bulgaro-smith'],
  [/bulgaro.*(goblet|halter (no peito|em cima|na frente)|segurando)/, 'bulgaro-goblet'],
  [/bulgaro.*barra/, 'bulgaro-barra'],
  [/bulgaro.*halter/, 'bulgaro-halter'],
  [/^agachamento (no )?pendulo/, 'agachamento-pendulo'],
  [/^agachamento goblet/, 'agachamento-goblet'],
  [/^agachamento frontal(?!.*smith)/, 'agachamento-frontal'],
  [/^afundo alternado (no |na )?smith/, 'afundo-alternado-smith'],
  [/^afundo (no |na )?smith/, 'afundo-smith'],
  [/^agachamento (no |guiado no |na )?smith/, 'agachamento-smith'],
  [/^agachamento hack/, 'agachamento-hack'],
  [/^agachamento (livre|com barra|livre com barra)/, 'agachamento-livre'],
  [/^leg ?press (45|inclinado)/, 'leg-press-45'],
  [/^leg ?press horizontal/, 'leg-press-horizontal'],
  [/^cadeira extensora(?!.*unilateral)/, 'cadeira-extensora'],
  [/^rosca direta (com |c\/ )?halter/, 'rosca-direta-halter'],
];
export const ANIM_LISTA = [
  ['Cadeira extensora', 'Quadríceps'], ['Agachamento hack', 'Quadríceps'], ['Agachamento livre com barra', 'Quadríceps'],
  ['Leg press 45', 'Quadríceps'], ['Leg press horizontal', 'Quadríceps'], ['Agachamento no smith', 'Quadríceps'],
  ['Afundo no smith', 'Glúteo'], ['Afundo alternado no smith', 'Glúteo'], ['Rosca direta com halter', 'Braços'],
  ['Agachamento pêndulo', 'Quadríceps'], ['Búlgaro no smith', 'Glúteo'], ['Búlgaro com halter', 'Glúteo'], ['Búlgaro com barra livre', 'Glúteo'],
  ['Búlgaro goblet (halter no peito)', 'Glúteo'], ['Agachamento goblet', 'Quadríceps'], ['Agachamento frontal', 'Quadríceps'],
  ['Afundo com step atrás no smith', 'Glúteo'], ['Afundo com step atrás com halter', 'Glúteo'],
  ['Agachamento sumô no step com halter', 'Glúteo'], ['Levantamento sumô com barra', 'Posterior'], ['Levantamento terra com barra', 'Posterior'],
  ['Stiff com halter', 'Posterior'], ['Romanian deadlift com halter', 'Posterior'], ['Romanian deadlift com barra', 'Posterior'],
];
export function animDe(nome) { const n = sem(nome); const m = MAPA.find(([rx]) => rx.test(n)); return m ? `./anim/${m[1]}.mp4` : null; }
export const ehAnim = url => /(^|\/)anim\/[a-z0-9-]+\.mp4$/.test(String(url || ''));
// Preenche o vídeo que falta com a animação (sem mexer no que o Igor já colocou)
export function comAnimacoes(plano) { plano?.treinos?.forEach(t => (t.exercicios || []).forEach(e => { if (!e.video_url) { const a = animDe(e.nome); if (a) e.video_url = a; } })); return plano; }
