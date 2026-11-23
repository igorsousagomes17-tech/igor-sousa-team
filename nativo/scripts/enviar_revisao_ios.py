#!/usr/bin/env python3
"""Manda uma versão nova do app do iPhone pra revisão da Apple, pela API do App Store Connect.
1. espera o build da versão (VERSAO) terminar de processar;
2. cria a versão na loja (ou reaproveita a que está sendo preparada), com o "O que há de novo" (NOTAS);
3. liga o build, mantém lançamento automático depois da aprovação e envia pra revisão.
"""
import json, os, sys, time, urllib.request, urllib.error
import jwt

KEY_ID, ISSUER = os.environ['ASC_KEY_ID'], os.environ['ASC_ISSUER_ID']
P8 = open(os.environ['ASC_KEY_PATH']).read()
BUNDLE = os.environ.get('BUNDLE_ID', 'br.com.igorsousa.team')
VERSAO, NOTAS = os.environ['VERSAO'], os.environ['NOTAS']
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
print('app', app)

# 1. build processado
build = None
for i in range(90):
    bs = chamar('GET', f'/v1/builds?filter[app]={app}&filter[preReleaseVersion.version]={VERSAO}&sort=-uploadedDate&limit=5')['data']
    if bs and bs[0]['attributes']['processingState'] == 'VALID': build = bs[0]['id']; break
    print('esperando o build processar...', bs[0]['attributes']['processingState'] if bs else 'ainda não apareceu'); time.sleep(30)
if not build: sys.exit('build não ficou pronto a tempo')
print('build', build)

# 2. versão da loja
vs = chamar('GET', f'/v1/apps/{app}/appStoreVersions?filter[platform]=IOS&limit=10')['data']
v = next((x for x in vs if x['attributes']['versionString'] == VERSAO), None)
if not v:
    v = chamar('POST', '/v1/appStoreVersions', {'data': {'type': 'appStoreVersions', 'attributes': {'platform': 'IOS', 'versionString': VERSAO, 'releaseType': 'AFTER_APPROVAL'},
        'relationships': {'app': {'data': {'type': 'apps', 'id': app}}}}})['data']
vid = v['id']; print('versão', vid, v['attributes'].get('appStoreState'))
for loc in chamar('GET', f'/v1/appStoreVersions/{vid}/appStoreVersionLocalizations')['data']:
    chamar('PATCH', f'/v1/appStoreVersionLocalizations/{loc["id"]}', {'data': {'type': 'appStoreVersionLocalizations', 'id': loc['id'], 'attributes': {'whatsNew': NOTAS}}})
    print('notas em', loc['attributes']['locale'])
chamar('PATCH', f'/v1/appStoreVersions/{vid}/relationships/build', {'data': {'type': 'builds', 'id': build}})
print('build ligado à versão')

# 3. revisão
sub = chamar('POST', '/v1/reviewSubmissions', {'data': {'type': 'reviewSubmissions', 'attributes': {'platform': 'IOS'}, 'relationships': {'app': {'data': {'type': 'apps', 'id': app}}}}})['data']
chamar('POST', '/v1/reviewSubmissionItems', {'data': {'type': 'reviewSubmissionItems', 'relationships': {'reviewSubmission': {'data': {'type': 'reviewSubmissions', 'id': sub['id']}}, 'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': vid}}}}})
r = chamar('PATCH', f'/v1/reviewSubmissions/{sub["id"]}', {'data': {'type': 'reviewSubmissions', 'id': sub['id'], 'attributes': {'submitted': True}}})
print('ENVIADO PRA REVISÃO:', r['data']['attributes'].get('state'))
