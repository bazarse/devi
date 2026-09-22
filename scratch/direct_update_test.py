import urllib.request, json, ssl, sys
sys.stdout.reconfigure(encoding='utf-8')
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

payload = {
    'status': 'approved',
    'approved_by_name': 'Dilip Kishnani (Super Admin HQ)'
}

req = urllib.request.Request(
    f"{url}/rest/v1/sales_approvals?id=eq.0169fe64-fad6-4d34-a01b-55800ff676cc",
    data=json.dumps(payload).encode('utf-8'),
    headers=headers,
    method='PATCH'
)

with urllib.request.urlopen(req, context=ctx) as r:
    print('Supabase Direct Update Status:', r.status)
    print('Updated row:', r.read().decode())
