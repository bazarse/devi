import urllib.request, json, ssl, sys, time
sys.stdout.reconfigure(encoding='utf-8')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE_URL = "https://devi-rho.vercel.app"

print("==========================================================")
print("🚀 DEVI MOBILE POS - COMPLETE SYSTEM DEEP VERIFICATION")
print("==========================================================\n")

passed = 0
failed = 0

def log_test(name, is_pass, detail=""):
    global passed, failed
    if is_pass:
        passed += 1
        print(f"✅ PASS: {name}")
        if detail:
            print(f"   ↳ {detail}")
    else:
        failed += 1
        print(f"❌ FAIL: {name}")
        if detail:
            print(f"   ↳ {detail}")

# --- TEST 1: Database & API Health (Deals List) ---
try:
    req = urllib.request.Request(f"{BASE_URL}/api/deals/list")
    with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
        data = json.loads(r.read().decode())
        if data.get('success') and isinstance(data.get('deals'), list):
            total_deals = len(data['deals'])
            log_test("Fetch Deals API (/api/deals/list)", True, f"Successfully fetched {total_deals} total deals")
        else:
            log_test("Fetch Deals API (/api/deals/list)", False, f"Unexpected response: {data}")
except Exception as e:
    log_test("Fetch Deals API (/api/deals/list)", False, str(e))

# --- TEST 2: Filter Queries (Pending, Approved, Rejected) ---
for status in ['pending_approval', 'approved', 'rejected']:
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/deals/list?status={status}")
        with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
            data = json.loads(r.read().decode())
            deals = data.get('deals', [])
            log_test(f"Filter deals by status='{status}'", True, f"Found {len(deals)} deals in '{status}'")
    except Exception as e:
        log_test(f"Filter deals by status='{status}'", False, str(e))

# --- TEST 3: Deal Submission Pipeline (/api/deals/submit) ---
test_deal_id = None
test_token = None
try:
    submit_payload = {
        "storeId": "DM-01",
        "salesPersonName": "Prince Verma (Audit Bot)",
        "salesPersonPhone": "9926598700",
        "customerName": "Audit Verification Customer",
        "customerPhone": "9893264192",
        "productName": "Google Pixel 9 Pro (256GB)",
        "category": "Mobile Phone",
        "imeiSerial": "358742099999111",
        "finalPrice": 109999,
        "discount": 4000,
        "paymentMethod": "EMI",
        "financeProvider": "Bajaj Finserv",
        "downPaymentCash": 29999,
        "disbursementAmount": 80000,
        "gifts": "Pixel Buds Pro",
        "vasPlan": "Devi Complete Care",
        "status": "pending_approval"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/deals/submit",
        data=json.dumps(submit_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
        res = json.loads(r.read().decode())
        if res.get('success') and res.get('deal', {}).get('id'):
            test_deal_id = res['deal']['id']
            test_token = res['deal']['token']
            log_test("Deal Creation & Submit (/api/deals/submit)", True, f"Deal created: ID={test_deal_id}, Token={test_token}")
        else:
            log_test("Deal Creation & Submit (/api/deals/submit)", False, f"Response: {res}")
except Exception as e:
    log_test("Deal Creation & Submit (/api/deals/submit)", False, str(e))

# --- TEST 4: Deal Action - Edit & Return (/api/deals/action?action=edit) ---
if test_deal_id:
    try:
        edit_payload = {
            "dealId": test_deal_id,
            "action": "edit",
            "decidedBy": "Dilip Kishnani (Super Admin HQ)",
            "edits": {
                "finalPrice": 104999,
                "discount": 9000,
                "adminNote": "Special manager discount approved for audit test"
            }
        }
        req = urllib.request.Request(
            f"{BASE_URL}/api/deals/action",
            data=json.dumps(edit_payload).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            res = json.loads(r.read().decode())
            deal = res.get('deal', {})
            is_ok = res.get('success') and deal.get('status') == 'approved' and float(deal.get('final_price', 0)) == 104999
            log_test("Deal Edit & Approve Action (/api/deals/action)", is_ok, f"Status={deal.get('status')}, Price=₹{deal.get('final_price')}")
    except Exception as e:
        log_test("Deal Edit & Approve Action (/api/deals/action)", False, str(e))

# --- TEST 5: Deal Action - Rejection with Reason ---
reject_deal_id = None
try:
    # First submit a deal to reject
    rej_submit = {
        "storeId": "DM-02",
        "salesPersonName": "Aakash (Audit Bot)",
        "salesPersonPhone": "9893264192",
        "customerName": "Test Customer for Reject",
        "customerPhone": "9893264192",
        "productName": "Xiaomi 14 Ultra",
        "finalPrice": 99999,
        "paymentMethod": "Cash",
        "status": "pending_approval"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/deals/submit",
        data=json.dumps(rej_submit).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
        res = json.loads(r.read().decode())
        reject_deal_id = res['deal']['id']

    # Now reject it
    rej_payload = {
        "dealId": reject_deal_id,
        "action": "reject",
        "decidedBy": "Dilip Kishnani (Super Admin HQ)",
        "rejectionReason": "Audit Test: Out of stock at DM-02, ask customer to visit DM-01 flagship."
    }
    req2 = urllib.request.Request(
        f"{BASE_URL}/api/deals/action",
        data=json.dumps(rej_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req2, context=ctx, timeout=15) as r:
        res2 = json.loads(r.read().decode())
        deal = res2.get('deal', {})
        is_ok = res2.get('success') and deal.get('status') == 'rejected' and "Out of stock" in deal.get('rejection_reason', '')
        log_test("Deal Reject with Reason (/api/deals/action)", is_ok, f"Status={deal.get('status')}, Reason='{deal.get('rejection_reason')}'")
except Exception as e:
    log_test("Deal Reject with Reason (/api/deals/action)", False, str(e))

# --- TEST 6: Tally ERP Synchronization Marker ---
if test_deal_id:
    try:
        tally_payload = {
            "dealId": test_deal_id,
            "isUploaded": True,
            "userName": "Dilip Kishnani (Super Admin HQ)"
        }
        req = urllib.request.Request(
            f"{BASE_URL}/api/deals/tally",
            data=json.dumps(tally_payload).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            res = json.loads(r.read().decode())
            deal = res.get('deal', {})
            tally_val = str(deal.get('barcode') or deal.get('invoice_id'))
            is_ok = res.get('success') and "TALLY_UPLOADED" in tally_val
            log_test("Tally ERP Sync Marker (/api/deals/tally)", is_ok, f"Tally Marker stored in DB: {tally_val}")
    except Exception as e:
        log_test("Tally ERP Sync Marker (/api/deals/tally)", False, str(e))

# --- TEST 7: FCM Token Storage Integrity ---
try:
    req = urllib.request.Request(f"{BASE_URL}/api/fcm/register?phone=9893264192")
    with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
        data = json.loads(r.read().decode())
        tokens = data.get('tokens', [])
        found_dilip = any(t.get('phone') == '9893264192' for t in tokens)
        log_test("FCM Token Storage & Retrieval (/api/fcm/register)", found_dilip, f"Found active super_admin token for 9893264192 (Total active devices: {len(tokens)})")
except Exception as e:
    log_test("FCM Token Storage & Retrieval (/api/fcm/register)", False, str(e))

# --- TEST 8: Public APK Download Integrity ---
try:
    req = urllib.request.Request(f"{BASE_URL}/devi-pos.apk", method="HEAD")
    with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
        content_length = r.headers.get('Content-Length')
        mb = round(int(content_length) / (1024 * 1024), 2) if content_length else 0
        is_ok = r.status == 200 and mb > 4
        log_test("Public APK Download Endpoint (/devi-pos.apk)", is_ok, f"HTTP {r.status} OK - File Size: {mb} MB")
except Exception as e:
    log_test("Public APK Download Endpoint (/devi-pos.apk)", False, str(e))

print("\n==========================================================")
print(f"📊 VERIFICATION SUMMARY: {passed} PASSED | {failed} FAILED")
print("==========================================================")
