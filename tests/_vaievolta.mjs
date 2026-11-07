// Bi-set "vai e volta" (04/11): só um exercício do bi-set aparece por vez. Os testes antigos clicam direto na série
// do A2 (ou do A1 com o A2 na tela); isto abre a aba certa antes do clique/digitação, como a aluna faria.
export function vaiEVolta(p) {
  const abre = async sel => { const m = String(sel).match(/\.set\[data-i="(\d+)"\]/); if (!m || await p.$(sel)) return; const tab = await p.$(`[data-biv="${m[1]}"]`); if (tab) { await tab.click(); await p.waitForTimeout(350); } };
  for (const f of ['click', 'fill', 'press', 'inputValue', '$eval']) { const orig = p[f].bind(p); p[f] = async (sel, ...r) => { await abre(sel); return orig(sel, ...r); }; }
  return p;
}
