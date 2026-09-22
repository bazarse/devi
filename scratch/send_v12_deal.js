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
const token = 'ee8KEc_XT-GTFK8pI5iC49:APA91bHQQbKccGsLXaUsIYJyLq9rklbb0ZG5qz0rP21S9hL6y8P-hTsEsCr2lQ1vutNXkBrIooqF4r5sESzDfycmIClHcDPSDXupeVu5gyG2qya_B8Oyx8E';

async function run() {
  const dealPayload = JSON.stringify({
    storeId: 'DM-01',
    salesPersonName: 'Prince Verma',
    salesPersonPhone: '9926598700',
    customerName: 'Dilip Bhai (VIP Action Test)',
    customerPhone: '9893264192',
    productName: 'Samsung Galaxy Z Fold6 5G (512GB)',
    category: 'Mobile Phone',
    imeiSerial: '354902041239999',
    finalPrice: 164999,
    discount: 5000,
    paymentMethod: 'EMI',
    financeProvider: 'Bajaj Finserv',
    downPaymentCash: 44999,
    disbursementAmount: 120000,
    gifts: 'Galaxy Buds Pro + Standing Case',
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
      const dealId = resJson.deal ? resJson.deal.id : 'v12-deal-id';

      // Data-only payload with high priority so Android OS executes DeviMessagingService
      // and attaches [Approve], [Reject with RemoteInput], [Edit Deal]
      const message = {
        token: token,
        data: {
          url: '/admin/super/approvals',
          dealId: dealId,
          type: 'deal_alert',
          productName: 'Samsung Galaxy Z Fold6 5G (512GB)',
          finalPrice: '1,64,999',
          customerName: 'Dilip Bhai (VIP Action Test)',
          customerPhone: '9893264192',
          storeId: 'DM-01',
          salesPersonName: 'Prince Verma',
          paymentMethod: 'EMI (Bajaj Finserv)'
        },
        android: {
          priority: 'high'
        }
      };

      try {
        const response = await messaging.send(message);
        console.log('✅ LIVE DEAL NOTIFICATION DELIVERED! Message ID:', response);
      } catch (err) {
        console.error('❌ Push error:', err);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Submission error:', e);
  });

  req.write(dealPayload);
  req.end();
}

run();
