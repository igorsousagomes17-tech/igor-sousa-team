// Gera js/i18n/<idioma>.js a partir de js/i18n-fonte.js (rodar depois de acrescentar/mudar tradução):
//   node tools/i18n-gerar.mjs
// Cada arquivo tem só { 'português': 'tradução' } daquele idioma: a aluna baixa só o dela.
import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const D = (await import(pathToFileURL(path.join(raiz, 'js/i18n-fonte.js')).href + '?t=' + Date.now())).default;
const COL = { en: 0, es: 1, zh: 2, hi: 3, fr: 4 };
fs.mkdirSync(path.join(raiz, 'js/i18n'), { recursive: true });
let erro = 0;
for (const [id, c] of Object.entries(COL)) {
  const o = {}; for (const [pt, v] of Object.entries(D)) { if (!Array.isArray(v) || v.length !== 5) { console.error('formato errado:', pt); erro = 1; continue; } if (v[c]) o[pt] = v[c]; }
  fs.writeFileSync(path.join(raiz, `js/i18n/${id}.js`), `// GERADO por tools/i18n-gerar.mjs a partir de js/i18n-fonte.js — não edite aqui.\nexport default ${JSON.stringify(o)};\n`);
  console.log(id, Object.keys(o).length, 'textos');
}
process.exit(erro);
