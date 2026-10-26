// PDF informativo do treino do mês. A biblioteca (jsPDF) vem junto do app e só baixa quando a aluna toca no botão;
// depois da 1ª vez fica no cache e o PDF sai mesmo sem sinal.
import { tl, idioma, loc } from './i18n.js';
import { semCarga } from './ui.js'; // mesma regra do app: exercício sem peso não ganha linha de carga
// As fontes do PDF só têm o alfabeto latino: em chinês e hindi o PDF sai em inglês (embutir fonte custaria vários MB).
const LP = () => ['zh', 'hi'].includes(idioma()) ? 'en' : idioma();
const T = (pt, v) => tl(LP(), pt, v);
const JSPDF = new URL('./vendor/jspdf.umd.min.js', import.meta.url).href;
const LARANJA = [255, 106, 0], PRETO = [11, 11, 12], CINZA = [110, 110, 115], CLARO = [245, 245, 245];

let tentativas = 0;
function carregar() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  // 4G parado (conecta e não chega nada): desiste em 25 s em vez de deixar "Gerando PDF…" pra sempre; a nova tentativa vai com outro endereço
  document.querySelectorAll('script[data-jspdf]').forEach(x => x.remove());
  return new Promise((ok, erro) => {
    const s = document.createElement('script'); s.dataset.jspdf = '1'; s.src = JSPDF + (tentativas++ ? '?r=' + Date.now() : '');
    const falha = () => { clearTimeout(lim); s.remove(); erro(new Error('lento')); };
    const lim = setTimeout(falha, 25000);
    s.onload = () => { clearTimeout(lim); window.jspdf ? ok(window.jspdf) : falha(); }; s.onerror = falha;
    document.head.appendChild(s);
  });
}
async function imagem(url) {
  try { const b = await (await fetch(url)).blob(); return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); } catch { return null; }
}

// Foto do Igor escurecida e sumindo no preto (esquerda e embaixo), feita no canvas pra ficar lisa.
async function fotoCapa(url) {
  const src = await imagem(url); if (!src) return null;
  const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); if (!img) return null;
  const w = 600, h = 800, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const k = Math.max(w / img.width, h / img.height); x.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k);
  x.fillStyle = 'rgba(11,11,12,0.25)'; x.fillRect(0, 0, w, h);
  let g = x.createLinearGradient(0, 0, w * 0.45, 0); g.addColorStop(0, 'rgba(11,11,12,1)'); g.addColorStop(1, 'rgba(11,11,12,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  g = x.createLinearGradient(0, h, 0, h * 0.6); g.addColorStop(0, 'rgba(11,11,12,1)'); g.addColorStop(1, 'rgba(11,11,12,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.85);
}
// Fontes padrão do PDF não têm emoji/símbolos fora do Latin-1.
const limpa = s => String(s ?? '').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\xFF]/g, '').trim();

// programa: título do programa extra (o PDF vira o do programa, sem a ordem A/B/C/D)
export async function gerarPdfTreino(plano, perfil, programa = null) {
  const { jsPDF } = await carregar();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 16;
  const mes = new Date(plano.mes + 'T12:00').toLocaleDateString(loc(LP()), { month: 'long', year: 'numeric' });
  const foto = await fotoCapa('icons/igor_s.jpg');
  const fundo = () => { doc.setFillColor(...PRETO); doc.rect(0, 0, W, H, 'F'); };
  const rodape = (escuro) => { doc.setFontSize(8); doc.setTextColor(...(escuro ? CINZA : CINZA)); doc.text('Igor Sousa Team  ·  @igorsousa.personal', M, H - 8); doc.text(String(doc.getNumberOfPages()), W - M, H - 8, { align: 'right' }); };

  // CAPA ---------------------------------------------------------------------
  fundo();
  if (foto) { try { doc.addImage(foto, 'JPEG', W - 96, 0, 96, 128); } catch {} }
  doc.setFillColor(...LARANJA); doc.rect(M, 28, 22, 2.2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...CLARO); doc.setFontSize(11); doc.text('IGOR SOUSA TEAM', M, 22);
  if (programa) { doc.setFontSize(30); const ls = doc.splitTextToSize(limpa(programa).toUpperCase(), W - 2 * M - 70).slice(0, 2); doc.text(ls, M, 50); }
  else { const [c1, c2] = limpa(T('TREINO|DO MÊS')).split('|'); doc.setFontSize(34); doc.text(c1, M, 50); doc.setTextColor(...LARANJA); doc.text(c2, M, 64); }
  doc.setFontSize(13); doc.setTextColor(...CLARO); doc.setFont('helvetica', 'normal');
  doc.text(limpa(programa ? T('Programa extra') : mes.charAt(0).toUpperCase() + mes.slice(1)), M, 76);
  if (perfil?.nome) { doc.setFontSize(11); doc.setTextColor(...CINZA); doc.text(limpa(T('Para {nome}', { nome: perfil.nome })), M, 84); }
  if (plano.obs) { doc.setFontSize(10); doc.setTextColor(...CINZA); doc.text(doc.splitTextToSize(limpa(plano.obs), 100), M, 92); }

  let y = 138;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...LARANJA); doc.text(limpa(programa ? T('TREINOS') : T('SUA SEMANA')), M, y); y += 8;
  plano.treinos.forEach(t => {
    doc.setFillColor(28, 28, 30); doc.roundedRect(M, y - 5.5, W - 2 * M, 11, 2, 2, 'F');
    doc.setTextColor(...LARANJA); doc.setFontSize(12); doc.text(limpa(t.letra), M + 5, y + 1.8);
    doc.setTextColor(...CLARO); doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text(limpa(t.nome), M + 14, y + 1.8);
    doc.setTextColor(...CINZA); doc.setFontSize(9); doc.text(limpa(T('{n} exercícios · ~{d} min', { n: t.exercicios.length, d: t.duracao_min || 40 })), W - M - 4, y + 1.8, { align: 'right' });
    doc.setFont('helvetica', 'bold'); y += 14;
  });

  y += 4; doc.setTextColor(...LARANJA); doc.setFontSize(13); doc.text(limpa(T('COMO USAR')), M, y); y += 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...CLARO);
  // "Como usar" só com o que existe nesse treino (mobilidade não fala de pirâmide nem de carga)
  const todos = plano.treinos.flatMap(t => t.exercicios), temCarga = todos.some(e => !semCarga(e) && !/\d\s*(s|seg|min)\b/i.test(e.reps || ''));
  [...(programa ? [] : ['Siga a ordem A, B, C, D e recomece. Perdeu um dia? Continua de onde parou.']),
    ...(todos.some(e => e.biset_com) ? ['Bi-set (marcado em laranja): faz um exercício e emenda direto no outro, descansa só no fim.'] : []),
    ...(todos.some(e => /\d\s*\/\s*\d/.test(e.reps || '')) ? ['Pirâmide (ex.: 12/10/8): aumenta a carga a cada série e diminui as repetições.'] : []),
    ...(temCarga ? ['Bateu o topo das repetições com boa técnica? Sobe a carga na próxima.', 'No app você tem o vídeo de cada exercício, o cronômetro do descanso e registra a carga.'] : ['No app você tem o vídeo de cada exercício e o cronômetro do descanso.']),
    'Treino ficou leve ou pesado demais? Me fala no feedback do app que eu ajusto.']
    .forEach(l => { const ls = doc.splitTextToSize(limpa(T(l)), W - 2 * M - 6); doc.setFillColor(...LARANJA); doc.circle(M + 1.2, y - 1.2, 0.9, 'F'); doc.text(ls, M + 5, y); y += ls.length * 5 + 1.5; });
  rodape(true);

  // UMA PÁGINA POR TREINO ------------------------------------------------------
  plano.treinos.forEach(t => {
    doc.addPage();
    doc.setFillColor(...PRETO); doc.rect(0, 0, W, 40, 'F');
    doc.setFillColor(...LARANJA); doc.rect(0, 40, W, 1.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...LARANJA); doc.setFontSize(26); doc.text(limpa(programa ? t.nome : T('Treino {l}', { l: t.letra })), M, 22);
    doc.setTextColor(...CLARO); doc.setFontSize(13); doc.text(limpa(programa || t.nome), M, 31);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...CINZA); doc.text(limpa(T('~{d} min  ·  {n} exercícios', { n: t.exercicios.length, d: t.duracao_min || 40 })), W - M, 31, { align: 'right' });
    let y = 52;
    const exs = [...t.exercicios].sort((a, b) => a.ordem - b.ordem);
    // Só o último (HIIT opcional) não cabe na folha: aperta o espaço entre os exercícios e tira a dica dele (não gasta uma folha só com ele)
    const altura = (e, semDica) => { const d = e.dica && !semDica ? doc.splitTextToSize(limpa(e.dica), W - 2 * M - 16).length : 0, an = !/hiit|cardio/i.test(e.nome) && !semCarga(e) && !/\d\s*(s|seg|min)\b/i.test(e.reps || ''); return 13 + d * 4.4 + (e.alternativa && !semDica ? 5 : 0) + (an ? 6 : 0); };
    const ultOpc = exs.length > 1 && /hiit|cardio|opcional/i.test(exs[exs.length - 1].nome);
    const somaAntes = exs.slice(0, -1).reduce((a, e) => a + altura(e) + 3, 52);
    const aperta = ultOpc && somaAntes + altura(exs[exs.length - 1]) > H - 16 && somaAntes <= H - 16 && exs.slice(0, -1).reduce((a, e) => a + altura(e) + 1, 52) + altura(exs[exs.length - 1], true) <= H - 16;
    const gap = aperta ? 1 : 3;
    exs.forEach((e, idx) => {
      const hiit = /hiit|cardio/i.test(e.nome);
      let dica = e.dica && !(aperta && idx === exs.length - 1) ? doc.splitTextToSize(limpa(e.dica), W - 2 * M - 16) : [];
      // Último item curto (HIIT opcional) que não cabe: encolhe a dica pra 1 linha em vez de gastar uma folha só com ele
      if (idx === exs.length - 1 && (hiit || /opcional/i.test(e.nome)) && y + 13 + dica.length * 4.4 > H - 16 && y + 17.4 <= H - 16) dica = dica.length ? [doc.splitTextToSize(limpa(e.dica), W - 2 * M - 16)[0] + (dica.length > 1 ? '…' : '')] : [];
      const alt = e.alternativa && !(aperta && idx === exs.length - 1) ? limpa(T('Ou substitua por: {x}', { x: e.alternativa })) : '';
      const anota = !hiit && !semCarga(e) && !/\d\s*(s|seg|min)\b/i.test(e.reps || '');
      const h = 13 + dica.length * 4.4 + (alt ? 5 : 0) + (anota ? 6 : 0);
      if (y + h > H - 16) { rodape(); doc.addPage(); y = 20; // página nova repete de qual treino é
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...LARANJA); doc.text(limpa((programa ? t.nome : T('Treino {l}', { l: t.letra })) + ' ' + T('(continuação)')), M, y); y += 12; }
      if (hiit) {
        doc.setFillColor(255, 240, 228); doc.roundedRect(M, y - 5, W - 2 * M, h, 2, 2, 'F');
      } else if (e.biset_com) {
        doc.setFillColor(...LARANJA); doc.rect(M - 3, y - 5, 1.4, h - 2, 'F');
      }
      doc.setFillColor(...(hiit ? LARANJA : PRETO)); doc.circle(M + 4, y - 0.5, 4, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.text(String(e.ordem), M + 4, y + 1, { align: 'center' });
      doc.setTextColor(...PRETO); doc.setFontSize(11.5); doc.text(limpa(e.nome), M + 12, y + 0.5);
      if (e.biset_com) { const w = doc.getTextWidth(limpa(e.nome)); doc.setFontSize(7.5); doc.setTextColor(...LARANJA); doc.text(limpa(T('BI-SET COM {n}', { n: e.biset_com })), M + 14 + w, y + 0.3); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...LARANJA);
      doc.text(limpa(`${e.series > 1 ? e.series + ' x ' : ''}${e.reps}${e.descanso_s ? '  ·  ' + T('descanso {n}s', { n: e.descanso_s }) : ''}`), M + 12, y + 6);
      let yy = y + 11;
      if (dica.length) { doc.setTextColor(...CINZA); doc.setFontSize(9.5); doc.text(dica, M + 12, yy); yy += dica.length * 4.4; }
      if (alt) { doc.setTextColor(140, 140, 145); doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.text(alt, M + 12, yy); doc.setFont('helvetica', 'normal'); yy += 5; }
      if (anota) { doc.setTextColor(...CINZA); doc.setFontSize(8.5); doc.text(limpa(T('Carga (kg):')) + '   ' + Array.from({ length: Math.min(e.series || 3, 5) }, () => '______').join('   '), M + 12, yy + 1); }
      y += h + gap;
    });
    rodape();
  });

  const nome = (programa ? `${limpa(programa)}.pdf` : `${limpa(T('Treino'))} ${limpa(mes).replace(/\s+(de|del)\s+/, ' ')}.pdf`).replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const blob = doc.output('blob');
  const arquivo = new File([blob], nome, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: T('Meu treino do mês') }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  doc.save(nome);
}
