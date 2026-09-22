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

req = urllib.request.Request(f"{url}/rest/v1/profiles?select=phone,name,role,store_id", headers=headers)
with urllib.request.urlopen(req, context=ctx) as r:
    profiles = json.loads(r.read().decode())
    print("Staff Profiles in DB:")
    for p in profiles:
        print(p)
