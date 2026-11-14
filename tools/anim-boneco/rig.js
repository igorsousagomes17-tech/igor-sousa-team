// Gerador das animações do boneco laranja (vista lateral + 3/4), igual às de anim/*.mp4.
// O boneco olha pra +X, cima é +Y, o lado direito dele é +Z. Ângulos em graus.
import * as THREE from './node_modules/three/build/three.module.js';

const W = 540, H = 600, D = Math.PI / 180;
const LARANJA = 0xff6a1a, CINZA = 0x5d5d63, CINZA2 = 0x8a8a90, METAL = 0xb9b9be, ESCURO = 0x2b2b30;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const out = document.createElement('canvas'); out.width = W; out.height = H; const ctx = out.getContext('2d');

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x161618);
scene.add(new THREE.HemisphereLight(0xffffff, 0x303035, 1.1));
const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(2, 5, 3); sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024); Object.assign(sol.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); scene.add(sol);
const chao = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 1 }));
chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; scene.add(chao);

const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: c === METAL ? .6 : .05 });
const MC = mat(LARANJA), MJ = mat(0xff8a3d);
function capsula(r, len, m = MC) { const g = new THREE.CapsuleGeometry(r, Math.max(.001, len), 6, 12); g.translate(0, -len / 2, 0); const me = new THREE.Mesh(g, m); me.castShadow = true; return me; }
function bola(r, m = MJ) { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); me.castShadow = true; return me; }
const O = () => new THREE.Object3D();

// ---------- Boneco ----------
const L = { coxa: .44, canela: .43, pe: .2, lomb: .22, peito: .26, pesc: .09, braco: .29, antebr: .26, ombro: .19, quad: .1 };
function montar() {
  const b = {};
  b.root = O(); scene.add(b.root);
  const pelv = capsula(.11, .16); pelv.rotation.x = Math.PI / 2; pelv.position.z = .08; pelv.position.y = 0; b.root.add(pelv);
  b.sp = O(); b.sp.position.y = .05; b.root.add(b.sp);
  const lomb = capsula(.1, L.lomb); lomb.rotation.z = Math.PI; b.sp.add(lomb);
  b.ch = O(); b.ch.position.y = L.lomb; b.sp.add(b.ch);
  const tor = capsula(.13, .2); tor.rotation.x = Math.PI / 2; tor.position.set(0, .14, .1); tor.scale.set(1, 1, .85); b.ch.add(tor);
  const tor2 = capsula(.12, .1); tor2.rotation.z = Math.PI; tor2.position.y = .02; b.ch.add(tor2);
  b.nk = O(); b.nk.position.y = L.peito; b.ch.add(b.nk);
  const pesc = capsula(.045, L.pesc); pesc.rotation.z = Math.PI; b.nk.add(pesc);
  const cab = bola(.105, MC); cab.position.y = L.pesc + .09; cab.scale.set(1, 1.12, .95); b.nk.add(cab);
  for (const s of ['L', 'R']) {
    const z = s === 'R' ? 1 : -1;
    const sh = O(); sh.position.set(0, L.peito - .03, z * L.ombro); b.ch.add(sh); sh.add(bola(.065));
    sh.add(capsula(.055, L.braco - .02));
    const el = O(); el.position.y = -L.braco; sh.add(el); el.add(bola(.05)); el.add(capsula(.045, L.antebr - .04));
    const mao = O(); mao.position.y = -L.antebr; el.add(mao); const m = bola(.05, MC); m.scale.set(.9, 1.2, .7); m.position.y = -.03; mao.add(m);
    const hp = O(); hp.position.set(0, -.04, z * L.quad); b.root.add(hp); hp.add(bola(.085));
    hp.add(capsula(.08, L.coxa - .03));
    const kn = O(); kn.position.y = -L.coxa; hp.add(kn); kn.add(bola(.065)); kn.add(capsula(.06, L.canela - .04));
    const an = O(); an.position.y = -L.canela; kn.add(an); an.add(bola(.05));
    const pe = new THREE.Mesh(new THREE.BoxGeometry(.24, .07, .1), MC); pe.position.set(.07, -.04, 0); pe.castShadow = true; an.add(pe);
    const toe = O(); toe.position.set(.19, -.07, 0); an.add(toe); const heel = O(); heel.position.set(-.05, -.07, 0); an.add(heel);
    Object.assign(b, { ['sh' + s]: sh, ['el' + s]: el, ['mao' + s]: mao, ['hp' + s]: hp, ['kn' + s]: kn, ['an' + s]: an, ['toe' + s]: toe, ['heel' + s]: heel });
  }
  return b;
}
const B = montar();

// pose: { root:{p:[x,y,z] (y:null = pés no chão), r:[x,y,z]}, sp:[x,y,z], nk, shL/shR:[flex,abd,rot], elL/elR, hpL/hpR:[flex,abd,rot], knL/knR, anL/anR }
const PADRAO = { root: { p: [0, null, 0], r: [0, 0, 0] }, sp: [0, 0, 0], nk: 0, shL: [0, 8, 0], shR: [0, 8, 0], elL: 10, elR: 10, hpL: [0, 4, 0], hpR: [0, 4, 0], knL: 0, knR: 0, anL: 0, anR: 0 };
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
    B.root.position.y = 1 - min;
  } else B.root.position.y = p.root.p[1];
  scene.updateMatrixWorld(true);
}
const wp = n => { const v = new THREE.Vector3(); B[n].getWorldPosition(v); return v; };

// ---------- Aparelhos ----------
let props = [], dinamicos = [];
function caixa(pos, tam, cor = CINZA, rot = [0, 0, 0]) { const m = new THREE.Mesh(new THREE.BoxGeometry(...tam), mat(cor)); m.position.set(...pos); m.rotation.set(...rot.map(r => r * D)); m.castShadow = m.receiveShadow = true; scene.add(m); props.push(m); return m; }
function cil(r, h, cor = METAL) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mat(cor)); m.castShadow = true; return m; }
function haltere() { const g = new THREE.Group(); const c = cil(.018, .16); c.rotation.x = Math.PI / 2; g.add(c); for (const z of [-.09, .09]) { const p = cil(.055, .05, ESCURO); p.rotation.x = Math.PI / 2; p.position.z = z; g.add(p); } return g; }
function barra(len = 1.5, anilha = .2) { const g = new THREE.Group(); const c = cil(.016, len); c.rotation.x = Math.PI / 2; g.add(c); if (anilha) for (const z of [-len / 2 + .12, len / 2 - .12]) { const p = cil(anilha, .05, ESCURO); p.rotation.x = Math.PI / 2; p.position.z = z; g.add(p); } return g; }
function barraW(len = 1.2) { return barra(len, .14); }
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
function enquadra(caixaB, cfg = {}) {
  const c = caixaB.getCenter(new THREE.Vector3()), t = caixaB.getSize(new THREE.Vector3());
  const alt = Math.max(t.y, t.x * (H / (W / 2)) * .9, 1.0) * 1.25, dist = alt / (2 * Math.tan(14 * D)) * (cfg.zoom || 1);
  c.y = Math.max(c.y, .45);
  camL.position.set(c.x, c.y + .1 + dist * .06, c.z + dist); camL.lookAt(c.x, c.y, c.z);
  const a = (cfg.ang ?? 40) * D, d2 = dist * 1.05;
  cam34.position.set(c.x + Math.sin(a) * d2, c.y + dist * .35, c.z + Math.cos(a) * d2); cam34.lookAt(c.x, c.y - .05, c.z);
}
function render() {
  renderer.setScissorTest(true);
  renderer.setViewport(0, 0, W / 2, H); renderer.setScissor(0, 0, W / 2, H); renderer.render(scene, camL);
  renderer.setViewport(W / 2, 0, W / 2, H); renderer.setScissor(W / 2, 0, W / 2, H); renderer.render(scene, cam34);
  ctx.drawImage(renderer.domElement, 0, 0);
  ctx.fillStyle = '#0d0d0f'; ctx.fillRect(W / 2 - 1, 0, 2, H);
  ctx.font = '600 11px Inter, Arial, sans-serif';
  for (const [x, t] of [[10, 'LATERAL'], [W / 2 + 10, '3/4']]) { const w = ctx.measureText(t).width + 18; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(x, 10, w, 24, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(t, x + 9, 26); }
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
window.pronto = true;
