#!/usr/bin/env python3
"""Assinatura de loja do app do iPhone na nuvem, sem Mac e sem aparelho cadastrado.

Usa a chave da API do App Store Connect pra:
1. apagar o certificado de distribuição antigo criado por este robô (a chave privada dele não existe mais);
2. criar um certificado novo (iOS Distribution) a partir de um pedido gerado aqui;
3. criar o perfil "App Store" do app br.com.igorsousa.team com esse certificado.

Revogar o certificado antigo não afeta o app que já está na loja.
Saída: arquivos em $SAIDA (dist.key, dist.cer, perfil.mobileprovision) e o nome do perfil em perfil.txt.
"""
import base64, json, os, subprocess, sys, time, urllib.request, urllib.error
import jwt

KEY_ID = os.environ['ASC_KEY_ID']
ISSUER = os.environ['ASC_ISSUER_ID']
P8 = open(os.environ['ASC_KEY_PATH']).read()
BUNDLE = os.environ.get('BUNDLE_ID', 'br.com.igorsousa.team')
SAIDA = os.environ['SAIDA']
MARCA = 'robo-nuvem'  # nome usado pra achar o que este robô criou
API = 'https://api.appstoreconnect.apple.com/v1'


def token():
    agora = int(time.time())
    return jwt.encode({'iss': ISSUER, 'iat': agora, 'exp': agora + 1100, 'aud': 'appstoreconnect-v1'},
                      P8, algorithm='ES256', headers={'kid': KEY_ID, 'typ': 'JWT'})


def chamar(metodo, caminho, corpo=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(API + caminho, data=dados, method=metodo,
                                 headers={'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        print(f'ERRO {metodo} {caminho}: {e.code} {e.read().decode()}', file=sys.stderr)
        raise


def main():
    os.makedirs(SAIDA, exist_ok=True)
    # 1) certificados antigos deste robô
    certs = chamar('GET', '/certificates?filter[certificateType]=DISTRIBUTION,IOS_DISTRIBUTION&limit=50')['data']
    for c in certs:
        nome = c['attributes'].get('displayName') or c['attributes'].get('name') or ''
        print('certificado existente:', nome, c['attributes'].get('expirationDate'))
    # perfis antigos deste robô
    perfis = chamar('GET', f'/profiles?filter[name]={MARCA}-appstore&limit=50')['data']
    for p in perfis:
        chamar('DELETE', f"/profiles/{p['id']}")
        print('perfil antigo apagado')
    # o limite da Apple é baixo: se já houver 2 ou mais, revoga os mais antigos
    certs.sort(key=lambda c: c['attributes'].get('expirationDate') or '')
    while len(certs) >= 2:
        velho = certs.pop(0)
        chamar('DELETE', f"/certificates/{velho['id']}")
        print('certificado antigo revogado:', velho['attributes'].get('expirationDate'))

    # 2) chave + pedido de certificado
    key = os.path.join(SAIDA, 'dist.key'); csr = os.path.join(SAIDA, 'dist.csr')
    subprocess.run(['openssl', 'genrsa', '-out', key, '2048'], check=True, capture_output=True)
    subprocess.run(['openssl', 'req', '-new', '-key', key, '-out', csr, '-subj', '/CN=Igor Sousa Gomes/C=BR'], check=True)
    csr_txt = open(csr).read()
    novo = chamar('POST', '/certificates', {'data': {'type': 'certificates', 'attributes': {
        'certificateType': 'DISTRIBUTION', 'csrContent': csr_txt}}})['data']
    open(os.path.join(SAIDA, 'dist.cer'), 'wb').write(base64.b64decode(novo['attributes']['certificateContent']))
    print('certificado novo criado')

    # 3) perfil App Store
    bid = chamar('GET', f'/bundleIds?filter[identifier]={BUNDLE}')['data']
    bid = [b for b in bid if b['attributes']['identifier'] == BUNDLE][0]['id']
    nome_perfil = f'{MARCA}-appstore'
    perfil = chamar('POST', '/profiles', {'data': {'type': 'profiles', 'attributes': {
        'name': nome_perfil, 'profileType': 'IOS_APP_STORE'}, 'relationships': {
        'bundleId': {'data': {'type': 'bundleIds', 'id': bid}},
        'certificates': {'data': [{'type': 'certificates', 'id': novo['id']}]}}}})['data']
    open(os.path.join(SAIDA, 'perfil.mobileprovision'), 'wb').write(base64.b64decode(perfil['attributes']['profileContent']))
    open(os.path.join(SAIDA, 'perfil.txt'), 'w').write(nome_perfil)
    print('perfil App Store criado:', nome_perfil)


if __name__ == '__main__':
    main()
