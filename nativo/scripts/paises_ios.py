#!/usr/bin/env python3
"""Mostra (MODO=ver) ou libera em todos os países (MODO=todos) o app do iPhone na App Store."""
import json, os, sys, time, urllib.request, urllib.error
import jwt

KEY_ID, ISSUER = os.environ['ASC_KEY_ID'], os.environ['ASC_ISSUER_ID']
P8 = open(os.environ['ASC_KEY_PATH']).read()
BUNDLE = os.environ.get('BUNDLE_ID', 'br.com.igorsousa.team')
MODO = os.environ.get('MODO','ver')
API = 'https://api.appstoreconnect.apple.com'

def token():
    agora = int(time.time())
    return jwt.encode({'iss': ISSUER, 'iat': agora, 'exp': agora + 1100, 'aud': 'appstoreconnect-v1'}, P8, algorithm='ES256', headers={'kid': KEY_ID, 'typ': 'JWT'})

def chamar(metodo, caminho, corpo=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(API + caminho, data=dados, method=metodo, headers={'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode(); return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        print(f'ERRO {metodo} {caminho}: {e.code} {e.read().decode()}', file=sys.stderr); raise


app = chamar('GET', f'/v1/apps?filter[bundleId]={BUNDLE}')['data'][0]['id']
try:
    av = chamar('GET', f'/v1/apps/{app}/appAvailabilityV2')['data']['id']
except urllib.error.HTTPError:
    av = None
if not av:
    print('o app ainda não tem disponibilidade definida')
lista = []
if av:
    cam = f'/v2/appAvailabilities/{av}/territoryAvailabilities?include=territory&limit=200'
    while cam:
        r = chamar('GET', cam)
        lista += r['data']
        nxt = r.get('links', {}).get('next')
        cam = nxt.replace(API, '') if nxt else None
on = [t['relationships']['territory']['data']['id'] for t in lista if t['attributes'].get('available')]
off = [t for t in lista if not t['attributes'].get('available')]
print(f'disponível em {len(on)} países:', ' '.join(sorted(on)))
print(f'fora em {len(off)} países', 'GBR fora' if any(t['relationships']['territory']['data']['id']=='GBR' for t in off) else '')
if MODO == 'todos':
    for t in off:
        chamar('PATCH', f"/v1/territoryAvailabilities/{t['id']}", {'data': {'type': 'territoryAvailabilities', 'id': t['id'], 'attributes': {'available': True}}})
    print(f'liberado em mais {len(off)} países')
