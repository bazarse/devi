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
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

req = urllib.request.Request(f"{url}/rest/v1/sales_approvals?limit=1", headers=headers)
with urllib.request.urlopen(req, context=ctx) as r:
    row = json.loads(r.read().decode())[0]
    print("Available columns in sales_approvals:")
    for k in sorted(row.keys()):
        print(f"- {k}: {type(row[k]).__name__} ({repr(row[k])[:30]})")
