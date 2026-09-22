import urllib.request, json, ssl, sys, time

sys.stdout.reconfigure(encoding='utf-8')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE_URL = "https://devi-rho.vercel.app"

results = []

def log(section, test_name, success, details=""):
    status = "✅ PASS" if success else "❌ FAIL"
    results.append({
        "section": section,
        "test": test_name,
        "status": status,
        "success": success,
        "details": details
    })
    print(f"[{status}] {section} -> {test_name}: {details}")

def make_req(path, data=None, method=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=12) as r:
            res_body = r.read().decode()
            try:
                return r.status, json.loads(res_body)
            except:
                return r.status, res_body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)

print("=" * 60)
print("🚀 STARTING SECTION-BY-SECTION DEEP PLATFORM AUDIT")
print("=" * 60)

# ----------------------------------------------------
# MODULE 1: AUTH & ROUTING
# ----------------------------------------------------
sec1 = "1. Auth & Session"
code, res = make_req("/login")
log(sec1, "Login Page Load", code == 200, f"HTTP {code}")

code, res = make_req("/api/staff/update-pin", data={"phone": "0000000000", "passcode": "0000"}, method="POST")
log(sec1, "PIN Update API", code in [200, 400], f"HTTP {code} Response: {str(res)[:60]}")

# ----------------------------------------------------
# MODULE 2: POS COUNTER BILLING & PIPELINE SUBMISSION
# ----------------------------------------------------
sec2 = "2. POS Billing Engine"
code, res = make_req("/pos")
log(sec2, "POS Counter Desk Page Load", code == 200, f"HTTP {code}")

test_deal_id = None
test_token = f"SA-{int(time.time()) % 1000000}"
deal_payload = {
    "token": test_token,
    "storeId": "DM-01",
    "customerName": "Audit Test Customer",
    "customerPhone": "9876543210",
    "customerAddress": "Kanthal Chauraha, Ujjain",
    "productName": "OnePlus 12R 5G (256GB)",
    "category": "Mobile Phone",
    "imeiSerial": "864209753124680",
    "finalPrice": 39999,
    "discount": 1000,
    "paymentMethod": "EMI",
    "financeProvider": "Bajaj Finance Limited",
    "disbursementAmount": 29999,
    "downPaymentCash": 10000,
    "downPaymentUpi": 0,
    "downPaymentCard": 0,
    "hasExchange": True,
    "oldDeviceName": "Realme 8 5G",
    "oldDeviceImei": "358901234567890",
    "oldDeviceCondition": "Good",
    "exchangeValue": 6000,
    "gifts": ["Tempered Glass", "Back Cover"],
    "vasPlan": "1-Year Screen Protection (₹999)",
    "status": "pending_approval",
    "salesPersonName": "Prince Verma",
    "salesPersonPhone": "9926598700"
}

code, res = make_req("/api/deals/submit", data=deal_payload, method="POST")
if code == 200 and res.get("success"):
    test_deal_id = res.get("deal", {}).get("id")
    log(sec2, "Deal Submission to Approval Queue", True, f"Deal Created ID: {test_deal_id}, Token: {test_token}")
else:
    log(sec2, "Deal Submission to Approval Queue", False, f"HTTP {code}, Res: {res}")

# ----------------------------------------------------
# MODULE 3: 2-STEP DEAL APPROVAL PIPELINE
# ----------------------------------------------------
sec3 = "3. 2-Step Approval Pipeline"

# Test List API with all filters
code, res = make_req("/api/deals/list")
total_deals = len(res.get("deals", [])) if code == 200 else 0
log(sec3, "Fetch All Deals (/api/deals/list)", code == 200 and total_deals > 0, f"Total Deals: {total_deals}")

code, res = make_req("/api/deals/list?status=pending_approval")
pending_deals = res.get("deals", []) if code == 200 else []
pending_found = any(d.get("id") == test_deal_id for d in pending_deals)
log(sec3, "Pending Filter (/api/deals/list?status=pending_approval)", pending_found, f"Found submitted deal in pending: {pending_found}")

code, res = make_req("/api/deals/list?storeId=DM-01")
dm01_deals = res.get("deals", []) if code == 200 else []
log(sec3, "Store Filter (/api/deals/list?storeId=DM-01)", len(dm01_deals) > 0, f"DM-01 Deals Count: {len(dm01_deals)}")

# Test Edit & Approve Action
if test_deal_id:
    edit_payload = {
        "dealId": test_deal_id,
        "action": "edit",
        "decidedBy": "Dilip Kishnani (Super Admin)",
        "adjustedPrice": 38999,
        "adjustedImei": "864209753124680",
        "editNote": "₹1000 Special Festival Discount Approved by HQ"
    }
    code, res = make_req("/api/deals/action", data=edit_payload, method="POST")
    log(sec3, "Manager Edit & Approve Deal", code == 200 and res.get("success") == True, f"HTTP {code}, Deal status: {res.get('deal', {}).get('status')}")

# Test Rejection Workflow on another test deal
reject_deal_payload = {
    "token": f"SA-REJ-{int(time.time()) % 100000}",
    "storeId": "DM-01",
    "customerName": "Test Reject Customer",
    "customerPhone": "9123456780",
    "productName": "Vivo V30 5G",
    "finalPrice": 33999,
    "status": "pending_approval",
    "salesPersonName": "Prince Verma",
    "salesPersonPhone": "9926598700"
}
code, res = make_req("/api/deals/submit", data=reject_deal_payload, method="POST")
rej_deal_id = res.get("deal", {}).get("id") if code == 200 else None

if rej_deal_id:
    rej_action_payload = {
        "dealId": rej_deal_id,
        "action": "reject",
        "decidedBy": "Dilip Kishnani",
        "rejectionReason": "CIBIL Score below 650, Finance provider rejected"
    }
    code, res = make_req("/api/deals/action", data=rej_action_payload, method="POST")
    rej_ok = code == 200 and res.get("deal", {}).get("status") == "rejected" and res.get("deal", {}).get("rejection_reason") == "CIBIL Score below 650, Finance provider rejected"
    log(sec3, "Deal Rejection with Explicit Reason", rej_ok, f"Status: {res.get('deal', {}).get('status')}, Reason saved: {res.get('deal', {}).get('rejection_reason')}")

# ----------------------------------------------------
# MODULE 4: FCM PUSH NOTIFICATIONS
# ----------------------------------------------------
sec4 = "4. Push Notifications & FCM"
code, res = make_req("/api/fcm/register")
tokens = res.get("tokens", []) if code == 200 else []
log(sec4, "FCM Registered Tokens Retrieval", code == 200 and len(tokens) > 0, f"Found {len(tokens)} active FCM tokens")

# Dispatch targeted test notification to Admin
push_payload = {
    "role": "admin",
    "title": "🧪 Audit Automated Test Alert",
    "body": "Platform Deep Audit active - Action buttons verified.",
    "data": {
        "url": "/admin/super/approvals",
        "dealId": test_deal_id or "test-deal-123",
        "type": "deal_alert"
    }
}
code, res = make_req("/api/fcm/send", data=push_payload, method="POST")
log(sec4, "Targeted Admin FCM Push Dispatch", code == 200 and res.get("sent", 0) > 0, f"Sent to {res.get('sent', 0)} devices")

# ----------------------------------------------------
# MODULE 5: CUSTOMER CRM API
# ----------------------------------------------------
sec5 = "5. Customer CRM"
cust_payload = {
    "name": "Dilip Kishnani VIP",
    "phone": "9893264192",
    "address": "Kanthal Chauraha, Ujjain",
    "storeId": "DM-01",
    "purchase": {
        "billNo": "25-26/AUDIT/DEVI",
        "productName": "OnePlus 12R",
        "imei": "864209753124680",
        "amount": 38999
    }
}
code, res = make_req("/api/customers/upsert", data=cust_payload, method="POST")
log(sec5, "Customer CRM Upsert", code == 200 and res.get("success"), f"HTTP {code}, Res: {res}")

code, res = make_req("/api/customers/list")
cust_list = res.get("customers", []) if code == 200 else []
log(sec5, "Customer CRM List Fetch", code == 200 and len(cust_list) > 0, f"Total Customers in CRM: {len(cust_list)}")

# ----------------------------------------------------
# MODULE 6: LEADS FUNNEL API
# ----------------------------------------------------
sec6 = "6. Lead Management Funnel"
lead_payload = {
    "customerName": "Ramesh Patidar",
    "customerPhone": "9826098260",
    "interestedModel": "Samsung Galaxy S24 FE",
    "budget": 55000,
    "status": "Hot Lead",
    "storeId": "DM-01",
    "salesmanName": "Prince Verma",
    "notes": "Looking for 0% Bajaj finance"
}
code, res = make_req("/api/leads/create", data=lead_payload, method="POST")
new_lead_id = res.get("lead", {}).get("id") if code == 200 else None
log(sec6, "Create New Customer Lead", code == 200 and new_lead_id is not None, f"Lead ID: {new_lead_id}")

code, res = make_req("/api/leads/list")
leads = res.get("leads", []) if code == 200 else []
log(sec6, "Fetch Leads List", code == 200 and len(leads) > 0, f"Total Leads: {len(leads)}")

if new_lead_id:
    code, res = make_req("/api/leads/update", data={"id": new_lead_id, "status": "Converted"}, method="POST")
    log(sec6, "Lead Status Update to Converted", code == 200 and res.get("success"), f"HTTP {code}")

# ----------------------------------------------------
# MODULE 7: TALLY ERP SYNC
# ----------------------------------------------------
sec7 = "7. Tally ERP Sync"
if test_deal_id:
    code, res = make_req("/api/deals/tally", data={"dealId": test_deal_id}, method="POST")
    log(sec7, "Tally Upload Marker Sync", code == 200 and res.get("success"), f"HTTP {code}, Res: {res}")

# ----------------------------------------------------
# MODULE 8: FRONTEND ROUTE INTEGRITY & ERROR BOUNDARIES
# ----------------------------------------------------
sec8 = "8. Frontend Route Stability"
routes_to_test = [
    "/admin/super",
    "/admin/super/approvals",
    "/admin/super/bills",
    "/admin/super/inventory",
    "/admin/super/customers",
    "/admin/super/leads",
    "/admin/super/register",
    "/admin/super/staff",
    "/admin/super/leaderboard",
    "/admin/store",
    "/admin/store/bills",
    "/admin/store/inventory",
    "/admin/store/customers",
    "/admin/store/leads",
    "/admin/store/register",
    "/admin/store/staff",
    "/admin/store/finance",
    "/salesman/history",
    "/salesman/leads",
    "/salesman/leaderboard",
    "/salesman/profile",
    "/salesman/stock",
    "/download"
]

all_routes_ok = True
failed_routes = []
for route in routes_to_test:
    code, res = make_req(route)
    if code != 200:
        all_routes_ok = False
        failed_routes.append(f"{route} (HTTP {code})")

log(sec8, "23/23 Application Routes 200 OK Check", all_routes_ok, "All 23 routes loaded with 200 OK" if all_routes_ok else f"Failed routes: {failed_routes}")

# ----------------------------------------------------
# CLEANUP OF AUDIT TEST DEALS
# ----------------------------------------------------
if test_deal_id:
    make_req("/api/deals/delete", data={"dealId": test_deal_id}, method="POST")
if rej_deal_id:
    make_req("/api/deals/delete", data={"dealId": rej_deal_id}, method="POST")
if new_lead_id:
    make_req("/api/leads/delete", data={"id": new_lead_id}, method="POST")

print("=" * 60)
passed = sum(1 for r in results if r["success"])
total = len(results)
print(f"📊 AUDIT COMPLETE: {passed}/{total} Tests Passed ({round(passed/total*100, 1)}%)")
print("=" * 60)
