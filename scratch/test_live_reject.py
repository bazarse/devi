import urllib.request, json, ssl, sys
sys.stdout.reconfigure(encoding='utf-8')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Create a test deal first
deal_payload = {
    "storeId": "DM-01",
    "salesPersonName": "Prince Verma",
    "salesPersonPhone": "9926598700",
    "customerName": "Test Customer",
    "customerPhone": "9893264192",
    "productName": "Realme 12 Pro",
    "finalPrice": 25999,
    "paymentMethod": "Cash",
    "status": "pending_approval"
}

req1 = urllib.request.Request(
    "https://devi-rho.vercel.app/api/deals/submit",
    data=json.dumps(deal_payload).encode('utf-8'),
    headers={"Content-Type": "application/json"},
    method="POST"
)

with urllib.request.urlopen(req1, context=ctx) as r1:
    res1 = json.loads(r1.read().decode())
    deal_id = res1['deal']['id']
    print("Created deal for reject test:", deal_id)

# Now reject with action: 'rejected'
reject_payload = {
    "dealId": deal_id,
    "action": "rejected",
    "decidedBy": "Dilip Kishnani (Super Admin HQ)",
    "rejectionReason": "Bajaj Finance login rejected due to low CIBIL"
}

req2 = urllib.request.Request(
    "https://devi-rho.vercel.app/api/deals/action",
    data=json.dumps(reject_payload).encode('utf-8'),
    headers={"Content-Type": "application/json"},
    method="POST"
)

with urllib.request.urlopen(req2, context=ctx) as r2:
    res2 = json.loads(r2.read().decode())
    print("Reject Test Status:", res2.get('deal', {}).get('status'))
    print("Reject Reason:", res2.get('deal', {}).get('rejection_reason'))
