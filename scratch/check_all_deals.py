import urllib.request, json, ssl, sys
sys.stdout.reconfigure(encoding='utf-8')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://devi-rho.vercel.app/api/deals/list')
with urllib.request.urlopen(req, context=ctx) as r:
    data = json.loads(r.read().decode())
    deals = data.get('deals', [])
    print(f"Total deals in DB: {len(deals)}")
    for d in deals:
        print(f"ID: {d.get('id')} | Token: {d.get('token')} | Store: {d.get('storeId')} | Status: {d.get('status')} | Staff: {d.get('salesPersonName')} ({d.get('salesPersonPhone')}) | Product: {d.get('productName')}")
