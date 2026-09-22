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
headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}

# Fetch audit deals
req = urllib.request.Request(f"{url}/rest/v1/sales_approvals?select=id,customer_name,product_name", headers=headers)
with urllib.request.urlopen(req, context=ctx) as r:
    deals = json.loads(r.read().decode())

deleted_count = 0
for d in deals:
    c_name = d.get('customer_name') or ''
    p_name = d.get('product_name') or ''
    if 'Audit' in c_name or 'Test Customer' in c_name:
        del_req = urllib.request.Request(f"{url}/rest/v1/sales_approvals?id=eq.{d['id']}", headers=headers, method='DELETE')
        with urllib.request.urlopen(del_req, context=ctx) as del_r:
            deleted_count += 1
            print(f"Deleted audit test deal: {d['id']} - {p_name}")

print(f"\nTotal audit test deals cleaned up: {deleted_count}")
