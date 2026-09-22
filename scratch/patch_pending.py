import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

env = {}
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

url = env['NEXT_PUBLIC_SUPABASE_URL']
key = env['SUPABASE_SERVICE_ROLE_KEY']
headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json', 'Prefer': 'return=representation'}

deal_id = 'ed642868-4ee0-439b-85dd-ed200a295384'
patch_data = json.dumps({'status': 'pending_approval', 'approved_by_name': None, 'approved_at': None}).encode()
req = urllib.request.Request(f'{url}/rest/v1/sales_approvals?id=eq.{deal_id}', data=patch_data, headers=headers, method='PATCH')
with urllib.request.urlopen(req, context=ctx) as r:
    print('Updated deal to pending_approval:', r.read().decode())
