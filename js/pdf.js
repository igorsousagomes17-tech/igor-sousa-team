// PDF informativo do treino do mês. A biblioteca (jsPDF) vem junto do app e só baixa quando a aluna toca no botão;
// depois da 1ª vez fica no cache e o PDF sai mesmo sem sinal.
const JSPDF = new URL('./vendor/jspdf.umd.min.js', import.meta.url).href;
const LARANJA = [255, 106, 0], PRETO = [11, 11, 12], CINZA = [110, 110, 115], CLARO = [245, 245, 245];

function carregar() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  return new Promise((ok, erro) => {
    const s = document.createElement('script'); s.src = JSPDF;
    s.onload = () => ok(window.jspdf); s.onerror = () => erro(new Error('Sem internet pra gerar o PDF agora. Depois da 1ª vez ele funciona sem sinal.'));
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

export async function gerarPdfTreino(plano, perfil) {
  const { jsPDF } = await carregar();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 16;
  const mes = new Date(plano.mes + 'T12:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const foto = await fotoCapa('icons/igor_s.jpg');
  const fundo = () => { doc.setFillColor(...PRETO); doc.rect(0, 0, W, H, 'F'); };
  const rodape = (escuro) => { doc.setFontSize(8); doc.setTextColor(...(escuro ? CINZA : CINZA)); doc.text('Igor Sousa Team  ·  @igorsousa.personal', M, H - 8); doc.text(String(doc.getNumberOfPages()), W - M, H - 8, { align: 'right' }); };

  // CAPA ---------------------------------------------------------------------
  fundo();
  if (foto) { try { doc.addImage(foto, 'JPEG', W - 96, 0, 96, 128); } catch {} }
  doc.setFillColor(...LARANJA); doc.rect(M, 28, 22, 2.2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...CLARO); doc.setFontSize(11); doc.text('IGOR SOUSA TEAM', M, 22);
  doc.setFontSize(34); doc.text('TREINO', M, 50); doc.setTextColor(...LARANJA); doc.text('DO MÊS', M, 64);
  doc.setFontSize(13); doc.setTextColor(...CLARO); doc.setFont('helvetica', 'normal');
  doc.text(limpa(mes.charAt(0).toUpperCase() + mes.slice(1)), M, 76);
  if (perfil?.nome) { doc.setFontSize(11); doc.setTextColor(...CINZA); doc.text(limpa('Para ' + perfil.nome), M, 84); }
  if (plano.obs) { doc.setFontSize(10); doc.setTextColor(...CINZA); doc.text(doc.splitTextToSize(limpa(plano.obs), 100), M, 92); }

  let y = 138;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...LARANJA); doc.text('SUA SEMANA', M, y); y += 8;
  plano.treinos.forEach(t => {
    doc.setFillColor(28, 28, 30); doc.roundedRect(M, y - 5.5, W - 2 * M, 11, 2, 2, 'F');
    doc.setTextColor(...LARANJA); doc.setFontSize(12); doc.text(limpa(t.letra), M + 5, y + 1.8);
    doc.setTextColor(...CLARO); doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text(limpa(t.nome), M + 14, y + 1.8);
    doc.setTextColor(...CINZA); doc.setFontSize(9); doc.text(`${t.exercicios.length} exercícios · ~${t.duracao_min || 40} min`, W - M - 4, y + 1.8, { align: 'right' });
    doc.setFont('helvetica', 'bold'); y += 14;
  });

  y += 4; doc.setTextColor(...LARANJA); doc.setFontSize(13); doc.text('COMO USAR', M, y); y += 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...CLARO);
  ['Siga a ordem A, B, C, D e recomece. Perdeu um dia? Continua de onde parou.',
    'Bi-set (marcado em laranja): faz um exercício e emenda direto no outro, descansa só no fim.',
    'Pirâmide (ex.: 12/10/8): aumenta a carga a cada série e diminui as repetições.',
    'Bateu o topo das repetições com boa técnica? Sobe a carga na próxima.',
    'No app você tem o vídeo de cada exercício, o cronômetro do descanso e registra a carga.',
    'Treino ficou leve ou pesado demais? Me fala no feedback do app que eu ajusto.']
    .forEach(l => { const ls = doc.splitTextToSize(limpa(l), W - 2 * M - 6); doc.setFillColor(...LARANJA); doc.circle(M + 1.2, y - 1.2, 0.9, 'F'); doc.text(ls, M + 5, y); y += ls.length * 5 + 1.5; });
  rodape(true);

  // UMA PÁGINA POR TREINO ------------------------------------------------------
  plano.treinos.forEach(t => {
    doc.addPage();
    doc.setFillColor(...PRETO); doc.rect(0, 0, W, 40, 'F');
    doc.setFillColor(...LARANJA); doc.rect(0, 40, W, 1.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...LARANJA); doc.setFontSize(26); doc.text(limpa('Treino ' + t.letra), M, 22);
    doc.setTextColor(...CLARO); doc.setFontSize(13); doc.text(limpa(t.nome), M, 31);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...CINZA); doc.text(`~${t.duracao_min || 40} min  ·  ${t.exercicios.length} exercícios`, W - M, 31, { align: 'right' });
    let y = 52;
    const exs = [...t.exercicios].sort((a, b) => a.ordem - b.ordem);
    exs.forEach(e => {
      const hiit = /hiit|cardio/i.test(e.nome);
      const dica = e.dica ? doc.splitTextToSize(limpa(e.dica), W - 2 * M - 16) : [];
      const alt = e.alternativa ? limpa('Ou substitua por: ' + e.alternativa) : '';
      const h = 13 + dica.length * 4.4 + (alt ? 5 : 0);
      if (y + h > H - 16) { rodape(); doc.addPage(); y = 20; }
      if (hiit) {
        doc.setFillColor(255, 240, 228); doc.roundedRect(M, y - 5, W - 2 * M, h, 2, 2, 'F');
      } else if (e.biset_com) {
        doc.setFillColor(...LARANJA); doc.rect(M - 3, y - 5, 1.4, h - 2, 'F');
      }
      doc.setFillColor(...(hiit ? LARANJA : PRETO)); doc.circle(M + 4, y - 0.5, 4, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.text(String(e.ordem), M + 4, y + 1, { align: 'center' });
      doc.setTextColor(...PRETO); doc.setFontSize(11.5); doc.text(limpa(e.nome), M + 12, y + 0.5);
      if (e.biset_com) { const w = doc.getTextWidth(limpa(e.nome)); doc.setFontSize(7.5); doc.setTextColor(...LARANJA); doc.text(`BI-SET COM ${e.biset_com}`, M + 14 + w, y + 0.3); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...LARANJA);
      doc.text(limpa(`${e.series > 1 ? e.series + ' x ' : ''}${e.reps}${e.descanso_s ? '  ·  descanso ' + e.descanso_s + 's' : ''}`), M + 12, y + 6);
      let yy = y + 11;
      if (dica.length) { doc.setTextColor(...CINZA); doc.setFontSize(9.5); doc.text(dica, M + 12, yy); yy += dica.length * 4.4; }
      if (alt) { doc.setTextColor(140, 140, 145); doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.text(alt, M + 12, yy); doc.setFont('helvetica', 'normal'); }
      y += h + 3;
    });
    rodape();
  });

  const nome = `Treino ${limpa(mes).replace(/\s+de\s+/, ' ')}.pdf`.replace(/\s+/g, '-');
  const blob = doc.output('blob');
  const arquivo = new File([blob], nome, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: 'Meu treino do mês' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  doc.save(nome);
}
