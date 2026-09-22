const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../lib/firebase-service-account.json'));

let app;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  app = getApps()[0];
}

const messaging = getMessaging(app);
const token = 'fxHQOl-jRSmnaFGYMo2AJc:APA91bEsZppKCOp5GMgxfLyg4osgprfVWh1v6OGf-TfTy3A5y9bdTxp5qbO-0Oh0byUHcCbXYNC5AsMt46fWD5eMdp2xwT_IDL2WqK3tP7KfOnwztcCo8-g';

const message = {
  token: token,
  notification: {
    title: '🚨 Pending Deal Approval • ₹1,44,900',
    body: '📱 Apple iPhone 16 Pro Max (256GB)\n🏪 Store: DM-01 (Kanthal) | Staff: Prince Verma\n👤 Customer: Dilip Bhai (VIP HQ)\n👉 Tap to review and approve!'
  },
  data: {
    url: '/admin/super/approvals',
    dealId: '752acf4e-070a-409c-9247-4e1b8b5043c2',
    type: 'deal_alert',
    productName: 'Apple iPhone 16 Pro Max (256GB)',
    finalPrice: '144900',
    customerName: 'Dilip Bhai (VIP HQ)',
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
      defaultSound: true,
      defaultVibrateTimings: true
    }
  }
};

console.log('Sending guaranteed notification with title & body...');

messaging.send(message)
  .then((response) => {
    console.log('✅ INSTANT NOTIFICATION SENT! Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Send Error:', error);
  });
