const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../lib/firebase-service-account.json'));
const https = require('https');

let app;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  app = getApps()[0];
}

const messaging = getMessaging(app);
const token = 'f23GkRp6QOOkSKkDilJDEi:APA91bFnSXWtUg5LzR3_CYgBBSqowXs-3w_aybRGa8jwIBCqyqnmNZHvBJLg6wOTccFQo_KQv2uAtZeLHGzB2PxqIAz-eRytaXUWoRy52WLOhCfigEP4d4c';

async function run() {
  const dealPayload = JSON.stringify({
    storeId: 'DM-01',
    salesPersonName: 'Prince Verma',
    salesPersonPhone: '9926598700',
    customerName: 'Dilip Bhai (HQ Flagship)',
    customerPhone: '9893264192',
    productName: 'Apple iPhone 15 Pro Max (256GB)',
    category: 'Mobile Phone',
    imeiSerial: '359902041238888',
    finalPrice: 139900,
    discount: 5000,
    paymentMethod: 'EMI',
    financeProvider: 'Bajaj Finserv',
    downPaymentCash: 39900,
    disbursementAmount: 100000,
    gifts: '20W Apple Adapter + Privacy Glass',
    vasPlan: 'Devi Complete Care (1 Year)',
    status: 'pending_approval'
  });

  const req = https.request('https://devi-rho.vercel.app/api/deals/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dealPayload)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      console.log('Deal Submit Response:', data);
      const resJson = JSON.parse(data);
      const dealId = resJson.deal ? resJson.deal.id : 'v11-demo';

      const message = {
        token: token,
        notification: {
          title: '🚨 Pending Deal Approval • ₹1,39,900',
          body: '📱 Apple iPhone 15 Pro Max (256GB)\n🏪 Store: DM-01 (Kanthal) | Staff: Prince Verma\n👤 Customer: Dilip Bhai (HQ Flagship)\n👉 Tap to review and approve!'
        },
        data: {
          url: '/admin/super/approvals',
          dealId: dealId,
          type: 'deal_alert',
          productName: 'Apple iPhone 15 Pro Max (256GB)',
          finalPrice: '139900',
          customerName: 'Dilip Bhai (HQ Flagship)',
          customerPhone: '9893264192',
          storeId: 'DM-01',
          salesPersonName: 'Prince Verma',
          paymentMethod: 'EMI (Bajaj Finserv)'
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
            channelId: 'devi_deals',
            icon: 'ic_stat_devi',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        }
      };

      try {
        const response = await messaging.send(message);
        console.log('✅ LIVE PUSH DELIVERED TO V1.1 APK! Message ID:', response);
      } catch (err) {
        console.error('❌ Push error:', err);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Deal submission error:', e);
  });

  req.write(dealPayload);
  req.end();
}

run();
