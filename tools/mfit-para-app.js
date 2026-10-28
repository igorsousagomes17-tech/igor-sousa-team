// Converte os dados puxados da API do Mfit (cadastro, anamnese, rotina atual) em SQL pro Supabase do app.
// Roda no navegador (os dados ficam em window.name = 'ISDADOS:' + JSON). Uso: mfitParaSQL(JSON.parse(window.name.slice(8)))
// Regras: sem vídeo; séries "Nx" do Mfit viram séries/reps; combinado = bi-set; HIIT do obs vira exercício opcional no fim;
// dicas de execução do obs vão pro exercício certo; anamnese do Mfit preenche o perfil e a aluna só confere (saúde ela responde).
function mfitParaSQL(D) {
  const q = s => s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
  const arr = a => a && a.length ? 'array[' + a.map(q).join(',') + ']::text[]' : 'null';
  const limpa = s => String(s || '').replace(/\r/g, '').replace(/\s+/g, ' ').trim();
  const norm = s => limpa(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // "4x 12/10/8/8 no leg" → {series:4, reps:'12/10/8/8'}; "1x 15, 1x 12, 1x 10 + 1x rest-pause" → {4, '15/12/10/...'}
  function seriesReps(txt) {
    const t = limpa(txt); const pares = [...t.matchAll(/(\d+)\s*x\s*([\d/\-]+(?:\s*(?:s|seg|min))?)?/gi)];
    if (!pares.length) return { series: 3, reps: t.slice(0, 24) || '12' };
    const series = pares.reduce((n, m) => n + (+m[1] || 0), 0) || 3;
    const reps = pares.length > 1 ? pares.map(m => m[2] || '').filter(Boolean).join('/') : (pares[0][2] || '').trim();
    const resto = t.replace(/^\s*\d+\s*x\s*/i, '');
    return { series: Math.min(series, 10), reps: (reps || resto.slice(0, 24) || '12').replace(/\/+$/, '') };
  }
  const dicaDe = (txt, rep) => { const t = limpa(txt); return t && t.replace(/^\d+\s*x\s*/i, '') !== rep ? t : null; };
  function exercicios(sess) {
    const out = [];
    for (const e of sess.ex) {
      if (e.comb) {
        const nomes = e.comb.filter(c => limpa(c.nome)).map(c => limpa(c.nome));
        const linha = e.comb.find(c => limpa(c.rep)) || {}; const txt = limpa(linha.rep); const desc = linha.int || 60;
        const partes = txt.split(/\s+e\s+/); const base = seriesReps(txt);
        nomes.slice(0, 3).forEach((n, i) => { const p = partes[i] && i ? partes[i] : partes[0] || ''; const num = (limpa(p).replace(/^\d+\s*x\s*/i, '').match(/[\d/\-]+/) || [base.reps])[0];
          out.push({ nome: n, series: base.series, reps: i === 0 ? base.reps : num, descanso_s: i === nomes.length - 1 ? desc : 0, dica: txt || null, grupo: nomes.length > 1 ? true : false, idx: i, tam: nomes.length }); });
      } else {
        const s0 = (e.s || [])[0] || {}; let sr = seriesReps(s0.rep || ''); if ((e.s || []).length > 1) sr = { series: e.s.length, reps: e.s.map(x => seriesReps(x.rep).reps).join('/') };
        if (!limpa(s0.rep) && limpa(s0.tempo)) sr = { series: 1, reps: limpa(s0.tempo) };
        out.push({ nome: limpa(e.nome), series: sr.series, reps: sr.reps, descanso_s: s0.int ?? 60, dica: dicaDe(s0.rep, sr.reps) || limpa(s0.obs) || null });
      }
    }
    // bi-set: liga os pares pela ordem
    out.forEach((x, i) => { x.ordem = i + 1; });
    out.forEach((x, i) => { if (x.grupo && x.tam === 2) x.biset_com = x.idx === 0 ? out[i + 1].ordem : out[i - 1].ordem; });
    // dicas de execução do obs: "Nome: dica" (ou "Bi-set A + B: dica")
    const obs = String(sess.obs || '').replace(/\r/g, ''); const dicas = (obs.split(/DICAS DE EXECU[ÇC][ÃA]O/i)[1] || '').split('\n').map(l => l.trim()).filter(l => l.includes(':'));
    for (const l of dicas) { const [alvo, ...resto] = l.split(':'); const dica = resto.join(':').trim(); const nomes = alvo.replace(/^bi-?set\s*/i, '').split('+').map(norm);
      for (const n of nomes) { const ex = out.find(x => norm(x.nome).startsWith(n.slice(0, 14)) || n.startsWith(norm(x.nome).slice(0, 14))); if (ex && dica) ex.dica = ex.dica && !ex.dica.includes(dica) ? dica + ' · ' + ex.dica : dica; } }
    // HIIT/cardio do obs vira exercício opcional no fim
    if (/HIIT|CARDIO/i.test(obs) && !out.some(x => /hiit|cardio/i.test(x.nome))) {
      const bloco = obs.split(/\n\s*\n/)[0].split('\n').slice(1).map(l => l.trim()).filter(Boolean).join(' · ');
      out.push({ nome: 'HIIT (opcional)', series: 1, reps: (obs.match(/HIIT\s*(\d+)\s*min/i) || [, '20'])[1] + ' min', descanso_s: 0, dica: bloco || null, ordem: out.length + 1 });
    }
    return out;
  }
  // Anamnese do Mfit → campos do app (o que não der pra saber fica em branco pra ela completar)
  function perfil(d) {
    const a = {}; const Q = (d.an?.q || []).map(([p, r]) => [norm(p), limpa(r), norm(r)]);
    const ach = re => (Q.find(([p]) => re.test(p)) || [])[2] || '', achO = re => (Q.find(([p]) => re.test(p)) || [])[1] || '';
    const nao = r => !r || /^(nao|nenhum|nenhuma|n|no)\b/.test(r);
    const obj = ach(/objetivo/); if (obj) a.objetivo = /(emagrec|perd|redu|defin|secar|gordura)/.test(obj) && /(hipertrof|massa|ganh|muscul)/.test(obj) ? 'Os dois' : /(hipertrof|massa|ganh|muscul)/.test(obj) ? 'Ganhar massa' : /(emagrec|perd|redu|defin|secar|gordura)/.test(obj) ? 'Emagrecer' : /corr/.test(obj) ? 'Correr melhor' : /(saude|dispos)/.test(obj) ? 'Saúde e disposição' : null;
    const parte = ach(/parte do corpo|melhorar/); const foco = []; if (/glut|bumbum|gluteo/.test(parte)) foco.push('Glúteo'); if (/perna|coxa|quadri/.test(parte)) foco.push('Pernas'); if (/barriga|abdom|abdomen/.test(parte)) foco.push('Abdômen'); if (/costa/.test(parte)) foco.push('Costas'); if (/braco/.test(parte)) foco.push('Braços'); if (/peito/.test(parte)) foco.push('Peito'); if (/ombro/.test(parte)) foco.push('Ombro'); if (foco.length) a.foco = foco;
    const tempo = ach(/tempo para treino|tempo de treino|media de tempo/); const mins = /hora/.test(tempo) ? 60 * (+(tempo.match(/\d+([.,]\d+)?/) || [1])[0].replace(',', '.') || 1) : +(tempo.match(/\d+/) || [0])[0]; if (mins) a.tempo_treino_min = mins <= 30 ? 30 : mins <= 45 ? 40 : 60;
    const dias = ach(/dias na semana|vezes na semana|quantos dias/); const nd = +(dias.match(/[2-6]/) || [0])[0]; if (nd) a.dias_semana = nd;
    const exp = ach(/ja treina|treinou/); if (exp) { const anos = +(exp.match(/(\d+)\s*ano/) || [0, 0])[1], meses = +(exp.match(/(\d+)\s*mes/) || [0, 0])[1];
      a.experiencia = nao(exp) || /nunca/.test(exp) ? 'Nunca treinei' : anos >= 2 || /(anos|muito tempo)/.test(exp) && !/\b1 ano\b|um ano/.test(exp) ? 'Mais de 2 anos' : anos === 1 || /um ano/.test(exp) || meses >= 6 ? '6 meses a 2 anos' : meses ? 'Menos de 6 meses' : null; }
    const aer = ach(/aerobio|aerobico|cardio/); if (aer) a.cardio = nao(aer) ? 'nao' : /(pouco|as vezes|às vezes|depende|talvez)/.test(aer) ? 'as_vezes' : 'sim';
    const dieta = ach(/dieta|nutri/); if (dieta) a.nutri = /nutri/.test(dieta) && !nao(dieta) ? 'Sim' : 'Não';
    const acad = ach(/modelo de academia|academia/); if (acad) { a.local_treino = /casa/.test(acad) && !/academia|rede|bairro/.test(acad) ? 'casa' : 'academia'; a.academia_tipo = /(rede|bluefit|smart|selfit|panobianco|bodytech)/.test(acad) ? 'rede' : /bairro/.test(acad) ? 'bairro' : /(predio|condominio)/.test(acad) ? 'condominio' : null; }
    const hor = ach(/horario/); if (hor) { const h = +(hor.match(/(\d{1,2})\s*(h|:)/) || [0, -1])[1]; a.horario = /varia/.test(hor) ? 'varia' : h >= 0 && h < 9 ? 'cedo' : h >= 9 && h < 11 ? 'manha' : h >= 11 && h < 14 ? 'almoco' : h >= 14 && h < 18 ? 'tarde' : h >= 18 ? 'noite' : /noite/.test(hor) ? 'noite' : /tarde/.test(hor) ? 'tarde' : /manha/.test(hor) ? 'manha' : null; }
    const lim = []; const dor = achO(/dores|dor /); if (dor && !nao(norm(dor))) lim.push(dor);
    const cir = achO(/cirurgia/); if (cir && !nao(norm(cir))) lim.push('Cirurgia (Mfit): ' + cir);
    const med = achO(/medicamento/); if (med && !nao(norm(med))) lim.push('Medicação (Mfit): ' + med);
    const card = achO(/cardiac/); if (card && !nao(norm(card))) lim.push('Coração (Mfit): ' + card);
    if (lim.length) a.limitacoes = lim.join(' · ').slice(0, 300);
    Object.keys(a).forEach(k => a[k] == null && delete a[k]);
    return a; // saúde (com a triagem nova) fica em branco: ela mesma responde
  }
  let sql = '-- Gerado de dados do Mfit (' + new Date().toISOString().slice(0, 10) + '). Rodar depois de criar as contas.\n';
  const resumo = [];
  for (const d of Object.values(D)) {
    const email = d.email.trim().toLowerCase(); const p = perfil(d);
    const sets = Object.entries(p).map(([k, v]) => `${k} = ${Array.isArray(v) ? arr(v) : typeof v === 'number' ? v : q(v)}`);
    sql += `\n-- ${d.nome}\ndo $$ declare uid uuid; pid uuid; t uuid; begin\n  select id into uid from auth.users where lower(email) = ${q(email)};\n  if uid is null then raise notice 'sem conta: %', ${q(email)}; return; end if;\n`;
    if (sets.length) sql += `  update profiles set ${sets.join(', ')} where id = uid and anamnese_em is null;\n`;
    const r = d.rot; let nex = 0;
    if (r && r.sess.length) {
      const ini = new Date(r.ini); const mes = `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, '0')}-01`;
      const titulo = limpa(r.nome).replace(/^trein\b/i, 'Treino').replace(/out\/no$/i, 'out/nov');
      sql += `  insert into planos (aluna_id, mes, titulo, obs) values (uid, ${q(mes)}, ${q(titulo)}, ${q(r.desc)}) on conflict (aluna_id, mes) do update set titulo = excluded.titulo, obs = excluded.obs returning id into pid;\n  delete from treinos where plano_id = pid;\n`;
      r.sess.forEach((s, i) => { const ex = exercicios(s); nex += ex.length; const dur = +(String(s.obs || '').match(/cerca de (\d+) min/i) || [, 40])[1];
        sql += `  insert into treinos (plano_id, letra, nome, duracao_min, ordem) values (pid, ${q('ABCDEFGH'[i])}, ${q(limpa(s.nome))}, ${dur}, ${i}) returning id into t;\n`;
        if (ex.length) sql += `  insert into exercicios (treino_id, ordem, nome, series, reps, descanso_s, dica, biset_com) values\n` + ex.map(x => `  (t, ${x.ordem}, ${q(x.nome)}, ${x.series}, ${q(x.reps)}, ${+x.descanso_s || 0}, ${q(x.dica)}, ${x.biset_com || 'null'})`).join(',\n') + ';\n'; });
    }
    sql += `end $$;\n`;
    resumo.push({ nome: d.nome, campos: Object.keys(p), treinos: r?.sess.length || 0, exercicios: nex });
  }
  return { sql, resumo };
}
