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
    title: '🚨 Pending Deal Approval • ₹1,24,900',
    body: '📱 Apple iPhone 15 Pro (256GB)\n🏪 Store: DM-01 (Kanthal) | Staff: Prince Verma\n👤 Customer: Dilip Kishnani (HQ Live Demo)\n👉 Tap [Approve] or [Reject] below!'
  },
  data: {
    url: '/admin/super/approvals',
    dealId: '14a9d5b0-a96b-4b30-8479-b42bbfb523aa',
    type: 'deal_alert',
    productName: 'Apple iPhone 15 Pro (256GB)',
    finalPrice: '124900',
    customerName: 'Dilip Kishnani (HQ Live Demo)',
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

console.log('Sending live interactive deal alert to Dilip Bhai new token...');

messaging.send(message)
  .then((response) => {
    console.log('✅ SUCCESS! Live Interactive Notification Delivered. Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Send Error:', error);
  });
