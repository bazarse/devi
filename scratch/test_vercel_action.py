import urllib.request, json, ssl, sys
sys.stdout.reconfigure(encoding='utf-8')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

payload = {
    "dealId": "14a9d5b0-a96b-4b30-8479-b42bbfb523aa",
    "action": "approved",
    "decidedBy": "Dilip Kishnani (Super Admin HQ)"
}

req = urllib.request.Request(
    "https://devi-rho.vercel.app/api/deals/action",
    data=json.dumps(payload).encode('utf-8'),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, context=ctx) as r:
        print("Status:", r.status)
        resp = json.loads(r.read().decode())
        print("Response Deal Status:", resp.get('deal', {}).get('status'))
        print("Approved By:", resp.get('deal', {}).get('approved_by_name'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode())
except Exception as ex:
    print("Error:", ex)
