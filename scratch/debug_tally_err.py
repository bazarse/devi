import urllib.request, json, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(
    "https://devi-rho.vercel.app/api/deals/tally",
    data=json.dumps({"dealId": "50c537a1-6466-4960-830d-c9f9befcfbbe", "isUploaded": True, "userName": "Admin"}).encode('utf-8'),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, context=ctx) as r:
        print("Status:", r.status)
        print("Resp:", r.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Body:", e.read().decode())
