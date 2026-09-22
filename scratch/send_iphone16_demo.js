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
const newToken = 'e8pX_je1RpCR0J6z5kaA_q:APA91bEq32YUlbovtzoJ3J2z0ZbdetnikHMSGYgbY2U9PcF6v1JP4X91ZZ6TQy0ngq8fDz0-tqQypCgoQdDnjwFgoYGdDZtz9iWa-FxtLGwqG-a_xtlslwQ';

const message = {
  token: newToken,
  notification: {
    title: '🚨 Pending Deal Approval • ₹1,44,900',
    body: '📱 Apple iPhone 16 Pro Max (256GB)\n🏪 Store: DM-01 (Kanthal) | Staff: Prince Verma\n👤 Customer: Dilip Bhai (VIP HQ)\n👉 Tap to Approve, Reject or Edit'
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

messaging.send(message)
  .then((response) => {
    console.log('✅ DEMO NOTIFICATION DELIVERED! Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Send Error:', error);
  });
