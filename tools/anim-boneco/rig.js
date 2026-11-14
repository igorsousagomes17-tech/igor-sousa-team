// Gerador das animações do boneco laranja (vista lateral + 3/4), igual às de anim/*.mp4.
// O boneco olha pra +X, cima é +Y, o lado direito dele é +Z. Ângulos em graus.
import * as THREE from './node_modules/three/build/three.module.js';

const W = 540, H = 600, D = Math.PI / 180;
const LARANJA = 0xff7417, CINZA = 0x5d5d63, CINZA2 = 0x8a8a90, METAL = 0xb9b9be, ESCURO = 0x3a3a42;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(2); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const out = document.createElement('canvas'); out.width = W; out.height = H; const ctx = out.getContext('2d');

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x161618);
scene.add(new THREE.HemisphereLight(0xfff4ea, 0x26262b, 1.25));
const rim = new THREE.DirectionalLight(0xffd2a8, 1.1); rim.position.set(-3, 3, -2); scene.add(rim);
const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(2.5, 5, 3.5); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 4; Object.assign(sol.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); scene.add(sol);
const chao = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 1 }));
chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; scene.add(chao);

const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: c === LARANJA || c === 0xff8a3d ? .42 : .6, metalness: c === METAL ? .7 : .04 });
const MC = mat(LARANJA), MJ = MC;
function capsula(r, len, m = MC) { const g = new THREE.CapsuleGeometry(r, Math.max(.001, len), 6, 12); g.translate(0, -len / 2, 0); const me = new THREE.Mesh(g, m); me.castShadow = true; return me; }
function bola(r, m = MJ) { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); me.castShadow = true; return me; }
const O = () => new THREE.Object3D();

// ---------- Boneco ----------
const L = { coxa: .44, canela: .43, pe: .2, lomb: .22, peito: .26, pesc: .09, braco: .29, antebr: .26, ombro: .19, quad: .1 };
function seg(r1, r2, len) { // cilindro afinando com pontas arredondadas, do 0 até -len
  const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 20), MC); c.position.y = -len / 2; c.castShadow = true; g.add(c);
  const a = bola(r1); g.add(a); const b = bola(r2); b.position.y = -len; g.add(b); return g;
}
function elip(rx, ry, rz) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), MC); m.scale.set(rx, ry, rz); m.castShadow = true; return m; }
function montar() {
  const b = {};
  b.root = O(); scene.add(b.root);
  const pelv = elip(.1, .1, .15); pelv.position.y = -.01; b.root.add(pelv);
  b.sp = O(); b.sp.position.y = .05; b.root.add(b.sp);
  const ab = seg(.095, .1, L.lomb); ab.rotation.z = Math.PI; b.sp.add(ab);
  b.ch = O(); b.ch.position.y = L.lomb; b.sp.add(b.ch);
  const peito = elip(.11, .15, .165); peito.position.y = .12; b.ch.add(peito);
  b.nk = O(); b.nk.position.y = L.peito; b.ch.add(b.nk);
  const pesc = seg(.036, .04, L.pesc); pesc.rotation.z = Math.PI; b.nk.add(pesc);
  const cab = elip(.085, .105, .08); cab.position.set(.01, L.pesc + .085, 0); b.nk.add(cab);
  for (const s of ['L', 'R']) {
    const z = s === 'R' ? 1 : -1;
    const sh = O(); sh.position.set(0, L.peito - .04, z * (L.ombro - .01)); b.ch.add(sh); sh.add(bola(.052));
    sh.add(seg(.047, .036, L.braco));
    const el = O(); el.position.y = -L.braco; sh.add(el); el.add(seg(.036, .027, L.antebr));
    const mao = O(); mao.position.y = -L.antebr; el.add(mao); const m = elip(.03, .05, .022); m.position.y = -.035; mao.add(m);
    const hp = O(); hp.position.set(0, -.04, z * L.quad); b.root.add(hp);
    hp.add(seg(.078, .05, L.coxa));
    const kn = O(); kn.position.y = -L.coxa; hp.add(kn); kn.add(seg(.05, .034, L.canela));
    const an = O(); an.position.y = -L.canela; kn.add(an);
    const pe = new THREE.Mesh(new THREE.CapsuleGeometry(.035, .16, 6, 12), MC); pe.rotation.z = Math.PI / 2; pe.scale.set(1, 1, 1.25); pe.position.set(.06, -.035, 0); pe.castShadow = true; an.add(pe);
    const toe = O(); toe.position.set(.19, -.07, 0); an.add(toe); const heel = O(); heel.position.set(-.05, -.07, 0); an.add(heel);
    Object.assign(b, { ['sh' + s]: sh, ['el' + s]: el, ['mao' + s]: mao, ['hp' + s]: hp, ['kn' + s]: kn, ['an' + s]: an, ['toe' + s]: toe, ['heel' + s]: heel });
  }
  return b;
}
const B = montar();

// pose: { root:{p:[x,y,z] (y:null = pés no chão), r:[x,y,z]}, sp:[x,y,z], nk, shL/shR:[flex,abd,rot], elL/elR, hpL/hpR:[flex,abd,rot], knL/knR, anL/anR }
const PADRAO = { alt: 0,  root: { p: [0, null, 0], r: [0, 0, 0] }, sp: [0, 0, 0], nk: 0, shL: [0, 8, 0], shR: [0, 8, 0], elL: 10, elR: 10, hpL: [0, 4, 0], hpR: [0, 4, 0], knL: 0, knR: 0, anL: 0, anR: 0 };
function completa(p) { const o = JSON.parse(JSON.stringify(PADRAO)); for (const k in p) o[k] = k === 'root' ? { ...o.root, ...p.root } : p[k]; return o; }
function lerp(a, b, t) { if (typeof a === 'string' || (Array.isArray(a) && typeof a[0] === 'string')) return t < .5 ? a : b; if (Array.isArray(a)) return a.map((v, i) => (v == null || b[i] == null) ? (t < .5 ? v : b[i]) : v + (b[i] - v) * t); if (typeof a === 'number') return a + (b - a) * t; return a; }
function mistura(A, Bp, t) { const o = {}; for (const k in A) o[k] = k === 'root' ? { p: lerp(A.root.p, Bp.root.p, t), r: lerp(A.root.r, Bp.root.r, t), q: A.root.q && A.root.q.map((x, i) => [x[0], x[1] + (Bp.root.q[i][1] - x[1]) * t]) } : lerp(A[k], Bp[k], t); return o; }
function aplica(p) {
  B.root.position.set(p.root.p[0], 1, p.root.p[2]);
  if (p.root.q) { // rotações em sequência, no mundo: [['z',90],['x',90],...]
    const q = new THREE.Quaternion(), e = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
    for (const [ax, g] of p.root.q) q.premultiply(new THREE.Quaternion().setFromAxisAngle(e[ax], g * D));
    B.root.quaternion.copy(q);
  } else B.root.rotation.set(p.root.r[0] * D, p.root.r[1] * D, p.root.r[2] * D, 'YXZ');
  B.sp.rotation.set(p.sp[0] * D, p.sp[1] * D, -p.sp[2] * D, 'YXZ');
  B.nk.rotation.set(0, 0, -p.nk * D);
  for (const s of ['L', 'R']) {
    const z = s === 'R' ? 1 : -1, sh = p['sh' + s], hp = p['hp' + s];
    B['sh' + s].rotation.set(-z * sh[1] * D, -z * (sh[2] || 0) * D, sh[0] * D, p.shOrd || 'YXZ');
    B['el' + s].rotation.set(0, 0, p['el' + s] * D);
    B['hp' + s].rotation.set(-z * hp[1] * D, -z * (hp[2] || 0) * D, hp[0] * D, 'XZY');
    B['kn' + s].rotation.set(0, 0, -p['kn' + s] * D);
    B['an' + s].rotation.set(0, 0, p['an' + s] * D);
  }
  scene.updateMatrixWorld(true);
  if (p.root.p[1] == null) { // pés no chão
    let min = Infinity; const v = new THREE.Vector3();
    for (const n of (p.apoio || ['toeL', 'toeR', 'heelL', 'heelR'])) { B[n].getWorldPosition(v); min = Math.min(min, v.y); }
    B.root.position.y = 1 - min + (p.alt || 0);
  } else B.root.position.y = p.root.p[1];
  scene.updateMatrixWorld(true);
  for (const s of ['L', 'R']) if (p['ik' + s]) ik(s, p['ik' + s], p);
}
// IK simples do braço: acha flexão do ombro e do cotovelo pra mão (punho) chegar no alvo
function ik(s, alvo, p) {
  const T = new THREE.Vector3(...alvo), z = s === 'R' ? 1 : -1, sh = p['sh' + s], S = B['sh' + s], E = B['el' + s], livreAbd = p.ikAbd;
  const err = (f, a, e) => { S.rotation.set(-z * a * D, -z * (sh[2] || 0) * D, f * D, p.shOrd || 'YXZ'); E.rotation.set(0, 0, e * D); S.updateMatrixWorld(true); return wp('mao' + s).distanceTo(T); };
  let bf = 0, ba = sh[1], be = 0, best = Infinity;
  const [fmin, fmax] = p.ikFaixa || [-160, 220];
  for (let f = fmin; f <= fmax; f += 12) for (let e = 0; e <= 160; e += 10) { const d = err(f, ba, e); if (d < best) { best = d; bf = f; be = e; } }
  const passos = livreAbd ? [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] : [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
  for (let st = 6; st > .2; st /= 2) { let mud = true, n = 0; while (mud && n++ < 200) { mud = false; for (const [df, da, de] of passos) { const f = Math.max(fmin, Math.min(fmax, bf + df * st)), a = Math.max(-40, Math.min(90, ba + da * st)), e = Math.max(0, Math.min(165, be + de * st)); const d = err(f, a, e); if (d < best - 1e-6) { best = d; bf = f; ba = a; be = e; mud = true; } } } }
  err(bf, ba, be);
}
const wp = n => { const v = new THREE.Vector3(); B[n].getWorldPosition(v); return v; };

// ---------- Aparelhos ----------
let props = [], dinamicos = [];
function caixa(pos, tam, cor = CINZA, rot = [0, 0, 0]) { const m = new THREE.Mesh(new THREE.BoxGeometry(...tam), mat(cor)); m.position.set(...pos); m.rotation.set(...rot.map(r => r * D)); m.castShadow = m.receiveShadow = true; scene.add(m); props.push(m); return m; }
function cil(r, h, cor = METAL) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mat(cor)); m.castShadow = true; return m; }
function haltere() { const g = new THREE.Group(); const c = cil(.018, .16); c.rotation.x = Math.PI / 2; g.add(c); for (const z of [-.09, .09]) { const p = cil(.055, .05, ESCURO); p.rotation.x = Math.PI / 2; p.position.z = z; g.add(p); } return g; }
function barra(len = 1.5, anilha = .2) { const g = new THREE.Group(); const c = cil(.016, len); c.rotation.x = Math.PI / 2; g.add(c); if (anilha) for (const z of [-len / 2 + .12, len / 2 - .12]) { const p = cil(anilha, .05, ESCURO); p.rotation.x = Math.PI / 2; p.position.z = z; g.add(p); } return g; }
function barraW(len = 1.2) { const g = new THREE.Group(), a = .035, pts = [[-len / 2, 0], [-.3, 0], [-.22, a], [-.13, -a * .3], [-.06, a], [0, a * .6], [.06, a], [.13, -a * .3], [.22, a], [.3, 0], [len / 2, 0]].map(([zz, x]) => new THREE.Vector3(x, 0, zz));
  const tubo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .1), 80, .016, 10), mat(METAL)); tubo.castShadow = true; g.add(tubo);
  for (const zz of [-len / 2 + .1, len / 2 - .1]) { const p = cil(.12, .045, ESCURO); p.rotation.x = Math.PI / 2; p.position.z = zz; g.add(p); } return g; }
function kettle() { const g = new THREE.Group(); const c = bola(.11, mat(ESCURO)); c.position.y = -.14; g.add(c); const al = new THREE.Mesh(new THREE.TorusGeometry(.07, .015, 8, 20, Math.PI), mat(ESCURO)); al.position.y = -.05; g.add(al); return g; }
function anilha(r = .2) { const p = cil(r, .04, ESCURO); return p; }
function corda() { const g = new THREE.Group(); for (const z of [-.05, .05]) { const c = cil(.015, .28, 0x2a2a2a); c.position.set(0, -.12, z); g.add(c); } return g; }
function linha(cor = 0xdddddd) { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: cor })); scene.add(l); props.push(l); return l; }
function addDin(obj, fn) { scene.add(obj); props.push(obj); dinamicos.push(() => fn(obj)); }
const meio = () => wp('maoL').add(wp('maoR')).multiplyScalar(.5);
// itens que seguem as mãos
const SEGUE = {
  assentoRaiz: (dx, dy, tam) => addDin(new THREE.Mesh(new THREE.BoxGeometry(...tam), mat(CINZA)), o => { o.position.set(B.root.position.x + dx, B.root.position.y + dy, 0); o.castShadow = true; }),
  stepSob: (s, w = .42) => addDin(new THREE.Mesh(new THREE.BoxGeometry(w, 1, .5), mat(0x6a6a70)), o => { const t = wp('toe' + s), h = wp('heel' + s), y = Math.max(.001, Math.min(t.y, h.y)); o.scale.y = y; o.position.set((t.x + h.x) / 2, y / 2, 0); o.castShadow = o.receiveShadow = true; o.visible = y > .03; }),
  placaPes: (s = 'R') => addDin(new THREE.Mesh(new THREE.BoxGeometry(.05, .5, .6), mat(CINZA)), o => { const t = wp('toe' + s); o.position.set(t.x + .04, t.y + .05, 0); o.castShadow = true; }),
  barraFixa: () => {},
  halteres: () => { for (const s of ['L', 'R']) addDin(haltere(), o => { o.position.copy(wp('mao' + s)); o.position.y -= .03; }); },
  halteresMartelo: () => { for (const s of ['L', 'R']) addDin(haltere(), o => { const h = wp('mao' + s), d = h.clone().sub(wp('el' + s)).normalize(); const ax = new THREE.Vector3(-d.y, d.x, 0).normalize(); o.position.copy(h).addScaledVector(d, .03); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ax); }); },
  alavanca: (piv, s) => addDin(new THREE.Mesh(new THREE.BoxGeometry(.05, 1, .05), mat(CINZA)), o => { const P = new THREE.Vector3(...piv), H = wp('mao' + s); H.z = P.z; o.scale.y = P.distanceTo(H); o.position.copy(P).add(H).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), H.clone().sub(P).normalize()); o.castShadow = true; }),
  pegador: s => addDin((() => { const c = cil(.02, .2, ESCURO); c.rotation.z = Math.PI / 2; const g = new THREE.Group(); g.add(c); return g; })(), o => { o.position.copy(wp('mao' + s)); o.position.y -= .04; o.position.z += (s === 'R' ? .05 : -.05); }),
  halter1: (s = 'R') => addDin(haltere(), o => { o.position.copy(wp('mao' + s)); o.position.y -= .03; }),
  halterPe: () => addDin(haltere(), o => { o.position.copy(meio()); o.position.y -= .04; o.rotation.set(Math.PI / 2, 0, 0); }),
  barra: (len, an) => addDin(barra(len, an), o => { o.position.copy(meio()); o.position.y -= .03; }),
  barraW: () => addDin(barraW(), o => { o.position.copy(meio()); o.position.y -= .03; }),
  barraCurta: () => addDin(barra(.55, 0), o => { o.position.copy(meio()); o.position.y -= .03; }),
  kettle: () => addDin(kettle(), o => { o.position.copy(meio()); }),
  anilhaPeito: () => addDin(anilha(.17), o => { o.position.copy(meio()); o.rotation.set(0, 0, Math.PI / 2); }),
  corda: () => addDin(corda(), o => { o.position.copy(meio()); o.position.y += .1; }),
};
function cabo(anc, de = 'meio') { const l = linha(); dinamicos.push(() => { const p = de === 'meio' ? meio() : wp(de); l.geometry.setFromPoints([new THREE.Vector3(...anc), p]); }); }
function coluna(x, z = 0, h = 2.1) { caixa([x, h / 2, z], [.12, h, .12], CINZA); }

// ---------- Câmeras e render ----------
const camL = new THREE.PerspectiveCamera(28, (W / 2) / H, .1, 50), cam34 = new THREE.PerspectiveCamera(28, (W / 2) / H, .1, 50);
let pilha = false;
function enquadra(caixaB, cfg = {}) {
  const c = caixaB.getCenter(new THREE.Vector3()), t = caixaB.getSize(new THREE.Vector3());
  { const aS = Math.max(t.y, t.x / ((W / 2) / H)), aP = Math.max(t.y, t.x / (W / (H / 2))); pilha = (H / 2) / aP > H / aS * 1.05; }
  const asp = pilha ? W / (H / 2) : (W / 2) / H;
  for (const k of [camL, cam34]) { k.aspect = asp; k.updateProjectionMatrix(); }
  const alt = Math.max(t.y, t.x / asp, 1.0) * (pilha ? 1.34 : 1.25), dist = alt / (2 * Math.tan(14 * D)) * (pilha ? 1 : (cfg.zoom || 1));
  c.y = Math.max(c.y, pilha ? .3 : .45);
  camL.position.set(c.x, c.y + .1 + dist * .06, c.z + dist); camL.lookAt(c.x, c.y, c.z);
  const a = (cfg.ang ?? 42) * D, d2 = dist * (pilha ? 1.15 : 1.12);
  cam34.position.set(c.x + Math.sin(a) * d2 * .82, c.y + d2 * (pilha ? .5 : .55), c.z + Math.cos(a) * d2 * .82); cam34.lookAt(c.x, c.y - .05, c.z);
}
function render() {
  renderer.setScissorTest(true);
  if (pilha) {
    renderer.setViewport(0, H / 2, W, H / 2); renderer.setScissor(0, H / 2, W, H / 2); renderer.render(scene, camL);
    renderer.setViewport(0, 0, W, H / 2); renderer.setScissor(0, 0, W, H / 2); renderer.render(scene, cam34);
  } else {
    renderer.setViewport(0, 0, W / 2, H); renderer.setScissor(0, 0, W / 2, H); renderer.render(scene, camL);
    renderer.setViewport(W / 2, 0, W / 2, H); renderer.setScissor(W / 2, 0, W / 2, H); renderer.render(scene, cam34);
  }
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(renderer.domElement, 0, 0, W, H);
  ctx.fillStyle = '#0d0d0f'; if (pilha) ctx.fillRect(0, H / 2 - 1, W, 2); else ctx.fillRect(W / 2 - 1, 0, 2, H);
  ctx.font = '600 11px Inter, Arial, sans-serif';
  const et = pilha ? [[10, 10, 'LATERAL'], [10, H / 2 + 10, '3/4']] : [[10, 10, 'LATERAL'], [W / 2 + 10, 10, '3/4']];
  for (const [x, y, t] of et) { const w = ctx.measureText(t).width + 18; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(x, y, w, 24, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(t, x + 9, y + 16); }
}

// ---------- Monta um exercício e devolve os quadros ----------
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
window.preparar = function (ex) {
  for (const p of props) scene.remove(p); props = []; dinamicos = [];
  (ex.cena || []).forEach(c => { const [tipo, ...args] = c; if (tipo === 'caixa') caixa(...args); else if (tipo === 'coluna') coluna(...args); else if (tipo === 'cabo') cabo(...args); else SEGUE[tipo](...args); });
  const poses = (ex.poses || [ex.A, ex.B]).map(completa);
  window._poses = poses; window._ex = ex;
  const bb = new THREE.Box3();
  for (const p of poses) { aplica(p); dinamicos.forEach(f => f()); bb.expandByObject(B.root); for (const o of props) if (o.isMesh || o.isGroup) bb.expandByObject(o); }
  bb.max.y = Math.max(bb.max.y, .3); bb.min.y = Math.min(bb.min.y, 0);
  enquadra(bb, ex.cam || {});
  return true;
};
// quadro i de n: ida e volta entre as poses (A→B→A, ou A→B→C→A ...), com pausas curtas
window.quadro = function (i, n) {
  const P = window._poses, seq = P.length === 2 ? [0, 1, 0] : [...P.keys(), 0];
  const segs = seq.length - 1, t = i / n, pausa = .08;
  let k = Math.min(segs - 1, Math.floor(t * segs)), f = t * segs - k;
  f = Math.max(0, Math.min(1, (f - pausa) / (1 - 2 * pausa)));
  aplica(mistura(P[seq[k]], P[seq[k + 1]], ease(f))); dinamicos.forEach(fn => fn()); render();
  return out.toDataURL('image/jpeg', .9);
};
window.probe = function (p) { aplica(completa(p)); const r = {}; for (const n of ["shR","elR","maoR","maoL"]) { const v = wp(n); r[n] = [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]; } return JSON.stringify(r); };
window.pronto = true;
