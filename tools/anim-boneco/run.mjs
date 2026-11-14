import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const DIR = path.dirname(new URL(import.meta.url).pathname), OUT = process.env.OUT || DIR + '/out', N = 79;
const { EX } = await import(DIR + '/ex.mjs?' + Date.now());
const so = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 540, height: 600 } });
p.on('pageerror', e => console.log('ERRO', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
await p.route('http://gen.local/**', r => { const f = DIR + new URL(r.request().url()).pathname; r.fulfill({ path: f, contentType: f.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
await p.goto('http://gen.local/render.html'); await p.waitForFunction(() => window.pronto, null, { timeout: 30000 });
for (const ex of EX.filter(e => !so.length || so.includes(e.id))) {
  const tmp = `/tmp/fr_${ex.id}`; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp);
  await p.evaluate(e => window.preparar(e), ex);
  for (let i = 0; i < N; i++) { const d = await p.evaluate(([i, n]) => window.quadro(i, n), [i, N]); fs.writeFileSync(`${tmp}/${String(i).padStart(3, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64')); }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '24', '-i', `${tmp}/%03d.jpg`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${OUT}/${ex.id}.mp4`]);
  // prévia: 4 quadros lado a lado
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `${tmp}/000.jpg`, '-i', `${tmp}/020.jpg`, '-i', `${tmp}/039.jpg`, '-filter_complex', '[0][1][2]hstack=3,scale=1080:-1', `${OUT}/${ex.id}.png`]);
  console.log('ok', ex.id);
}
await b.close();
