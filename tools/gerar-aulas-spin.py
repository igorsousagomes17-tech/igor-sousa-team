#!/usr/bin/env python3
"""Gera js/spin-aulas.js: 25 aulas de spinning (10/15/20/25/30 min × 5 estilos) e confere as regras de segurança.
Base: docs/metodologia/spinning.md (5 aulas mais vistas no YouTube out/25–out/26 + artigos).
Rodar:  python3 tools/gerar-aulas-spin.py   (falha se alguma aula quebrar uma regra)
"""
import json, os

DUR = [10, 15, 20, 25, 30]
# dicas fixas (poucas frases = tradução consistente)
D = {
 'aq1': 'Giro leve, ombro solto. Dá pra conversar tranquila.',
 'aq2': 'Dá uma beliscada na carga. Pedalada redonda, abdômen firme.',
 'aq3': 'Mais um pouco de carga. Ainda dá pra falar frases inteiras.',
 'rec': 'Senta, tira carga e solta as pernas. Não para de pedalar.',
 'agua': 'Recupera e bebe água. Respira fundo.',
 'forte': 'Sobe a carga e acelera. Frases curtas, só.',
 'forte_pe': 'Em pé, quadril pra trás, carga média. Pedalada firme, sem quicar.',
 'subida': 'Carga pesada, pedalada lenta e forte. Tronco firme.',
 'subida_pe': 'Sai do selim, quadril pra trás, mãos firmes. Empurra cada pedal.',
 'topo': 'Último trecho da subida. Segura firme que tá acabando!',
 'ritmo': 'Carga média, giro constante. Respira pelo nariz.',
 'ritmo_pe': 'Fica em pé, carga média, no ritmo. Nada de quicar.',
 'sprint': 'Carga média e acelera o máximo que controlar. Sentada!',
 'corrida_pe': 'Em pé, pedalada rápida e firme. Quadril estável.',
 'desaq': 'Giro bem leve. Deixa o coração desacelerar.',
 'along': 'Para de pedalar. Alonga panturrilha e quadríceps segurando na bike.',
 'final': 'Bloco final! Dá tudo que controlar, com técnica.',
}
def B(nome, seg, esf, rpm, pe, dica): assert dica in D; return dict(nome=nome, seg=seg, esf=esf, rpm=rpm, pe=1 if pe else 0, dica=dica)

def aquecimento(n):
    if n <= 15: return [B('Aquecimento', 120, 3, 85, 0, 'aq1'), B('Sobe a carga', 60, 4, 90, 0, 'aq2')]
    return [B('Aquecimento', 120, 3, 85, 0, 'aq1'), B('Sobe a carga', 120, 4, 90, 0, 'aq2'), B('Ritmo de base', 60, 4, 85, 0, 'aq3')]
def desaquecimento(n):
    if n <= 15: return [B('Desaquecimento', 120, 2, 75, 0, 'desaq')]
    return [B('Desaquecimento', 120, 2, 75, 0, 'desaq'), B('Alongamento', 60, 1, 0, 0, 'along')]

# Estilos: cada um devolve a lista de blocos que preenche exatamente `seg` segundos
def intervalado(seg, n):  # 1:1, metade dos tiros em pé, último mais forte
    out, k = [], 0
    while seg - sum(b['seg'] for b in out) >= 60:
        resto = seg - sum(b['seg'] for b in out)
        if k and k % 6 == 0 and resto >= 150: out.append(B('Respira', 90, 3, 80, 0, 'agua'))
        pe = k % 2 == 1
        out += [B('Forte em pé' if pe else 'Forte', 30, 7, 80 if pe else 100, pe, 'forte_pe' if pe else 'forte'), B('Recupera', 30, 3, 80, 0, 'rec')]
        k += 1
    return out
def subida(seg, n):  # blocos de montanha: sentada pesada → em pé → recupera
    out, k = [], 0
    while seg - sum(b['seg'] for b in out) >= 180:
        out += [B('Subida sentada', 60, 6, 70, 0, 'subida'), B('Subida em pé', 30 if k < 2 else 45, 7, 65, 1, 'subida_pe'), B('Recupera' if k % 3 != 2 else 'Respira', 90 if k < 2 else 75, 3, 85, 0, 'rec' if k % 3 != 2 else 'agua')]
        k += 1
    return out
def piramide(seg, n):  # 20-30-40-50-40-30-20 de tiro, recuperação igual ao tiro
    degraus = [20, 30, 40, 50, 40, 30, 20]
    out, k = [], 0
    while True:
        d = degraus[k % len(degraus)]; pe = d in (30, 40)
        if seg - sum(b['seg'] for b in out) < 2 * d + 10: break
        if k and k % 7 == 0: out.append(B('Respira', 60, 3, 80, 0, 'agua'))
        if seg - sum(b['seg'] for b in out) < 2 * d + 10: break
        out += [B('Degrau em pé' if pe else 'Degrau', d, 7 if d < 50 else 8, 80 if pe else 100, pe, 'forte_pe' if pe else 'forte'), B('Recupera', d, 3, 80, 0, 'rec')]
        k += 1
    return out
def ritmo(seg, n):  # iniciante: blocos de 2 min por "música", em pé curto, esforço máx 6
    out, k = [], 0
    while seg - sum(b['seg'] for b in out) >= 120:
        out += [B('Ritmo', 70, 5, 90, 0, 'ritmo'), B('Ritmo em pé', 20, 5, 75, 1, 'ritmo_pe'), B('Recupera' if k % 3 != 2 else 'Respira', 30, 3, 80, 0, 'rec' if k % 3 != 2 else 'agua')]
        k += 1
    return out
def sprint(seg, n):  # 1:2, sprint sentada 15–20 s, corrida em pé no meio
    out, k = [], 0
    while seg - sum(b['seg'] for b in out) >= 60:
        resto = seg - sum(b['seg'] for b in out)
        if k and k % 5 == 0 and resto >= 150: out += [B('Corrida em pé', 30, 7, 85, 1, 'corrida_pe'), B('Respira', 60, 3, 80, 0, 'agua')]; k += 1; continue
        s = 15 if k < 3 else 20
        out += [B('Sprint', s, 8, 105, 0, 'sprint'), B('Recupera', 60 - s, 3, 80, 0, 'rec')]
        k += 1
    return out

ESTILOS = [
 ('ritmo', ritmo, 'Pedal no ritmo', 1),
 ('intervalado', intervalado, 'Liga e desliga', 2),
 ('subida', subida, 'Serra acima', 2),
 ('piramide', piramide, 'Pirâmide', 2),
 ('sprint', sprint, 'Tiro final', 3),
]
# Teto de tempo com esforço ≥7 por duração (min) — regra 9 da pesquisa
TETO = {10: 3, 15: 4.5, 20: 7.5, 25: 9.5, 30: 11.5}

def montar(estilo, fn, nome, nivel, n, idx):
    aq, dq = aquecimento(n), desaquecimento(n)
    meio = n * 60 - sum(b['seg'] for b in aq + dq)
    corpo = fn(meio, n)
    falta = meio - sum(b['seg'] for b in corpo)
    if falta > 0:  # completa com bloco final mais forte (o fim é o trecho mais pesado)
        if falta >= 30: corpo.append(B('Bloco final', falta, 6 if nivel == 1 else 7, 90, 0, 'final'))
        else: corpo[-1] = {**corpo[-1], 'seg': corpo[-1]['seg'] + falta}
    blocos = aq + corpo + dq
    # Respeita o teto de esforço alto: rebaixa os primeiros tiros pra 6 se passar
    alto = lambda: sum(b['seg'] for b in blocos if b['esf'] >= 7) / 60
    for b in blocos:
        if alto() <= TETO[n]: break
        if b['esf'] >= 7: b['esf'] = 6
    return dict(id=f'{estilo[:3]}{n}', nome=nome, estilo=estilo, min=n, nivel=nivel, mes=idx, blocos=blocos)

def checar(a):
    tot = sum(b['seg'] for b in a['blocos']); n = a['min']; erros = []
    if tot != n * 60: erros.append(f'duração {tot}s ≠ {n*60}s')
    pe = sum(b['seg'] for b in a['blocos'] if b['pe'])
    if pe > 0.30 * tot: erros.append(f'em pé {pe/tot:.0%} > 30%')
    if sum(b['seg'] for b in a['blocos'] if b['esf'] >= 7) / 60 > TETO[n]: erros.append('esforço alto acima do teto')
    for b in a['blocos']:
        if b['rpm'] and not (60 <= b['rpm'] <= 110): erros.append(f"{b['nome']}: cadência {b['rpm']}")
        if b['pe'] and not (b['esf'] >= 5 and 60 <= b['rpm'] <= 85): erros.append(f"{b['nome']}: em pé precisa carga ≥5 e 60–85 rpm")
        if b['pe'] and b['seg'] > 45: erros.append(f"{b['nome']}: em pé {b['seg']}s > 45s")
        if b['esf'] >= 10: erros.append('esforço 10')
        if 'Sprint' in b['nome'] and b['seg'] > 30: erros.append('sprint > 30s')
        if a['nivel'] == 1 and b['esf'] > 7: erros.append('iniciante com esforço > 7')
    if a['blocos'][0]['esf'] > 3 or sum(b['seg'] for b in a['blocos'][:3] if b['esf'] <= 4) < (180 if n <= 15 else 300): erros.append('aquecimento curto')
    return erros

aulas, idx = [], 0
for si, (est, fn, nome, nivel) in enumerate(ESTILOS):
    for di, n in enumerate(DUR):
        aulas.append(montar(est, fn, nome, nivel, n, di * 5 + si))  # aula do mês alterna estilo e duração
ruins = {a['id']: checar(a) for a in aulas if checar(a)}
for a in aulas:
    alto = sum(b['seg'] for b in a['blocos'] if b['esf'] >= 7) / 60; pe = sum(b['seg'] for b in a['blocos'] if b['pe']) / (a['min'] * 60)
    print(f"{a['id']:6} {a['nome']+' '+str(a['min']):22} {len(a['blocos']):3} blocos · alto {alto:4.1f} min · em pé {pe:4.0%} · nível {a['nivel']}")
if ruins:
    print('REGRAS QUEBRADAS:', json.dumps(ruins, ensure_ascii=False, indent=1)); raise SystemExit(1)
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
js = '// GERADO por tools/gerar-aulas-spin.py — não editar à mão (mude o gerador e rode de novo).\n// 25 aulas: 10/15/20/25/30 min × ritmo, intervalado, subida, pirâmide, sprint. Regras em docs/metodologia/spinning.md.\nexport const DICAS = ' + json.dumps(D, ensure_ascii=False) + ';\nexport const AULAS = ' + json.dumps(aulas, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(raiz, 'js', 'spin-aulas.js'), 'w').write(js)
print('ok:', len(aulas), 'aulas,', len(js) // 1024, 'KB')
