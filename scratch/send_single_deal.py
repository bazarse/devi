import urllib.request, json, ssl, sys
sys.stdout.reconfigure(encoding='utf-8')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

deal_payload = {
    "storeId": "DM-01",
    "salesPersonName": "Prince Verma",
    "salesPersonPhone": "9926598700",
    "customerName": "Dilip Bhai (Single Push Test)",
    "customerPhone": "9893264192",
    "productName": "Vivo X100 Pro 5G (512GB)",
    "category": "Mobile Phone",
    "imeiSerial": "864209041299999",
    "finalPrice": 89999,
    "discount": 3000,
    "paymentMethod": "Cash",
    "cashAmount": 89999,
    "status": "pending_approval"
}

req = urllib.request.Request(
    "https://devi-rho.vercel.app/api/deals/submit",
    data=json.dumps(deal_payload).encode('utf-8'),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, context=ctx) as r:
        print("Status:", r.status)
        resp = json.loads(r.read().decode())
        print("Deal Created (Single Push Sent by Server):")
        print("Deal ID:", resp.get('deal', {}).get('id'))
        print("Token:", resp.get('deal', {}).get('token'))
except Exception as ex:
    print("Error:", ex)
