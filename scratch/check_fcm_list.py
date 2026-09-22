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

# List all objects in pos_assets/fcm_tokens
req = urllib.request.Request(f"{url}/storage/v1/object/list/pos_assets", data=json.dumps({"prefix": "fcm_tokens"}).encode(), headers={**headers, 'Content-Type': 'application/json'})
with urllib.request.urlopen(req, context=ctx) as r:
    tokens = json.loads(r.read().decode())
    print("Registered FCM Tokens in Storage:")
    for t in tokens:
        fname = t.get('name')
        # Download token details
        dl = urllib.request.Request(f"{url}/storage/v1/object/public/pos_assets/fcm_tokens/{fname}")
        try:
            with urllib.request.urlopen(dl, context=ctx) as dlr:
                content = json.loads(dlr.read().decode())
                print(f"Phone: {fname.replace('.json', '')} | Role: {content.get('role')} | Updated: {content.get('updatedAt')}")
        except Exception as e:
            print(f"Phone: {fname} (error reading: {e})")
