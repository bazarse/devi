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

# Try updating invoice_id with TALLY_UPLOADED string to see exact PG error
req = urllib.request.Request(
    f"{url}/rest/v1/sales_approvals?id=eq.b6a18832-8a22-414e-a261-2cc3de76f8a1",
    data=json.dumps({"invoice_id": "TALLY_UPLOADED:test"}).encode('utf-8'),
    headers=headers,
    method='PATCH'
)

try:
    with urllib.request.urlopen(req, context=ctx) as r:
        print("Status:", r.status)
        print("Resp:", r.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode())
except Exception as ex:
    print("Error:", ex)
