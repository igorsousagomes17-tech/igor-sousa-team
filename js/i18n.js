import { traduzConteudo, traduzLivre, ligarTradutor } from './conteudo.js';
export { ligarTradutor };
// Idiomas do app da aluna: português (padrão), inglês, espanhol, chinês simplificado, hindi e francês.
// A chave de cada texto é o próprio português, então o código continua legível: t('Iniciar treino').
// Partes que mudam vão entre chaves: t('Bora, {nome}?', { nome }). Plural: tp(n, '{n} treino', '{n} treinos').
// O que o Igor digita (nomes de exercício, dicas, recados, nomes de treino/programa) continua em português.
export const IDIOMAS = [
  { id: 'pt', flag: '🇧🇷', nome: 'Português', loc: 'pt-BR' },
  { id: 'en', flag: '🇺🇸', nome: 'English', loc: 'en-US' },
  { id: 'es', flag: '🇪🇸', nome: 'Español', loc: 'es-ES' },
  { id: 'zh', flag: '🇨🇳', nome: '中文', loc: 'zh-CN' },
  { id: 'hi', flag: '🇮🇳', nome: 'हिन्दी', loc: 'hi-IN' },
  { id: 'fr', flag: '🇫🇷', nome: 'Français', loc: 'fr-FR' }
];
const COL = { en: 0, es: 1, zh: 2, hi: 3, fr: 4 };
const existe = id => IDIOMAS.some(i => i.id === id);

// 1º o que ela escolheu no app; senão o idioma do celular; senão português.
function detectar() {
  try { const s = localStorage.getItem('idioma'); if (existe(s)) return s; } catch {}
  const ls = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
  for (const l of ls) { const b = String(l || '').toLowerCase().split('-')[0]; if (existe(b)) return b; }
  return 'pt';
}
let atual = detectar();
const aplicar = () => { document.documentElement.lang = { pt: 'pt-BR', zh: 'zh-Hans' }[atual] || atual; };
aplicar();

export const idioma = () => atual;
export const infoIdioma = (id = atual) => IDIOMAS.find(i => i.id === id);
export async function setIdioma(id) {
  if (!existe(id)) return;
  await carregarIdioma(id);
  atual = id; try { localStorage.setItem('idioma', id); } catch {}
  aplicar();
}
// Locale das datas/números: usa a região do celular quando bate com o idioma (en-AU, en-IE, es-MX...).
export function loc(id = atual) {
  const n = navigator.language || '';
  if (id !== 'zh' && id !== 'pt' && n.toLowerCase().startsWith(id + '-')) return n;
  return infoIdioma(id).loc;
}
// Textos que ainda não têm tradução (o teste de idiomas acusa se aparecer algum na tela).
const faltando = new Set();
try { window.__i18nFaltando = faltando; } catch {}
const troca = (s, v) => v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m) : s;
export function tl(id, pt, v) {
  pt = String(pt ?? '');
  if (id === 'pt' || !pt.trim() || !/\p{L}/u.test(pt)) return liga(id, troca(pt, v));
  const x = D[id]?.[pt];
  if (!x) { faltando.add(pt); return troca(pt, v); }
  return liga(id, troca(x, v));
}
// Número colado na unidade (40 min, 30 s, 25 kg) e, no francês, ? ! : ; colados na palavra (espaço que não quebra a linha)
const liga = (id, s) => { s = s.replace(/(\d) (?=(min|s|kg|cm|pts|séances?|séries?|sets?|series)\b)/g, '$1\u00a0'); return id === 'fr' ? s.replace(/ ([?!:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0') : s; };
export const t = (pt, v) => tl(atual, pt, v);
// O que o Igor digita (treino, exercício, reps, dica): traduz na hora de mostrar (js/conteudo.js)
export const tc = s => traduzConteudo(s, atual);
// Recado, resposta e observação do Igor: frase inteira pela IA ou o português dele (nunca palavra a palavra)
export const tlivre = s => traduzLivre(s, atual);
export const num = (n, o) => typeof n === 'number' && isFinite(n) ? new Intl.NumberFormat(loc(), o).format(n) : String(n ?? '');
// Número com o separador decimal do idioma (64,5 / 64.5), sem separador de milhar.
export const dec = v => v == null || v === '' ? '' : (['pt', 'es', 'fr'].includes(atual) ? String(v).replace('.', ',') : String(v).replace(',', '.'));
// Plural pelas regras de cada língua (no português, igual ao app sempre fez: 1 = singular).
export function tp(n, um, varios, v) {
  const one = atual === 'pt' ? n === 1 : new Intl.PluralRules(loc()).select(n) === 'one';
  return t(one ? um : varios, { n: num(n), ...v });
}
export const dataLocal = (d, o) => new Date(d).toLocaleDateString(loc(), o);

// DICIONÁRIO: 'texto em português': [inglês, espanhol, chinês, hindi, francês]
// Dicionário de cada idioma em js/i18n/<id>.js (gerado de js/i18n-fonte.js por tools/i18n-gerar.mjs): só baixa o idioma em uso
const D = {};
export async function carregarIdioma(id) { if (id === 'pt' || !existe(id) || D[id]) return; try { D[id] = (await import(`./i18n/${id}.js`)).default; } catch { /* sem sinal e sem cache: fica em português até voltar */ } }
await carregarIdioma(atual);

