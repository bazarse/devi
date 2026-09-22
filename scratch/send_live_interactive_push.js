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
const token = 'cGCDhyYDQzKu69ogU9pxqk:APA91bEpPw-4D_Kc1A82hKaRJNp8Jg4b0xYcrt9OW1x_UpBBoMsIfB4GPvxdLb4I-svI8SBUvKskZpunu9uZr1RVkvdtXIT2WIxC-ERt3Kn6o1Bi2RbqDWQ';

const message = {
  token: token,
  notification: {
    title: '🚨 Pending Deal Approval • ₹1,24,900',
    body: '📱 Apple iPhone 15 Pro (256GB)\n🏪 Store: DM-01 (Kanthal) | Staff: Prince Verma\n👤 Customer: Dilip Kishnani (HQ Live Demo)\n👉 Tap to Approve, Reject or Edit'
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

messaging.send(message)
  .then((response) => {
    console.log('✅ LIVE INTERACTIVE DEMO SENT! Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Send Error:', error);
  });
