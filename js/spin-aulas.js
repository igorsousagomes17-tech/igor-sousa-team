// Aulas de spinning (provisório: substituído pelas 25 aulas da pesquisa)
const B = (nome, seg, esf, rpm, pe, dica) => ({ nome, seg, esf, rpm, pe: !!pe, dica });
export const AULAS = [
  { id: 'i10a', nome: 'Intervalado 10', estilo: 'intervalado', min: 10, nivel: 2, mes: 1, blocos: [B('Aquecimento', 120, 3, 80, 0, 'Giro leve.'), B('Forte', 30, 8, 100, 0, 'Acelera.'), B('Recupera', 30, 3, 75, 0, 'Solta.'), B('Subida em pé', 60, 7, 65, 1, 'Carga pesada.'), B('Recupera', 60, 3, 75, 0, 'Solta.'), B('Forte', 30, 8, 100, 0, 'Acelera.'), B('Recupera', 30, 3, 75, 0, 'Solta.'), B('Desaquecimento', 120, 2, 70, 0, 'Giro leve.')] },
];
