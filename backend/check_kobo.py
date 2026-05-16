"""
Check and deploy the Illegal Shop Detection form on KoboToolbox.
"""
import urllib.request
import urllib.parse
import json

TOKEN = 'dcc5b43ab772ce3e9347ee29f329538941011430'
ASSET_UID = 'acNYuKP7ZdAigVucAD5eHF'
BASE = 'https://kf.kobotoolbox.org/api/v2'
HEADERS = {'Authorization': f'Token {TOKEN}', 'Accept': 'application/json'}


def kobo_get(path):
    req = urllib.request.Request(f'{BASE}/{path}', headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)


def kobo_post(path, data, method='POST'):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(
        f'{BASE}/{path}',
        data=body,
        headers={**HEADERS, 'Content-Type': 'application/json'},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)


# ── 1. Check existing asset ──────────────────────────────────────────────────
print("=" * 60)
print("Checking existing asset:", ASSET_UID)
status, data = kobo_get(f'assets/{ASSET_UID}/')
print(f"HTTP {status}")

if status == 200:
    print("Name           :", data.get('name'))
    print("Deploy status  :", data.get('deployment_status'))
    print("Submissions    :", data.get('deployment__submission_count'))
    survey = data.get('content', {}).get('survey', [])
    print(f"Survey fields  : {len(survey)} questions")
    for q in survey:
        qtype = q.get('type', '')
        qname = q.get('name', q.get('$autoname', ''))
        qlabel = q.get('label', '')
        if isinstance(qlabel, list):
            qlabel = qlabel[0] if qlabel else ''
        print(f"  [{qtype}] {qname} — {qlabel}")
elif status == 404:
    print("FORM NOT FOUND - will create new form")
else:
    print("Response:", str(data)[:400])

# ── 2. List all forms ────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("All forms in account:")
status2, data2 = kobo_get('assets/?asset_type=survey&format=json')
if status2 == 200:
    forms = data2.get('results', [])
    print(f"Found {len(forms)} form(s):")
    for f in forms:
        print(f"  UID={f.get('uid')}  name={f.get('name')}  deployed={f.get('deployment_status')}  submissions={f.get('deployment__submission_count',0)}")
else:
    print(f"HTTP {status2}:", str(data2)[:300])
